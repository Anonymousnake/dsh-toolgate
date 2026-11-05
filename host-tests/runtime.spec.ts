import fs from 'node:fs'
import { join } from 'node:path'
import { request } from 'node:http'
import { expect, it, onTestFinished } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import { mountAgentLoopTestDependencies } from '@deepseek-ai/dsh-agent-loop-testkit'
import AgentLoop from '@deepseek-ai/dsh-agent-loop'
import { SessionId } from '@deepseek-ai/dsh-session'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import SkillRegistry from '@deepseek-ai/dsh-skill'
import * as SkillFilesystem from '@deepseek-ai/dsh-skill-filesystem'
import WebServer from '@deepseek-ai/dsh-host-webserver'
import * as Connection from '@deepseek-ai/dsh-client-connection'
import { applyEntryPatches } from '@deepseek-ai/cordis-plugin-include'
import { RecordCredentials } from 'host-source/packages/client/connection/tests/browser-credentials.ts'
import { MockAdapter, textResponse } from 'host-source/packages/core/agent-loop/tests/mock-adapter.ts'
import * as plugin from '../lib/index.js'
import { composePatches } from '../lib/mcp-config.js'
import { buildSync } from 'esbuild'
import { chromium } from '@playwright/test'
import { parse } from 'yaml'

