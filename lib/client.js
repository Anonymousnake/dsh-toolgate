// dsh-toolgate — settings page (web bundle, ModuleLoader CJS format).
// Talks to the host half over the exact same-origin route; never touches files.
// DSH concatenates classic bundles; every registration needs its own scope.
;(() => {
const factory = (require) => {
  const module = { exports: {} }
  const exports = module.exports
  Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
  const React = require('react')

  const CSS = [
    '.cb-wrap{font-size:13px;line-height:1.65;display:flex;flex-direction:column;gap:14px;padding:4px 2px;color:inherit}',
    '.cb-title{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}',
    '.cb-title h2{margin:0;font-size:16px}',
    '.cb-sub{opacity:.72;font-size:12px}',
    '.cb-card{border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35));border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:10px}',
    '.cb-totals{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}',
    '.cb-total{border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.25));border-radius:7px;padding:9px 11px}',
    '.cb-total b{display:block;font-size:20px;line-height:1.2;font-variant-numeric:tabular-nums}',
    '.cb-total span{font-size:11px;opacity:.7}',
    '.cb-presets{display:flex;gap:8px;flex-wrap:wrap}',
    '.cb-btn{font-size:12px;padding:4px 11px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:transparent;color:inherit;cursor:pointer;white-space:nowrap}',
    '.cb-btn:hover{border-color:currentColor}',
    '.cb-btn:disabled{opacity:.45;cursor:default}',
    '.cb-btn.primary{border-color:rgba(48,120,255,.65)}',
    '.cb-row{display:flex;align-items:center;gap:12px;padding:9px 0;border-top:1px solid var(--dsw-alias-border-l1, rgba(128,128,128,.18))}',
    '.cb-row:first-of-type{border-top:0}',
    '.cb-row-main{flex:1;min-width:0}',
    '.cb-row-name{font-weight:600}',
    '.cb-row-meta{font-size:11px;opacity:.65;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}',
    '.cb-pill{font-size:10px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));white-space:nowrap}',
    '.cb-pill.on{background:rgba(46,160,67,.16);border-color:rgba(46,160,67,.55)}',
    '.cb-pill.off{background:rgba(128,128,128,.12)}',
    '.cb-pill.core{opacity:.6}',
    '.cb-note{font-size:11px;opacity:.7;line-height:1.55}',
    '.cb-warn{color:rgba(219,154,4,.95)}',
    '.cb-msg{padding:8px 10px;border-radius:6px;font-size:12px}',
    '.cb-msg.ok{background:rgba(46,160,67,.14);border:1px solid rgba(46,160,67,.4)}',
    '.cb-msg.err{background:rgba(248,81,73,.14);border:1px solid rgba(248,81,73,.4)}',
    '.cb-tabs{display:flex;gap:6px;border-bottom:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35));padding-bottom:6px}',
    '.cb-tab{font-size:12px;padding:5px 10px;border:1px solid transparent;border-radius:6px;background:transparent;color:inherit;opacity:.6;cursor:pointer}',
    '.cb-tab.active{opacity:1;border-color:var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:var(--dsw-alias-bg-layer-2, rgba(128,128,128,.08))}',
    '.cb-item{border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.3));border-radius:8px;padding:10px 12px;display:flex;flex-direction:column;gap:6px}',
    '.cb-item-head{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
    '.cb-item-name{font-weight:600;font-family:Consolas,monospace;font-size:12px}',
    '.cb-item-meta{font-size:11px;opacity:.65;word-break:break-all}',
    '.cb-item-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}',
    '.cb-chip{font-size:10px;padding:1px 7px;border-radius:999px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5))}',
    '.cb-chip.on{background:rgba(46,160,67,.15)}',
    '.cb-chip.off{background:rgba(248,81,73,.14)}',
    '.cb-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.35));border-radius:8px;padding:12px}',
    '.cb-form h3{grid-column:1/-1;margin:0;font-size:13px}',
    '.cb-form label{display:flex;flex-direction:column;gap:3px;font-size:11px;opacity:.85}',
    '.cb-form .full{grid-column:1/-1}',
    '.cb-input{font:inherit;font-size:12px;padding:4px 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:transparent;color:inherit;width:100%;box-sizing:border-box}',
    '.cb-input textarea,.cb-form textarea{font-family:Consolas,monospace;min-height:44px;resize:vertical}',
    '.cb-search{font-size:12px;padding:5px 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-l2, rgba(128,128,128,.5));background:transparent;color:inherit;width:100%;box-sizing:border-box}',
    '.cb-section{display:flex;flex-direction:column;gap:16px;color:inherit}',
    '.cb-project{margin:0 2px;padding:14px 0 4px;border-top:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.25));font-size:13px;line-height:1.6}',
    '.cb-project h3{margin:0 0 4px;font-size:13px;font-weight:600}.cb-project p{margin:0;font-size:12px;opacity:.7}',
    '.cb-project-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.cb-project-link{display:inline-flex;align-items:center;gap:7px;margin:0;padding:6px 10px;border:1px solid var(--dsw-alias-border-l2,rgba(128,128,128,.35));border-radius:7px;background:var(--dsw-alias-bg-layer-2,transparent);color:inherit;text-decoration:none;font-size:12px}',
    '.cb-project-link svg{width:15px;height:15px;flex:none;opacity:.75}.cb-project-link:hover{border-color:currentColor}.cb-project-link:focus-visible{outline:2px solid var(--dsw-alias-brand,#367bf5);outline-offset:2px}',
  ].join('')

  function ensureCss() {
    if (typeof document === 'undefined') return
    if (document.querySelector('style[data-plugin-css="dsh-toolgate"]')) return
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-toolgate'
    tag.dataset.pluginCss = 'dsh-toolgate'
    tag.textContent = CSS
    document.head.appendChild(tag)
  }

  function api(op, args) {
    return fetch('/dsh-toolgate/api', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json', 'x-dsh-plugin': 'dsh-toolgate' },
      body: JSON.stringify({ op, args: args || {} }),
    }).then(r => r.json()).catch(e => ({ ok: false, error: String((e && e.message) || e) }))
  }

  const fmt = (n) => {
    const v = Number(n) || 0
    return v >= 10000 ? (v / 10000).toFixed(1) + '万' : String(Math.round(v))
  }

  // `Page` is defined before `apply(ctx)` runs; the plugin context is only
  // available there, so keep a module-local handle instead of closing over
  // the apply parameter (which is undefined at render time).
  let pageCtx = null

  // The settings page can render before/without the timer service (for example
  // after a client-only HMR reload). Never let a missing ctx.interval/timeout
  // turn the whole section blank; fall back to the browser timers.
  function safeInterval(fn, ms) {
    try {
      if (pageCtx && typeof pageCtx.interval === 'function') {
        const dispose = pageCtx.interval(fn, ms)
        return typeof dispose === 'function' ? dispose : undefined
      }
    } catch (err) {
      console.warn('[dsh-toolgate] ctx.interval failed, using setInterval', err)
    }
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  }

  function safeTimeout(fn, ms) {
    try {
      if (pageCtx && typeof pageCtx.timeout === 'function') {
        const dispose = pageCtx.timeout(fn, ms)
        return typeof dispose === 'function' ? dispose : undefined
      }
    } catch (err) {
      console.warn('[dsh-toolgate] ctx.timeout failed, using setTimeout', err)
    }
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  }

  class PageBoundary extends React.Component {
    constructor(props) {
      super(props)
      this.state = { error: null }
    }
    static getDerivedStateFromError(error) {
      return { error }
    }
    componentDidCatch(error, info) {
      console.error('[dsh-toolgate] settings page crashed', error, info)
    }
    render() {
      if (this.state.error) {
        return React.createElement('div', { className: 'cb-wrap' },
          React.createElement('div', { className: 'cb-title' }, React.createElement('h2', null, '工具闸门')),
          React.createElement('div', { className: 'cb-msg err' },
            '页面加载失败：' + String((this.state.error && this.state.error.message) || this.state.error)))
      }
      return this.props.children
    }
  }

  function emptyMcpForm() {
    return {
      serverName: '', transport: 'stdio', level: 'project', url: '', command: '', args: '',
      env: '', headers: '', toolCallTimeoutMs: '',
    }
  }

  function rowToForm(row) {
    const c = row.config || {}
    return {
      serverName: c.serverName || row.id || '',
      transport: c.transport || 'stdio',
      level: row.level || 'project',
      url: c.url || '',
      command: c.command || '',
      args: Array.isArray(c.args) ? c.args.join('\n') : '',
      env: '', headers: '', replaceEnv: false, replaceHeaders: false,
      envKeys: row.envKeys || [], headerKeys: row.headerKeys || [],
      toolCallTimeoutMs: c.toolCallTimeoutMs ? String(c.toolCallTimeoutMs) : '',
    }
  }

  function McpPanel() {
    const [state, setState] = React.useState({ loading: true, rows: [], paths: null, error: null })
    const [form, setForm] = React.useState(null)
    const [editing, setEditing] = React.useState(null)
    const [busy, setBusy] = React.useState(false)
    const [msg, setMsg] = React.useState(null)

    const refresh = () => {
      api('mcp-list').then(res => {
        if (res && res.ok) setState({ loading: false, rows: res.rows || [], paths: res.paths || null, error: null })
        else setState({ loading: false, rows: [], paths: null, error: (res && res.error) || '加载失败' })
      })
    }
    React.useEffect(() => { refresh() }, [])
    React.useEffect(() => {
      if (!msg) return
      return safeTimeout(() => setMsg(null), 3500)
    }, [msg])

    const run = (op, args, okText) => {
      setBusy(true)
      setMsg(null)
      return api(op, args).then(res => {
        if (res && res.ok) {
          setState({ loading: false, rows: res.rows || [], paths: res.paths || state.paths, error: null })
          setMsg({ kind: 'ok', text: okText })
          return res
        }
        setMsg({ kind: 'err', text: (res && res.error) || '操作失败' })
        return res
      }).then(res => { setBusy(false); return res })
    }

    const save = () => {
      if (!form) return
      if (!form.serverName.trim()) return setMsg({ kind: 'err', text: 'serverName 不能为空' })
      const row = Object.assign({}, form, {
        toolCallTimeoutMs: Number(form.toolCallTimeoutMs) || 0,
        ...(editing ? { id: editing } : {}),
      })
      if (editing && !form.replaceEnv) delete row.env
      if (editing && !form.replaceHeaders) delete row.headers
      const op = editing ? 'mcp-edit' : 'mcp-add'
      run(op, { row }, editing ? '已保存，HMR 会自动生效' : '已添加，HMR 会自动生效').then(res => {
        if (res && res.ok) { setForm(null); setEditing(null) }
      })
    }

    const toggle = (row) => run('mcp-enabled', { id: row.id, enabled: !!row.disabled }, row.disabled ? '已启用' : '已停用')
    const remove = (row) => {
      if (!confirm('删除 MCP 服务器 ' + row.id + ' 及其覆盖项？其他配置会保留，原文件会备份。')) return
      run('mcp-remove', { id: row.id }, '已删除').then(res => { if (res && res.ok) { setForm(null); setEditing(null) } })
    }

    const set = (key) => (e) => setForm(Object.assign({}, form, { [key]: e.target.value }))
    const field = (label, key, full) => React.createElement('label', { className: full ? 'full' : '' },
      label,
      React.createElement('input', { className: 'cb-input', value: form[key] || '', onChange: set(key) }))

    return React.createElement('div', { className: 'cb-wrap' },
      React.createElement('div', { className: 'cb-title' },
        React.createElement('h2', null, 'MCP 服务器'),
        React.createElement('span', { className: 'cb-sub' }, '增删改与启停写回 profile / global 的 cordis.patch.yml，保存后 HMR 生效')),
      msg ? React.createElement('div', { className: 'cb-msg ' + msg.kind }, msg.text) : null,
      state.error ? React.createElement('div', { className: 'cb-msg err' }, state.error) : null,
      React.createElement('div', { className: 'cb-presets' },
        React.createElement('button', { className: 'cb-btn primary', disabled: busy, onClick: () => { setEditing(null); setForm(emptyMcpForm()) } }, '新增服务器'),
        React.createElement('button', { className: 'cb-btn', disabled: busy, onClick: refresh }, '刷新')),
      state.paths ? React.createElement('div', { className: 'cb-row-meta' },
        '写入：' + state.paths.project + ' / 全局：' + state.paths.global) : null,
      form ? React.createElement('div', { className: 'cb-form' },
        React.createElement('h3', null, editing ? '编辑 ' + editing : '新增服务器'),
        React.createElement('label', null, 'serverName *', React.createElement('input', { className: 'cb-input', value: form.serverName, onChange: set('serverName') })),
        React.createElement('label', null, 'transport', React.createElement('select', { className: 'cb-input', value: form.transport, onChange: set('transport') },
          React.createElement('option', { value: 'stdio' }, 'stdio'),
          React.createElement('option', { value: 'streamable-http' }, 'streamable-http'))),
        React.createElement('label', null, '写入位置', React.createElement('select', { className: 'cb-input', disabled: !!editing, value: form.level, onChange: set('level') },
          React.createElement('option', { value: 'project' }, 'profile cordis.patch.yml'),
          React.createElement('option', { value: 'global' }, 'global cordis.patch.yml'))),
        form.transport === 'streamable-http'
          ? React.createElement(React.Fragment, null,
            React.createElement('label', { className: 'full' }, 'url', React.createElement('input', { className: 'cb-input', value: form.url, onChange: set('url') })),
            editing ? React.createElement('label', { className: 'full' }, React.createElement('span', null,
              React.createElement('input', { type: 'checkbox', checked: !!form.replaceHeaders, onChange: e => setForm(Object.assign({}, form, { replaceHeaders: e.target.checked })) }),
              ' 替换 headers（当前键：' + (form.headerKeys.join(', ') || '无') + '；未勾选保留原值）')) : null,
            React.createElement('label', { className: 'full' }, 'headers（每行 KEY=VALUE；勾选替换后留空即清空）', React.createElement('textarea', { className: 'cb-input', disabled: !!editing && !form.replaceHeaders, value: form.headers, onChange: set('headers') })))
          : React.createElement(React.Fragment, null,
            React.createElement('label', { className: 'full' }, 'command', React.createElement('input', { className: 'cb-input', value: form.command, onChange: set('command') })),
            React.createElement('label', { className: 'full' }, 'args（每行一个）', React.createElement('textarea', { className: 'cb-input', value: form.args, onChange: set('args') })),
            editing ? React.createElement('label', { className: 'full' }, React.createElement('span', null,
              React.createElement('input', { type: 'checkbox', checked: !!form.replaceEnv, onChange: e => setForm(Object.assign({}, form, { replaceEnv: e.target.checked })) }),
              ' 替换 env（当前键：' + (form.envKeys.join(', ') || '无') + '；未勾选保留原值）')) : null,
            React.createElement('label', { className: 'full' }, 'env（每行 KEY=VALUE；勾选替换后留空即清空）', React.createElement('textarea', { className: 'cb-input', disabled: !!editing && !form.replaceEnv, value: form.env, onChange: set('env') }))),
        field('toolCallTimeoutMs', 'toolCallTimeoutMs'),
        React.createElement('div', { className: 'full cb-item-actions' },
          React.createElement('button', { className: 'cb-btn primary', disabled: busy, onClick: save }, '保存'),
          React.createElement('button', { className: 'cb-btn', disabled: busy, onClick: () => { setForm(null); setEditing(null) } }, '取消'))) : null,
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } },
        state.loading ? React.createElement('div', { className: 'cb-sub' }, '加载中…') : null,
        state.rows.map(row => {
          const c = row.config || {}
          const target = c.transport === 'streamable-http' ? c.url : [c.command].concat(c.args || []).join(' ')
          return React.createElement('div', { className: 'cb-item', key: row.id },
            React.createElement('div', { className: 'cb-item-head' },
              React.createElement('span', { className: 'cb-item-name' }, row.id),
              React.createElement('span', { className: 'cb-chip ' + (row.disabled ? 'off' : 'on') }, row.disabled ? '已停用' : '启用中'),
              React.createElement('span', { className: 'cb-item-meta' }, (c.serverName || '') + ' · ' + (c.transport || '?') + ' · ' + row.level)),
            React.createElement('div', { className: 'cb-item-meta' }, target || '(no command/url)'),
            React.createElement('div', { className: 'cb-item-actions' },
              React.createElement('button', { className: 'cb-btn', title: row.reason, disabled: busy || !row.editable, onClick: () => { setEditing(row.id); setForm(rowToForm(row)) } }, '编辑'),
              React.createElement('button', { className: 'cb-btn', title: row.reason, disabled: busy || !row.editable, onClick: () => toggle(row) }, row.disabled ? '启用' : '停用'),
              React.createElement('button', { className: 'cb-btn danger', title: row.reason, disabled: busy || !row.editable, onClick: () => remove(row) }, '删除')))
        })))
  }

  function SkillPanel() {
    const [state, setState] = React.useState({ loading: true, skills: [], sessions: [], complete: true, error: null })
    const [sessionId, setSessionId] = React.useState('')
    const [q, setQ] = React.useState('')
    const [busy, setBusy] = React.useState(null)
    const [msg, setMsg] = React.useState(null)
    const [form, setForm] = React.useState(null)
    const ingest = res => setState(Object.assign({}, res, { loading: false, error: null }))
    React.useEffect(() => {
      let cancelled = false
      setForm(null)
      setState(previous => Object.assign({}, previous, { loading: true }))
      api('skills-list', { sessionId }).then(res => {
        if (cancelled) return
        if (res && res.ok) ingest(res)
        else setState(previous => Object.assign({}, previous, { loading: false, skills: [], complete: false, error: (res && res.error) || '加载失败' }))
      })
      return () => { cancelled = true }
    }, [sessionId])
    React.useEffect(() => {
      if (!msg) return
      return safeTimeout(() => setMsg(null), 3500)
    }, [msg])
    const toggle = (skill) => {
      setBusy(skill.name)
      api('skill-toggle', { sessionId, name: skill.name, provider: skill.provider, path: skill.path, source: skill.source, enabled: skill.disabled }).then(res => {
        if (res && res.ok) {
          ingest(res)
          setMsg({ kind: 'ok', text: skill.disabled ? '已启用' : '已停用' })
        } else setMsg({ kind: 'err', text: (res && res.error) || '操作失败' })
      }).then(() => setBusy(null))
    }
    const create = () => {
      if (!form) return
      setBusy('__create__')
      api('skill-create', Object.assign({}, form, { sessionId })).then(res => {
        if (res && res.ok) {
          ingest(res)
          setMsg({ kind: 'ok', text: '已创建 Skill' })
          setForm(null)
        } else setMsg({ kind: 'err', text: (res && res.error) || '创建失败' })
      }).then(() => setBusy(null))
    }
    const remove = (skill) => {
      if (!confirm('删除 Skill ' + skill.name + '？会移动到 .trash，不会硬删除。')) return
      setBusy(skill.name)
      api('skill-delete', { sessionId, name: skill.name, provider: skill.provider, path: skill.path, source: skill.source }).then(res => {
        if (res && res.ok) {
          ingest(res)
          setMsg({ kind: 'ok', text: '已移到 .trash' })
        } else setMsg({ kind: 'err', text: (res && res.error) || '删除失败' })
      }).then(() => setBusy(null))
    }
    const rows = state.skills.filter(s => !q || (s.name + ' ' + s.description).toLowerCase().includes(q.toLowerCase()))
    return React.createElement('div', { className: 'cb-wrap' },
      React.createElement('div', { className: 'cb-title' },
        React.createElement('h2', null, 'Skills'),
        React.createElement('span', { className: 'cb-sub' }, '选择工作区后管理 Skill；只读来源保留在原处')),
      msg ? React.createElement('div', { className: 'cb-msg ' + msg.kind }, msg.text) : null,
      state.error ? React.createElement('div', { className: 'cb-msg err' }, state.error) : null,
      React.createElement('label', null, 'Skill 工作区 ', React.createElement('select', { className: 'cb-input', disabled: !!busy, value: sessionId, onChange: e => setSessionId(e.target.value) },
        React.createElement('option', { value: '' }, '启动工作区 / 用户 Skill'),
        state.sessions.map(row => React.createElement('option', { key: row.id, value: row.id }, row.label + ' · ' + (row.cwd || '无工作目录'))))),
      React.createElement('div', { className: 'cb-row-meta' }, '项目：' + (state.workspace || '未选择') + ' · 用户目录：' + (state.userRoot || '')),
      React.createElement('div', { className: 'cb-presets' },
        React.createElement('button', { className: 'cb-btn primary', disabled: busy, onClick: () => setForm({ name: '', description: '', body: '', scope: 'user' }) }, '新建 Skill')),
      form ? React.createElement('div', { className: 'cb-form' },
        React.createElement('h3', null, '新建 Skill'),
        React.createElement('label', null, 'name（kebab-case）', React.createElement('input', { className: 'cb-input', value: form.name, onChange: e => setForm(Object.assign({}, form, { name: e.target.value })) })),
        React.createElement('label', null, 'scope', React.createElement('select', { className: 'cb-input', value: form.scope, onChange: e => setForm(Object.assign({}, form, { scope: e.target.value })) },
          React.createElement('option', { value: 'user' }, '用户 DSH_HOME/skills'),
          React.createElement('option', { value: 'project', disabled: !state.workspace }, '所选项目 .dsh/skills'))),
        React.createElement('label', { className: 'full' }, 'description', React.createElement('input', { className: 'cb-input', value: form.description, onChange: e => setForm(Object.assign({}, form, { description: e.target.value })) })),
        React.createElement('label', { className: 'full' }, 'body', React.createElement('textarea', { className: 'cb-input', value: form.body, onChange: e => setForm(Object.assign({}, form, { body: e.target.value })) })),
        React.createElement('div', { className: 'full cb-item-actions' },
          React.createElement('button', { className: 'cb-btn primary', disabled: busy, onClick: create }, '创建'),
          React.createElement('button', { className: 'cb-btn', disabled: busy, onClick: () => setForm(null) }, '取消'))) : null,
      React.createElement('input', { className: 'cb-search', placeholder: '搜索 skill…', value: q, onChange: e => setQ(e.target.value) }),
      React.createElement('div', { className: 'cb-row-meta' }, state.skills.length + ' 个 Skill' + (state.complete ? '' : '（部分来源未加载）')),
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } },
        state.loading ? React.createElement('div', { className: 'cb-sub' }, '加载中…') : null,
        rows.map(s => React.createElement('div', { className: 'cb-row', key: s.name },
          React.createElement('div', { className: 'cb-row-main' },
            React.createElement('div', { className: 'cb-row-name' }, s.name),
            React.createElement('div', { className: 'cb-row-meta' }, s.description || '(no description)'),
            React.createElement('div', { className: 'cb-row-meta' }, s.source + ' · ' + s.provider + (s.path ? ' · ' + s.path : ''))),
          React.createElement('span', { className: 'cb-pill ' + (s.disabled ? 'off' : 'on') }, s.disabled ? '已停用' : '启用中'),
          React.createElement('button', { className: 'cb-btn', title: s.toggleable ? '' : '独立作用域 Skill，不能通过全局 provider 覆盖', disabled: !!busy || !s.toggleable, onClick: () => toggle(s) }, s.disabled ? '启用' : '停用'),
          React.createElement('button', { className: 'cb-btn danger', title: s.deletable ? '' : '该来源只读', disabled: !!busy || !s.deletable, onClick: () => remove(s) }, '删除')))))
  }

  function ProjectLinks() {
    // A direct read of an undeclared service throws on newer hosts
    // ("cannot get property \"locale\" without inject"), and this component
    // shares the settings section with the main page: one throw blanks both.
    let language
    try { language = pageCtx?.locale?.language?.getSnapshot?.() } catch { language = undefined }
    language = language || (typeof navigator === 'undefined' ? 'zh' : navigator.language)
    const zh = /^zh\b/i.test(language)
    const title = zh ? '项目与反馈' : 'Project and feedback'
    const icon = path => React.createElement('svg', { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true }, React.createElement('path', { d: path }))
    return React.createElement('section', { className: 'cb-project', 'aria-label': title },
      React.createElement('h3', null, title),
      React.createElement('p', null, zh ? '有问题或想法？欢迎在 GitHub 留言，一起把工具闸门做得更好。' : 'Found a problem or have an idea? Help make Toolgate better on GitHub.'),
      React.createElement('div', { className: 'cb-project-links' },
        React.createElement('a', { className: 'cb-project-link', href: 'https://github.com/jidekaixin2dian/dsh-toolgate', target: '_blank', rel: 'noopener noreferrer' }, icon('m9 8-4 4 4 4m6-8 4 4-4 4'), zh ? 'GitHub 项目' : 'GitHub project'),
        React.createElement('a', { className: 'cb-project-link', href: 'https://github.com/jidekaixin2dian/dsh-toolgate/issues/new', target: '_blank', rel: 'noopener noreferrer' }, icon('M6 4h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-5 4v-4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z M8 9h8M8 13h5'), zh ? '反馈问题' : 'Report an issue')))
  }

  function Page() {
    const [status, setStatus] = React.useState(null)
    const [error, setError] = React.useState(null)
    const [busy, setBusy] = React.useState(false)
    const [msg, setMsg] = React.useState(null)
    const [tab, setTab] = React.useState('budget')

    const refresh = () => {
      api('status').then(res => {
        if (res && res.ok) {
          setStatus(res)
          setError(null)
        } else {
          setError((res && res.error) || '加载失败')
        }
      })
    }

    React.useEffect(() => { refresh() }, [])
    React.useEffect(() => safeInterval(refresh, 5000), [])
    React.useEffect(() => {
      if (!msg) return
      return safeTimeout(() => setMsg(null), 3000)
    }, [msg])

    const apply = (disabled) => {
      setBusy(true)
      setMsg(null)
      api('set', { disabled }).then(res => {
        if (res && res.ok) {
          setStatus(res)
          setMsg({ kind: 'ok', text: '已应用，下一次请求生效' })
        } else {
          setMsg({ kind: 'err', text: (res && res.error) || '应用失败' })
        }
      }).then(() => setBusy(false))
    }

    const tabs = React.createElement('div', { className: 'cb-tabs' },
      [['budget', '预算'], ['mcp', 'MCP 服务器'], ['skills', 'Skills']].map(([id, label]) =>
        React.createElement('button', {
          key: id,
          className: 'cb-tab' + (tab === id ? ' active' : ''),
          onClick: () => setTab(id),
        }, label)))

    if (tab !== 'budget') {
      return React.createElement('div', { className: 'cb-wrap' },
        tabs,
        tab === 'mcp' ? React.createElement(McpPanel) : React.createElement(SkillPanel))
    }

    if (!status) {
      return React.createElement('div', { className: 'cb-wrap' },
        React.createElement('div', { className: 'cb-title' }, React.createElement('h2', null, '工具闸门')),
        tabs,
        error ? React.createElement('div', { className: 'cb-msg err' }, error) : React.createElement('div', { className: 'cb-sub' }, '加载中…'))
    }

    const disabled = status.disabled || []
    const groups = (status.groups || []).filter(g => g.toggle !== false)
    const core = (status.groups || []).find(g => g.id === 'core')
    const isOff = (id, list) => list.includes(id) || (id.startsWith('mcp:') && list.includes('mcp'))
    const toggle = (id) => {
      const off = isOff(id, disabled)
      let next
      if (off) {
        if (disabled.includes('mcp') && id.startsWith('mcp:')) {
          // Turning one server back on while "all MCP" is off: keep the other
          // servers off individually instead of silently restoring everything.
          next = disabled.filter(x => x !== 'mcp')
          for (const g of groups) {
            if (g.id.startsWith('mcp:') && g.id !== id) next.push(g.id)
          }
        } else {
          next = disabled.filter(x => x !== id)
        }
      } else {
        next = disabled.concat(id)
      }
      apply(next)
    }
    const preset = (ids) => apply(ids)
    const largest = groups.slice().sort((a, b) => b.tokens - a.tokens)[0]

    return React.createElement('div', { className: 'cb-wrap' },
      React.createElement('div', { className: 'cb-title' },
        React.createElement('h2', null, '工具闸门'),
        React.createElement('span', { className: 'cb-sub' }, '即时隐藏工具 schema，不改配置、不重启、不停止 MCP 进程')),
      tabs,
      msg ? React.createElement('div', { className: 'cb-msg ' + msg.kind }, msg.text) : null,
      React.createElement('div', { className: 'cb-card' },
        React.createElement('div', { className: 'cb-totals' },
          React.createElement('div', { className: 'cb-total' },
            React.createElement('b', null, fmt(status.totals.full)), React.createElement('span', null, '完整工具 + Skill 目录（约 tokens）')),
          React.createElement('div', { className: 'cb-total' },
            React.createElement('b', null, fmt(status.totals.current)), React.createElement('span', null, '当前生效（约 tokens）')),
          React.createElement('div', { className: 'cb-total' },
            React.createElement('b', null, fmt(status.totals.saved)), React.createElement('span', null, '已节省（约 tokens）'))),
        React.createElement('div', { className: 'cb-presets' },
          React.createElement('button', { className: 'cb-btn primary', disabled: busy, onClick: () => preset([]) }, '全部显示'),
          React.createElement('button', { className: 'cb-btn', disabled: busy, onClick: () => preset(['mcp']) }, '关闭全部 MCP'),
          largest ? React.createElement('button', { className: 'cb-btn', disabled: busy, onClick: () => preset([largest.id]) }, '关闭最大组') : null,
          React.createElement('button', { className: 'cb-btn', disabled: busy, onClick: () => preset(['mcp', 'skills', 'memory', 'schedule']) }, '精简模式'))),
      React.createElement('div', { className: 'cb-card' },
        React.createElement('div', { className: 'cb-row' },
          React.createElement('div', { className: 'cb-row-main' },
            React.createElement('div', { className: 'cb-row-name' }, '核心工具'),
            React.createElement('div', { className: 'cb-row-meta' }, (core ? core.count : 0) + ' 个，约 ' + fmt(core ? core.tokens : 0) + ' tokens，始终保留')),
          React.createElement('span', { className: 'cb-pill core' }, '只读')),
        groups.map(g => {
          const off = isOff(g.id, disabled)
          return React.createElement('div', { className: 'cb-row', key: g.id },
            React.createElement('div', { className: 'cb-row-main' },
              React.createElement('div', { className: 'cb-row-name' }, g.label),
              React.createElement('div', { className: 'cb-row-meta' }, g.count + ' 个工具' + (g.id === 'skills' && status.catalogTokens ? ' / 目录约 ' + fmt(status.catalogTokens) + ' tokens' : '') + ' / 约 ' + fmt(g.tokens) + ' tokens')),
            React.createElement('span', { className: 'cb-pill ' + (off ? 'off' : 'on') }, off ? '已隐藏' : '生效中'),
            React.createElement('button', { className: 'cb-btn', disabled: busy, onClick: () => toggle(g.id) }, off ? '恢复' : '隐藏'))
        })),
      React.createElement('div', { className: 'cb-note' },
        '作用范围：所有会话与子代理，在下一次请求组装前生效。Skill 组的“隐藏”会连同 skill 目录一起停用；MCP 进程仍然存活，恢复时无需重连。',
        React.createElement('br'),
        'token 数为按工具 JSON schema 与 Skill 描述估算，实际以模型分词器为准。',
        status.scoped ? React.createElement('span', { className: 'cb-warn' },
          React.createElement('br'),
          '注意：约 ' + status.scoped + ' 个 MCP 工具由动态插件注册在会话作用域，restrict 无法隐藏它们；请用对应插件的 unload 控制。') : null))
  }

  module.exports = {
    name: 'dsh-toolgate-client',
    inject: ['timer', 'locale'],
    apply(ctx) {
      pageCtx = ctx
      ensureCss()
      const slots = ctx.get('slots')
      if (!slots) return
      slots.inject('settings.section', () => slots.register(
        { name: 'settings.section', id: 'toolgate', order: 18, label: '工具闸门' },
        () => React.createElement('div', { className: 'cb-section' },
          React.createElement(PageBoundary, null, React.createElement(Page)),
          React.createElement(ProjectLinks))))
    },
  }
  return module.exports
}

if (typeof window !== 'undefined' && window.__ModuleLoader__) {
  window.__ModuleLoader__.load({ id: '@jidekaixin2dian/dsh-toolgate', factory })
}
})()

