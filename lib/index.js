import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'

export const name = 'dsh-toolgate'
export const inject = ['tools', 'skills', 'webServer']
export const Config = z.object({ allowSessionOverride: z.boolean().default(true) })

import { groupOf, isDisabled, labelOf, matchesDisabled, normalizeDisabled } from './groups.js'
import { requestArgs } from './api-payload.js'
import { appendAudit } from './audit.js'
import { createMcpConfig, publicServers } from './mcp-config.js'
import { hostPaths } from './host-paths.js'
import { installSkills } from './skills-runtime.js'

// Conservative, serialized-schema based estimate. It is deliberately labelled
// approximate in the UI; the real number comes from the provider tokenizer.
const CHARS_PER_TOKEN = 3.4

export async function apply(ctx, config = {}) {
  // Prompt-injected traffic reaches the model tool; `false` lets a profile pin
  // the global gate so only the authenticated settings page can change it.
  const allowSessionOverride = config.allowSessionOverride !== false
  const locations = hostPaths(ctx)
  let mcp, mcpError
  try {
    const profile = serviceOn(ctx, 'profileContext')
    const options = { ...locations }
    if (profile) {
      const [{ readBundlePatches }, { applyEntryPatches }] = await Promise.all([
        import('@deepseek-ai/dsh-app-boot'), import('@deepseek-ai/cordis-plugin-include'),
      ])
      options.basePatches = () => readBundlePatches('dsh', profile)
      options.overlays = profile.overlays
      options.compose = applyEntryPatches
    }
    mcp = createMcpConfig(options)
  } catch (error) { mcpError = '无法读取宿主 profile：' + error.message }
  const state = {
    disabled: [],
    disabledSkills: [],
    skillRules: [],
    disposed: false,
    timers: new Set(),
    overrides: new Map(),
    applied: new Map(),
    errors: new Map(),
    applying: false,
    revision: 0,
    // Counts/tokens for the full agent-visible tool set. The root tools view
    // only contains global registrations; preset-scoped core tools are only
    // visible through an agent, so the first real request records the full set.
    bestSchemas: null,
  }
  const stateFile = path.join(locations.home, 'toolgate.json')
  const rootCtx = ctx

  function loadState() {
    const legacyFile = stateFile.replace(/toolgate\.json$/, 'context-budget.json')
    for (const file of [stateFile, legacyFile]) {
      try {
        const parsed = JSON.parse(fs.readFileSync(file, 'utf8'))
        state.disabled = normalizeDisabled(parsed?.disabled)
        state.disabledSkills = Array.isArray(parsed?.disabledSkills)
          ? parsed.disabledSkills.filter(name => typeof name === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))
          : []
        state.skillRules = Array.isArray(parsed?.skillRules) ? parsed.skillRules.filter(rule => rule && typeof rule.key === 'string' && typeof rule.identity === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rule.name) && (rule.cwd === null || typeof rule.cwd === 'string')) : []
        if (file !== stateFile) saveState()
        return
      } catch { /* try the legacy file, then reset */ }
    }
    state.disabled = []
    state.disabledSkills = []
  }

  function saveState() {
    const tmp = stateFile + '.' + randomUUID() + '.tmp'
    try {
      fs.mkdirSync(path.dirname(stateFile), { recursive: true })
      fs.writeFileSync(tmp, JSON.stringify({
        disabled: state.disabled,
        disabledSkills: state.disabledSkills,
        skillRules: state.skillRules,
      }, null, 2), { encoding: 'utf8', flag: 'wx', mode: 0o600 })
      fs.renameSync(tmp, stateFile)
    } catch (err) {
      throw new Error('无法保存 Toolgate 设置：' + (err?.message || err))
    } finally {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp)
    }
  }

  function tokensOf(value) {
    try {
      return Math.max(1, Math.ceil(JSON.stringify(value).length / CHARS_PER_TOKEN))
    } catch {
      return 0
    }
  }

  function fmt(n) {
    const v = Number(n) || 0
    if (v >= 10000) return (v / 10000).toFixed(1) + '万'
    return String(Math.round(v))
  }

  async function skillCatalog(ctx, agent) {
    try {
      const skills = ctx.get?.('skills') ?? ctx.skills
      if (!skills || typeof skills.list !== 'function') return []
      const list = await Promise.resolve(skills.list({ ...(agent ? { cwd: serviceOn(ctx, 'workingDirectory')?.get?.(agent.session), scope: agent } : locations.workspace ? { cwd: locations.workspace } : {}) }))
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  }

  async function groupReport(ctx, agent) {
    const schemas = state.bestSchemas || ctx.tools.schemas()
    const globalNames = new Set(ctx.tools.schemas().map(schema => schema.name))
    const groups = new Map()
    const ensure = (id, toggle = true) => {
      if (!groups.has(id)) groups.set(id, { id, label: labelOf(id), count: 0, tokens: 0, hideableTokens: 0, toggle })
      return groups.get(id)
    }
    for (const schema of schemas) {
      const group = groupOf(schema.name)
      const entry = ensure(group, group !== 'core')
      entry.count += 1
      entry.tokens += tokensOf(schema)
      if (globalNames.has(schema.name)) entry.hideableTokens += tokensOf(schema)
    }
    const catalog = await skillCatalog(ctx, agent)
    let catalogTokens = 0
    if (catalog.length > 0) {
      const entry = ensure('skills')
      entry.skillCount = catalog.length
      const catalogBytes = catalog.reduce((sum, item) => {
        return sum + String(item?.name || '').length + String(item?.description || '').length
      }, 0)
      catalogTokens = Math.ceil(catalogBytes / CHARS_PER_TOKEN)
      // `skill` schema itself is already counted above; add catalog text.
      entry.tokens += catalogTokens
      if (globalNames.has('skill')) entry.hideableTokens += catalogTokens
    }
    const list = [...groups.values()].sort((a, b) => {
      if (a.id === 'core') return 1
      if (b.id === 'core') return -1
      if (a.id.startsWith('mcp:') !== b.id.startsWith('mcp:')) return a.id.startsWith('mcp:') ? -1 : 1
      return b.tokens - a.tokens
    })
    const full = list.reduce((sum, item) => sum + item.tokens, 0)
    const saved = list.filter(item => isDisabled(item.id, state.disabled))
      .reduce((sum, item) => sum + item.hideableTokens, 0)
    const scoped = schemas.filter(schema => !globalNames.has(schema.name)
      && schema.name.startsWith('mcp__')).length
    return {
      groups: list,
      totals: { full, current: Math.max(0, full - saved), saved },
      disabled: [...state.disabled],
      catalogTokens,
      scoped,
      skills: { count: catalog.length },
    }
  }

  function sessionIdOf(agent) {
    return String(agent?.session?.id || agent?.sessionId || agent?.id || 'anonymous')
  }

  function serviceOn(agentCtx, service) {
    try {
      if (agentCtx && typeof agentCtx.get === 'function') return agentCtx.get(service)
      return agentCtx?.[service]
    } catch {
      return undefined
    }
  }

  function effectiveDisabled(agent) {
    const sid = sessionIdOf(agent)
    return state.overrides.has(sid) ? state.overrides.get(sid) : state.disabled
  }

  function applyToAgent(agent) {
    const ag = agent?.agent ?? agent
    if (state.disposed || !ag || !ag.ctx) return
    const sid = sessionIdOf(ag)
    if (!state.bestSchemas) {
      try {
        const visible = rootCtx.tools.schemas(ag)
        if (Array.isArray(visible) && visible.length > 0) state.bestSchemas = visible
      } catch { /* tool view not ready yet */ }
    } else {
      try {
        const visible = rootCtx.tools.schemas(ag)
        if (Array.isArray(visible) && visible.length > state.bestSchemas.length) state.bestSchemas = visible
      } catch { /* tool view not ready yet */ }
    }
    const disabled = effectiveDisabled(ag)
    const key = disabled.slice().sort().join(',')
    const previous = state.applied.get(ag)
    if (previous && previous.key === key && previous.revision === state.revision) return
    if (previous) {
      state.applying = true
      try { previous.dispose() } catch { /* stale agent scope */ } finally { state.applying = false }
      state.applied.delete(ag)
    }
    if (disabled.length === 0) {
      state.errors.delete(sid)
      return
    }
    const agentTools = serviceOn(ag.ctx, 'tools')
    if (!agentTools || typeof agentTools.restrict !== 'function') {
      state.errors.set(sid, 'agent ctx has no restrictable tools service')
      return
    }
    const full = rootCtx.tools.schemas()
    const deny = full.map(schema => schema.name).filter(n => matchesDisabled(n, disabled))
    if (deny.length === 0) return
    state.applying = true
    try {
      const dispose = agentTools.restrict({ deny })
      state.applied.set(ag, { key, revision: state.revision, dispose })
      state.errors.delete(sid)
    } catch (err) {
      state.errors.set(sid, String(err?.message || err))
    } finally {
      state.applying = false
    }
  }

  function clearApplied() {
    state.applying = true
    try {
      for (const entry of state.applied.values()) {
        try { entry.dispose() } catch { /* agent may already be gone */ }
      }
      state.applied.clear()
      state.errors.clear()
    } finally {
      state.applying = false
    }
  }

  async function reportFor(agent) {
    const full = await groupReport(rootCtx, agent)
    let current = full.totals.full
    let currentCount = rootCtx.tools.schemas().length
    if (agent?.ctx) {
      try {
        const visible = rootCtx.tools.schemas(agent).filter(schema => !matchesDisabled(schema.name, effectiveDisabled(agent)))
        currentCount = visible.length
        current = 0
        for (const schema of visible) current += tokensOf(schema)
        // Preserve the full skill-catalog estimate when `skill` is still visible.
        if (visible.some(schema => schema.name === 'skill')) current += full.catalogTokens
      } catch { /* fall back to global estimate */ }
    }
    const overridden = state.overrides.has(sessionIdOf(agent))
    const disabled = effectiveDisabled(agent)
    const lines = []
    lines.push('Toolgate' + (overridden ? '（本会话覆盖）' : ''))
    lines.push('完整: ' + fmt(full.totals.full) + ' tokens / ' + fullCount(full) + ' 个工具')
    lines.push('当前: ' + fmt(current) + ' tokens / ' + currentCount + ' 个工具')
    lines.push('节省: ' + fmt(Math.max(0, full.totals.full - current)) + ' tokens')
    lines.push('隐藏: ' + (disabled.length ? disabled.join(', ') : '无'))
    lines.push('')
    for (const g of full.groups) {
      lines.push('- ' + g.id + ' (' + g.label + '): ' + g.count + ' 个，约 ' + fmt(g.tokens) + ' tokens' + (isDisabled(g.id, disabled) ? ' [已隐藏]' : ''))
    }
    lines.push('')
    lines.push(allowSessionOverride
      ? '用 action=session + disabled=[...] 只改本会话；action=reset 恢复默认。'
      : '会话级覆盖已被宿主设置禁用，请在 设置 → 工具闸门 修改全局闸门。')
    return lines.join('\n')
  }

  function fullCount(report) {
    return report.groups.reduce((sum, g) => sum + g.count, 0)
  }

  function readBody(req, limit = 64 * 1024) {
    return new Promise((resolve, reject) => {
      const chunks = []
      let size = 0, exceeded = false
      req.on('data', chunk => {
        if (exceeded) return
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        size += buffer.length
        if (size > limit) { exceeded = true; chunks.length = 0; reject(Object.assign(new Error('body too large'), { status: 413 })); return }
        chunks.push(buffer)
      })
      req.on('end', () => { if (!exceeded) resolve(Buffer.concat(chunks).toString('utf8')) })
      req.on('error', reject)
      req.on('aborted', () => reject(new Error('request aborted')))
    })
  }

  loadState()
  ctx.effect(() => () => {
    state.disposed = true
    for (const timer of state.timers) clearTimeout(timer)
    state.timers.clear()
    clearApplied()
    state.overrides.clear()
    state.bestSchemas = null
  })
  const skillManager = installSkills(ctx, state, locations, saveState)
  const audit = entry => {
    if (!appendAudit(locations.home, entry)) ctx.logger?.warn?.('Toolgate audit log write failed for %s', entry.op)
  }
  const auditTarget = (op, args) => op === 'mcp-add' || op === 'mcp-edit'
    ? String(args.row?.id || args.row?.serverName || '')
    : String(args.id || args.name || '')

  const tool = defineTool({
    name: 'toolgate',
    description: [
      'Inspect or shrink this session context by hiding tool groups (MCP/Skill/memory/schedule).',
      'This changes the very next request, is reversible, and does not restart MCP processes.',
      'Use action=status first. Use action=session with disabled groups for a session-only override,',
      'or action=reset to fall back to the global setting. Global settings live in Settings > Toolgate.',
      ...(allowSessionOverride ? [] : ['Session overrides are disabled by the host; only action=status is available.']),
    ].join(' '),
    parameters: {
      action: {
        type: 'string',
        required: true,
        description: 'status | session | reset',
      },
      disabled: {
        type: 'array',
        items: { type: 'string' },
        description: 'Groups to hide: mcp:<server>, mcp (all MCP), skills, memory, schedule. Empty means show all.',
      },
    },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: String(value) }],
    },
    async execute(args, exec) {
      const agent = exec.agent
      if (!agent) return 'No active agent context; toolgate only works inside a session.'
      const action = String(args.action || 'status').trim().toLowerCase()
      const sid = sessionIdOf(agent)
      if (action === 'status') return reportFor(agent)
      if (!allowSessionOverride && (action === 'session' || action === 'reset')) {
        return '会话级覆盖已被宿主设置禁用（allowSessionOverride=false）；全局工具闸门只能在 设置 → 工具闸门 中修改。\n\n' + await reportFor(agent)
      }
      if (action === 'reset') {
        state.overrides.delete(sid)
        applyToAgent(agent)
        return '已恢复全局工具闸门。\n\n' + await reportFor(agent)
      }
      if (action === 'session') {
        const disabled = normalizeDisabled(args.disabled)
        state.overrides.set(sid, disabled)
        applyToAgent(agent)
        return '已应用本会话覆盖：' + (disabled.length ? disabled.join(', ') : '全部显示') +
          '\n\n' + await reportFor(agent)
      }
      return 'Unknown action "' + action + '". Use status, session or reset.'
    },
  })
  ctx.tools.register(tool)

  // Every request passes here before prompt assembly. Applying the restriction
  // in this hook means the schemas disappear without touching any config or
  // restarting the MCP client process.
  ctx.on('agent/pre-step', (agent, next) => {
    try { applyToAgent(agent) } catch (err) {
      console.warn('[dsh-toolgate] apply failed:', err?.message || err)
    }
    return typeof next === 'function' ? next() : undefined
  })

  // Workflow/subagent creation can begin its first step before a pre-step
  // listener attached at the root has run. Apply once at creation too, then
  // re-check on the next tick when the child's tool scope is fully installed.
  ctx.on('agent/created', (agent) => {
    try { applyToAgent(agent) } catch { /* tools not installed yet */ }
    const timer = setTimeout(() => {
      state.timers.delete(timer)
      try { applyToAgent(agent) } catch (err) {
        console.warn('[dsh-toolgate] child apply failed:', err?.message || err)
      }
    }, 0)
    state.timers.add(timer)
    if (typeof timer?.unref === 'function') timer.unref()
  })

  // Last-resort catch for workflow children whose first step is already in
  // flight when creation handlers run. `applyToAgent` is idempotent per key.
  ctx.on('agent/status', (agent) => {
    try { applyToAgent(agent) } catch { /* not a scoped agent event */ }
  })

  // Scoped MCP registrations bypass tools.restrict(); filter the final request too.
  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const result = await next()
    const disabled = effectiveDisabled(context.scope)
    if (disabled.length === 0) return result
    return { ...result, tools: result.tools.filter(tool => !matchesDisabled(tool.name, disabled)) }
  })

  // Refresh each session lazily without disposing restrictions in other sessions.
  ctx.on('tools/change', () => {
    if (state.applying) return
    state.revision += 1
    state.bestSchemas = null
  })

  ctx.on('agent/disposed', ({ agent }) => {
    const applied = state.applied.get(agent)
    if (applied) { state.applying = true; try { applied.dispose() } finally { state.applying = false } }
    state.applied.delete(agent)
    state.errors.delete(sessionIdOf(agent))
    state.overrides.delete(sessionIdOf(agent))
  })

  const webServer = ctx.webServer ?? (() => { try { return ctx.get('webServer') } catch { return undefined } })()
  if (webServer) {
    ctx.effect(() => webServer.register({
      kind: 'exact',
      path: '/dsh-toolgate/api',
      handler: async (req, res) => {
        const send = (code, value) => {
          res.writeHead(code, { 'content-type': 'application/json', 'cache-control': 'no-store' })
          res.end(JSON.stringify(value))
        }
        const header = (name) => {
          const value = req.headers?.[name]
          return Array.isArray(value) ? value[0] ?? '' : value ?? ''
        }
        // `op` lives outside the try so the failure audit below can name it.
        let op = ''
        try {
          const connection = serviceOn(ctx, 'connection')
          if (typeof connection?.requestRejection !== 'function') return send(503, { ok: false, error: 'host authentication unavailable' })
          const rejection = connection.requestRejection(req)
          if (rejection !== undefined) return send(rejection, { ok: false, error: 'request rejected by host authentication' })
          if (String(req.method || '').toUpperCase() !== 'POST') return send(405, { ok: false, error: 'method not allowed' })
          if (header('x-dsh-plugin') !== 'dsh-toolgate') return send(403, { ok: false, error: 'missing plugin gate header' })
          if (!/^application\/json(?:\s*;|$)/i.test(header('content-type'))) return send(415, { ok: false, error: 'expected application/json' })
          let payload
          try { payload = JSON.parse(await readBody(req)) } catch (error) { return send(error.status || 400, { ok: false, error: error.status === 413 ? 'request body too large' : 'invalid JSON body' }) }
          if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return send(400, { ok: false, error: 'expected JSON object' })
          op = String(payload.op || '')
          const args = requestArgs(payload)
          if (op === 'status') return send(200, { ok: true, ...(await groupReport(ctx)),
            applied: [...state.applied.keys()].map(sessionIdOf), errors: Object.fromEntries(state.errors) })
          if (op === 'set') {
            const previous = state.disabled
            state.disabled = normalizeDisabled(args.disabled)
            try { saveState() } catch (error) { state.disabled = previous; throw error }
            audit({ op, disabled: [...state.disabled] })
            clearApplied()
            return send(200, { ok: true, ...(await groupReport(ctx)) })
          }
          if (op.startsWith('mcp-')) {
            if (!mcp) return send(503, { ok: false, error: mcpError || 'current profile unavailable' })
            const operations = {
              'mcp-list': () => mcp.listServers(),
              'mcp-add': () => mcp.addServer(args.row),
              'mcp-edit': () => mcp.editServer(args.row),
              'mcp-remove': () => mcp.removeServer(args.id),
              'mcp-enabled': () => mcp.setServerEnabled(args.id, args.enabled !== false),
            }
            if (!operations[op]) return send(400, { ok: false, error: 'unknown operation' })
            try {
              const result = operations[op]()
              if (op !== 'mcp-list') audit({ op, id: auditTarget(op, args) })
              return send(200, { ok: true, ...publicServers(result) })
            } catch (error) {
              audit({ op, id: auditTarget(op, args), error: String(error?.message || error) })
              return send(400, { ok: false, error: error.message })
            }
          }
          const skillsOps = { 'skills-list': 'list', 'skill-toggle': 'toggle', 'skill-create': 'create', 'skill-delete': 'delete' }
          if (skillsOps[op]) {
            try {
              const result = await skillManager[skillsOps[op]](args)
              if (op !== 'skills-list') audit({ op, name: String(args.name || ''), ...(op === 'skill-toggle' ? { enabled: args.enabled !== false } : {}) })
              return send(200, { ok: true, ...result })
            } catch (error) {
              audit({ op, name: String(args.name || ''), error: String(error?.message || error) })
              return send(400, { ok: false, error: error.message })
            }
          }
          return send(400, { ok: false, error: 'unknown operation: ' + op })
        } catch (err) {
          audit({ op: String(op || ''), error: String(err?.message || err) })
          send(500, { ok: false, error: String(err?.message || err) })
        }
      },
    }), 'dsh-toolgate: api route')
  }
}