let sequence = 0
function skill(root: string, name: string, body = 'synthetic') {
  const dir = join(root, name)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: synthetic test skill\n---\n${body}\n`)
  return join(dir, 'SKILL.md')
}

async function harness(options: { connection?: boolean; pluginConfig?: Record<string, unknown>; prepare?: (home: string, a: string, b: string) => void } = {}) {
  if (!process.env.DSH_HOME?.includes('test-home-')) throw new Error('isolated home required')
  const home = fs.mkdtempSync(join(process.env.DSH_HOME, 'case-'))
  const a = join(home, 'workspace-a'), b = join(home, 'workspace-b'), profile = join(home, 'profiles', 'selected')
  for (const dir of [a, b, profile]) fs.mkdirSync(dir, { recursive: true })
  fs.mkdirSync(join(a, '.git')); fs.mkdirSync(join(b, '.git'))
  fs.writeFileSync(join(profile, 'package.json'), JSON.stringify({ private: true, dsh: { profile: { bundles: [] } } }))
  fs.writeFileSync(join(profile, 'cordis.patch.yml'), '[]\n')
  fs.writeFileSync(join(home, 'cordis.patch.yml'), '[]\n')
  options.prepare?.(home, a, b)
  const ctx = new Context()
  onTestFinished(async () => { await ctx.fiber.dispose() })
  await mountAgentLoopTestDependencies(ctx, { workingDirectory: true, tools: { mode: 'native' } })
  await ctx.plugin(AgentLoop, { agents: [] })
  ctx.llm.registerAdapter(['mock'], new MockAdapter(Array.from({ length: 8 }, () => textResponse('synthetic'))))
  await ctx.plugin(SkillRegistry)
  await ctx.plugin(SkillFilesystem, { dshHome: home, agentsHome: join(home, 'shared-agents'), watch: false })
  await ctx.plugin(WebServer, { host: '127.0.0.1', port: 0 })
  if (options.connection !== false) {
    ctx.provide('credentials', new RecordCredentials())
    await ctx.plugin(Connection)
  }
  ctx.provide('profileContext', { name: 'selected', dir: profile, patchPath: join(profile, 'cordis.patch.yml'), home, cwd: a,
    installAnchor: join(profile, 'package.json'), overlays: [], startedBundles: [] })
  ctx.provide('dshHomePath', (...parts: string[]) => join(home, ...parts))
  ctx.tools.register(defineTool({ name: 'mcp__test__ping', description: 'synthetic MCP', parameters: {},
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] }, execute: () => 'pong' }))
  let fiber = await ctx.plugin(plugin, options.pluginConfig)
  const origin = ctx.webServer.getOrigin()
  let cookie = ''
  if (options.connection !== false) {
    ctx.effect(() => ctx.webServer.register({ kind: 'exact', path: '/', handler(req, res) {
      if (ctx.connection.authorizeIndex(req, res)) { res.writeHead(200); res.end('synthetic') }
    } }))
    const login = await fetch(ctx.connection.authenticatedUrl(origin), { redirect: 'manual' })
    expect(login.status).toBe(303)
    cookie = login.headers.get('set-cookie')!.split(';')[0]!
  }
  const post = async (op: string, args: object = {}, headers: Record<string, string> = {}, body?: string) => {
    return new Promise<{ status: number; value: any }>((resolve, reject) => {
      const req = request(origin + '/dsh-toolgate/api', { method: 'POST', headers: {
        'content-type': 'application/json', 'x-dsh-plugin': 'dsh-toolgate', ...(cookie ? { cookie } : {}), ...headers,
      } }, res => {
        const chunks: Buffer[] = []
        res.on('data', chunk => chunks.push(chunk))
        res.on('end', () => { try { resolve({ status: res.statusCode!, value: JSON.parse(Buffer.concat(chunks).toString('utf8')) }) } catch (error) { reject(error) } })
        res.on('error', reject)
      })
      req.on('error', reject)
      req.end(body ?? JSON.stringify({ op, args }))
    })
  }
  const create = (id: string, cwd = a) => ctx.agentLoop.create(SessionId(id), { provider: 'mock', model: 'mock' }, { cwd })
  // 0.2.2 moved tools.execute to raw call batches (tools.executable marks the
  // generation); older hosts take one typed call and resolve to its outcome.
  const execute = async (agent: any, args: object) => {
    if (typeof ctx.tools.executable === 'function') {
      const batch = await ctx.tools.execute({
        agent,
        signal: new AbortController().signal,
        calls: [{ id: ToolCallId('audit-' + sequence++), name: 'toolgate', arguments: JSON.stringify(args) }],
      })
      return batch.results[0]!.result
    }
    return ctx.tools.execute({ agent, callId: ToolCallId('audit-' + sequence++), name: 'toolgate', arguments: args, signal: new AbortController().signal })
  }
  return { ctx, origin, home, a, b, profile, post, create, execute, get fiber() { return fiber }, reload: async () => { fiber = await ctx.plugin(plugin) } }
}

it('real host authentication rejects absent/forged cookies and cross-origin/Host requests before configuration writes', async () => {
  const h = await harness()
  expect((await h.post('mcp-add', { serverName: 'blocked', command: 'node' }, { cookie: '' })).status).toBe(401)
  expect((await h.post('mcp-list', {}, { cookie: 'forged=1' })).status).toBe(401)
  expect((await h.post('mcp-list', {}, { origin: 'https://untrusted.example' })).status).toBe(403)
  expect((await h.post('mcp-list', {}, { host: 'untrusted.example' })).status).toBe(403)
  expect(fs.readFileSync(join(h.profile, 'cordis.patch.yml'), 'utf8')).toBe('[]\n')
  const added = await h.post('mcp-add', { row: { serverName: 'allowed', command: 'node', env: { TOKEN: 'synthetic-secret' } } })
  expect(added.status).toBe(200)
  expect(added.value.ok).toBe(true)
  expect(JSON.stringify(added.value)).not.toContain('synthetic-secret')
  expect(added.value.rows[0].envKeys).toEqual(['TOKEN'])
})

it('missing host authentication fails closed and malformed or oversized JSON cannot mutate settings', async () => {
  const missing = await harness({ connection: false })
  expect((await missing.post('set', { disabled: ['mcp'] })).status).toBe(503)
  const h = await harness()
  expect((await h.post('set', {}, {}, '{broken')).status).toBe(400)
  expect((await h.post('set', {}, {}, JSON.stringify({ text: '中'.repeat(23000) }))).status).toBe(413)
  expect((await h.post('set', {}, { 'content-type': 'text/plain' })).status).toBe(415)
  expect((await h.post('status')).value.disabled).toEqual([])
})

it('failed Skill persistence leaves the running provider unchanged and cleans its temporary file', async () => {
  const h = await harness({ prepare(home) { skill(join(home, 'skills'), 'save-test') } })
  const row = (await h.post('skills-list')).value.skills.find((item: any) => item.name === 'save-test')
  const statePath = join(h.home, 'toolgate.json')
  fs.mkdirSync(statePath)
  const result = await h.post('skill-toggle', { ...row, enabled: false })
  expect(result.status).toBe(400)
  expect((await h.post('skills-list')).value.skills.find((item: any) => item.name === 'save-test').disabled).toBe(false)
  expect((await h.ctx.skills.get('save-test', { cwd: h.a }))!.invocation.modelInvocable).toBe(true)
  expect(fs.readdirSync(h.home).filter(name => name.endsWith('.tmp'))).toEqual([])
  fs.rmdirSync(statePath)
  expect((await h.post('skill-toggle', { ...row, enabled: false })).value.ok).toBe(true)
})

it('restrictions lift on plugin unload and new instances do not retain session overrides', async () => {
  const h = await harness(), agent = await h.create('lead')
  expect(await h.execute(agent, { action: 'session', disabled: ['mcp'] })).toMatchObject({ isError: false })
  expect(h.ctx.tools.get('mcp__test__ping', agent)).toBeUndefined()
  await h.fiber.dispose()
  expect(h.ctx.tools.get('mcp__test__ping', agent)).toBeDefined()
  await h.reload()
  expect(await h.execute(agent, { action: 'status' })).toMatchObject({ isError: false })
  expect(h.ctx.tools.get('mcp__test__ping', agent)).toBeDefined()
})

it('allowSessionOverride=false keeps the model tool read-only: session and reset change nothing', async () => {
  const h = await harness({ pluginConfig: { allowSessionOverride: false } }), agent = await h.create('pinned')
  const blocked = await h.execute(agent, { action: 'session', disabled: ['mcp'] })
  expect(blocked).toMatchObject({ isError: false })
  expect(String((blocked as any).value)).toContain('allowSessionOverride=false')
  expect(h.ctx.tools.get('mcp__test__ping', agent)).toBeDefined()
  const reset = await h.execute(agent, { action: 'reset' })
  expect(String((reset as any).value)).toContain('allowSessionOverride=false')
  expect(await h.execute(agent, { action: 'status' })).toMatchObject({ isError: false })
})

it('management writes append audit lines without secret values', async () => {
  const h = await harness()
  await h.post('mcp-add', { row: { serverName: 'audited', command: 'node', env: { TOKEN: 'synthetic-secret' } } })
  await h.post('mcp-remove', { id: 'audited' })
  const auditPath = join(h.home, 'toolgate-audit.jsonl')
  const entries = fs.readFileSync(auditPath, 'utf8').trim().split('\n').map(JSON.parse)
  expect(entries.find((row: any) => row.op === 'mcp-add')?.id).toBe('audited')
  expect(entries.find((row: any) => row.op === 'mcp-remove')?.id).toBe('audited')
  expect(JSON.stringify(entries)).not.toContain('synthetic-secret')
})

it('global budget applies to newly created Agents and disposed Agent state cannot hide tools on replacement', async () => {
  const h = await harness()
  await h.post('set', { disabled: ['mcp'] })
  const handle = await h.ctx.agents.create({ sessionId: SessionId('same-session'), agentOptions: { provider: 'mock', model: 'mock' }, meta: { cwd: h.a } })
  const first = handle.agent
  expect(h.ctx.tools.get('mcp__test__ping', first)).toBeUndefined()
  await h.execute(first, { action: 'session', disabled: [] })
  expect(h.ctx.tools.get('mcp__test__ping', first)).toBeDefined()
  await handle.dispose()
  const replacement = await h.create('same-session')
  expect(h.ctx.tools.get('mcp__test__ping', replacement)).toBeUndefined()
  await h.fiber.dispose()
  expect(h.ctx.tools.get('mcp__test__ping', replacement)).toBeDefined()
})

it('two live plugin instances cannot clear each other\'s Agent restrictions', async () => {
  const first = await harness(), second = await harness()
  const a = await first.create('same'), b = await second.create('same')
  await first.execute(a, { action: 'session', disabled: ['mcp'] })
  await second.post('set', { disabled: [] })
  expect(first.ctx.tools.get('mcp__test__ping', a)).toBeUndefined()
  expect(second.ctx.tools.get('mcp__test__ping', b)).toBeDefined()
  await second.execute(b, { action: 'session', disabled: ['mcp'] })
  await first.fiber.dispose()
  expect(first.ctx.tools.get('mcp__test__ping', a)).toBeDefined()
  expect(second.ctx.tools.get('mcp__test__ping', b)).toBeUndefined()
})

it('Skill list, creation, identity-checked deletion and toggles use the selected Session workspace', async () => {
  const h = await harness({ prepare(home, a, b) {
    skill(join(a, '.dsh', 'skills'), 'project-demo', 'workspace A')
    skill(join(b, '.dsh', 'skills'), 'project-demo', 'workspace B')
    skill(join(home, 'shared-agents', 'skills'), 'shared-demo')
  } })
  const a = await h.create('a', h.a), b = await h.create('b', h.b)
  let listed = (await h.post('skills-list', { sessionId: 'a' })).value
  expect(listed.workspace).toBe(h.a)
  const row = listed.skills.find((item: any) => item.name === 'project-demo')
  expect(row.path).toBe(join(h.a, '.dsh', 'skills', 'project-demo', 'SKILL.md'))
  expect(row.deletable).toBe(true)
  const shared = listed.skills.find((item: any) => item.name === 'shared-demo')
  expect(shared.deletable).toBe(false)
  expect((await h.post('skill-delete', { ...shared, sessionId: 'a' })).status).toBe(400)
  const disabled = await h.post('skill-toggle', { ...row, sessionId: 'a', enabled: false })
  expect(disabled.value.ok).toBe(true)
  expect((await h.ctx.skills.get('project-demo', { cwd: h.a, scope: a }))!.invocation.modelInvocable).toBe(false)
  expect((await h.ctx.skills.get('project-demo', { cwd: h.b, scope: b }))!.invocation.modelInvocable).toBe(true)
  expect((await h.post('skill-toggle', { ...row, sessionId: 'a', enabled: true })).value.ok).toBe(true)
  expect((await h.post('skill-create', { sessionId: 'b', name: 'new-skill', scope: 'project', description: 'test', body: 'synthetic' })).value.ok).toBe(true)
  expect(fs.existsSync(join(h.b, '.dsh', 'skills', 'new-skill', 'SKILL.md'))).toBe(true)
  expect(fs.existsSync(join(h.a, '.dsh', 'skills', 'new-skill'))).toBe(false)
  expect((await h.post('skill-delete', { ...row, sessionId: 'b' })).status).toBe(400)
  expect((await h.post('skill-delete', { ...row, sessionId: 'a' })).value.ok).toBe(true)
  expect(fs.existsSync(row.path)).toBe(false)
  expect(fs.existsSync(join(h.b, '.dsh', 'skills', 'project-demo', 'SKILL.md'))).toBe(true)
  listed = (await h.post('skills-list', { sessionId: 'a' })).value
  expect(listed.skills.some((item: any) => item.name === 'project-demo')).toBe(false)
  expect((await h.post('skill-create', { name: 'user-skill', description: 'test', body: '', scope: 'user' })).value.ok).toBe(true)
  expect(fs.existsSync(join(h.home, 'skills', 'user-skill', 'SKILL.md'))).toBe(true)
})

it('disabled Skill identities survive reload without affecting a same-name scoped provider', async () => {
  const h = await harness({ prepare(home) { skill(join(home, 'skills'), 'user-demo') } })
  const agent = await h.create('skill-owner')
  const row = (await h.post('skills-list')).value.skills.find((item: any) => item.name === 'user-demo')
  expect((await h.post('skill-toggle', { ...row, enabled: false })).value.ok).toBe(true)
  await h.fiber.dispose()
  expect((await h.ctx.skills.get('user-demo', { cwd: h.a }))!.invocation.modelInvocable).toBe(true)
  await h.reload()
  expect((await h.post('skills-list')).value.skills.find((item: any) => item.name === 'user-demo').disabled).toBe(true)
  expect((await h.ctx.skills.get('user-demo', { cwd: h.a }))!.invocation.modelInvocable).toBe(false)
  await agent.ctx.plugin({ name: 'scoped-skill-fixture', inject: ['skills'], apply(inner) {
    inner.skills.register({ name: 'user-demo', description: 'scoped test', content: 'scoped', source: 'runtime' })
  } })
  const scoped = (await h.post('skills-list', { sessionId: 'skill-owner' })).value.skills.find((item: any) => item.name === 'user-demo')
  expect(scoped.toggleable).toBe(false)
  expect(scoped.deletable).toBe(false)
  expect((await h.post('skill-toggle', { ...scoped, sessionId: 'skill-owner', enabled: false })).status).toBe(400)
})

it('standalone composition agrees with the official host on nested inserts, name guards and replacement overrides', () => {
  const base = [{ id: 'group', name: 'group-plugin', group: true, config: [{ id: 'nested', name: 'original', config: { keep: true } }] }]
  const patches = [
    { id: 'missing', disabled: true },
    { id: 'group', insert: [{ id: 'inserted', name: 'new', config: { old: true } }] },
    { id: 'inserted', name: 'mismatch', disabled: true },
    { id: 'inserted', name: 'new', disabled: true, config: { replaced: true } },
    { insert: [{ id: 'root', name: 'root' }] },
    { id: 'nested', config: { replaced: true } },
  ]
  expect(composePatches(base, patches)).toEqual(applyEntryPatches(base, patches, () => {}))
})

it.skipIf(process.env.TOOLGATE_BROWSER !== '1')('real browser settings preserve secrets and operate only on the selected Skill workspace', async () => {
  const started = performance.now()
  const stages: Array<{ stage: string; elapsedMs: number }> = []
  const mark = (stage: string) => {
    stages.push({ stage, elapsedMs: Math.round(performance.now() - started) })
    fs.writeFileSync(join(process.env.TOOLGATE_PROJECT!, 'work/results/ui-timings.json'), JSON.stringify(stages, null, 2))
  }
  mark('prepare-host')
  const h = await harness({ prepare(home) { skill(join(home, 'shared-agents', 'skills'), 'shared-demo') } })
  await h.create('a', h.a); await h.create('b', h.b)
  mark('build-fixture')
  const boot = buildSync({ stdin: { contents: `
    import React from 'react'; import {createRoot} from 'react-dom/client';
    const slots = {inject(_name, fn) {return fn()}, register(_descriptor, render) {createRoot(document.getElementById('app')).render(render()); return () => {}}};
    window.__ModuleLoader__ = {load({factory}) {factory(name => {if(name === 'react') return React; throw new Error(name)}).apply({get(name) {return name === 'slots' ? slots : undefined}})}};
  `, resolveDir: process.env.TOOLGATE_PROJECT }, bundle: true, write: false, format: 'iife', platform: 'browser', logLevel: 'silent' }).outputFiles[0]!.text
  const client = fs.readFileSync(join(process.env.TOOLGATE_PROJECT!, 'lib/client.js'), 'utf8')
  h.ctx.effect(() => h.ctx.webServer.register({ kind: 'exact', path: '/fixture', handler(req, res) {
    const rejection = h.ctx.connection.requestRejection(req)
    if (rejection !== undefined) { res.writeHead(rejection); res.end(); return }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end('<!doctype html><meta name="viewport" content="width=device-width"><div id="app"></div><script>' + boot.replaceAll('</script', '<\\/script') + '</script><script>const factory = "unrelated plugin";</script><script>' + client + '</script>')
  } }))
  mark('launch-browser')
  const browser = await chromium.launch({ headless: true, timeout: 30000, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) })
  onTestFinished(() => browser.close())
  mark('create-page')
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 }, locale: 'zh-CN' })
  page.setDefaultTimeout(5000)
  page.setDefaultNavigationTimeout(5000)
  const errors: string[] = []
  page.on('pageerror', error => { errors.push(error.message); fs.writeFileSync(join(process.env.TOOLGATE_PROJECT!, 'work/results/ui-errors.log'), errors.join('\n')) })
  mark('authenticate')
  await page.goto(h.ctx.connection.authenticatedUrl(h.origin))
  mark('open-settings')
  await page.goto(h.origin + '/fixture')
  const checkProjectLinks = async () => {
    await expect.poll(() => page.getByRole('link', { name: 'GitHub 项目', exact: true }).getAttribute('href')).toBe('https://github.com/jidekaixin2dian/dsh-toolgate')
    expect(await page.getByRole('link', { name: '反馈问题', exact: true }).getAttribute('href')).toBe('https://github.com/jidekaixin2dian/dsh-toolgate/issues/new')
    expect(await page.getByRole('link', { name: '反馈问题', exact: true }).getAttribute('rel')).toBe('noopener noreferrer')
    expect(await page.getByRole('link', { name: '反馈问题', exact: true }).getAttribute('target')).toBe('_blank')
  }
  await checkProjectLinks()
  mark('create-mcp')
  await page.getByRole('button', { name: 'MCP 服务器', exact: true }).click()
  await checkProjectLinks()
  await page.getByRole('button', { name: '新增服务器', exact: true }).click()
  await page.getByLabel('serverName *', { exact: true }).fill('browser-demo')
  await page.getByLabel('command', { exact: true }).fill('node')
  await page.getByLabel(/^args/).fill('https://example.test/mcp\nC:\\tools\\demo.js')
  await page.getByLabel(/^env/).fill('TOKEN=synthetic-browser-secret')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => page.getByRole('button', { name: '编辑', exact: true }).count()).toBe(1)
  mark('edit-mcp-and-check-secret-retention')
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  expect(await page.getByLabel(/^env/).isDisabled()).toBe(true)
  await page.getByLabel('command', { exact: true }).fill('node-custom')
  await page.getByRole('button', { name: '保存', exact: true }).click()
  await expect.poll(() => parse(fs.readFileSync(join(h.profile, 'cordis.patch.yml'), 'utf8'))[0].insert[0].config.command).toBe('node-custom')
  const saved = parse(fs.readFileSync(join(h.profile, 'cordis.patch.yml'), 'utf8'))[0].insert[0].config
  expect(saved.env.TOKEN).toBe('synthetic-browser-secret')
  expect(saved.args).toEqual(['https://example.test/mcp', 'C:\\tools\\demo.js'])
  expect(await page.locator('body').innerText()).not.toContain('synthetic-browser-secret')
  mark('select-skill-workspace')
  await page.getByRole('button', { name: 'Skills', exact: true }).click()
  await checkProjectLinks()
  await page.getByLabel('Skill 工作区').selectOption('b')
  await expect.poll(() => page.locator('body').innerText()).toContain(h.b)
  const readOnly = page.locator('.cb-row').filter({ hasText: 'shared-demo' })
  expect(await readOnly.getByRole('button', { name: '删除', exact: true }).isDisabled()).toBe(true)
  await page.getByRole('button', { name: '新建 Skill', exact: true }).click()
  mark('create-skill')
  await page.getByLabel('name（kebab-case）').fill('browser-skill')
  await page.getByLabel(/^scope/).selectOption('project')
  await page.getByLabel('description', { exact: true }).fill('browser regression')
  await page.getByLabel('body', { exact: true }).fill('synthetic instructions')
  await page.getByRole('button', { name: '创建', exact: true }).click()
  await expect.poll(() => fs.existsSync(join(h.b, '.dsh/skills/browser-skill/SKILL.md'))).toBe(true)
  await expect.poll(() => page.locator('.cb-row').filter({ hasText: 'browser-skill' }).count()).toBe(1)
  await expect.poll(() => page.getByLabel('name（kebab-case）').count()).toBe(0)
  expect(fs.existsSync(join(h.a, '.dsh/skills/browser-skill/SKILL.md'))).toBe(false)
  mark('capture-desktop-and-mobile')
  await page.screenshot({ path: join(process.env.TOOLGATE_PROJECT!, 'work/results/ui-desktop.png'), fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  await page.screenshot({ path: join(process.env.TOOLGATE_PROJECT!, 'work/results/ui-mobile.png'), fullPage: true })
  page.on('dialog', dialog => dialog.accept())
  mark('delete-skill')
  await page.locator('.cb-row').filter({ hasText: 'browser-skill' }).getByRole('button', { name: '删除', exact: true }).click()
  await expect.poll(() => fs.existsSync(join(h.b, '.dsh/skills/browser-skill/SKILL.md'))).toBe(false)
  expect(fs.readdirSync(join(h.b, '.dsh/skills/.trash')).length).toBe(1)
  expect(errors).toEqual([])
  await page.addInitScript(() => Object.defineProperty(navigator, 'language', { configurable: true, value: 'en-US' }))
  await page.reload()
  await expect.poll(() => page.getByRole('link', { name: 'GitHub project', exact: true }).getAttribute('href')).toBe('https://github.com/jidekaixin2dian/dsh-toolgate')
  expect(await page.getByRole('link', { name: 'Report an issue', exact: true }).getAttribute('href')).toBe('https://github.com/jidekaixin2dian/dsh-toolgate/issues/new')
  mark('complete')
}, 60000)
