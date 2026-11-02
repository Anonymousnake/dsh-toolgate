import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const source = fs.readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

// Minimal React stand-in: it renders function components and class components
// once, so a crash inside a section child surfaces here instead of at runtime.
function createReact() {
  class Component {
    constructor(props) { this.props = props || {}; this.state = {} }
    setState(next) { this.state = Object.assign({}, this.state, next) }
  }
  const nodes = []
  function createElement(type, props, ...children) {
    if (typeof type === 'function') {
      if (type.prototype && typeof type.prototype.render === 'function') {
        const instance = new type(props || {})
        instance.props = props || {}
        return instance.render()
      }
      return type(props || {})
    }
    const node = { type, props: props || {}, children }
    nodes.push(node)
    return node
  }
  return {
    Component,
    createElement,
    Fragment: Symbol('Fragment'),
    nodes,
    useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
    useEffect: () => {},
    useMemo: (factory) => factory(),
    useRef: (value) => ({ current: value }),
  }
}

function loadPlugin() {
  const rows = []
  const context = vm.createContext({
    window: { __ModuleLoader__: { load(row) { rows.push(row) } } },
    console,
    navigator: { language: 'zh-CN' },
  })
  vm.runInContext(source, context)
  assert.equal(rows.length, 1)
  const react = createReact()
  const exports = rows[0].factory((specifier) => {
    if (specifier === 'react') return react
    throw new Error(`unexpected require: ${specifier}`)
  })
  return { exports, react }
}

/**
 * Build the client context. `locale` is defined as an accessor: a host that
 * does not grant the service throws on read instead of returning undefined,
 * which is what newer DSH releases do for undeclared services.
 */
function makeContext(localeBehaviour) {
  const registrations = []
  const slots = {
    inject(_key, callback) { callback() },
    register(options, component) {
      registrations.push({ options, component })
      return () => {}
    },
  }
  const ctx = {
    get: (name) => (name === 'slots' ? slots : undefined),
    interval: () => () => {},
    timeout: () => () => {},
  }
  Object.defineProperty(ctx, 'locale', { get: localeBehaviour })
  return { ctx, registrations }
}

function projectLinksOf(rendered) {
  const section = rendered.children.find((child) => child && child.props && child.props['aria-label'])
  assert.ok(section, 'settings section should render the project links')
  return section
}

test('the settings section still renders when the host denies the locale service', () => {
  const { exports } = loadPlugin()
  const { ctx, registrations } = makeContext(() => {
    throw new Error('cannot get property "locale" without inject')
  })

  assert.doesNotThrow(() => exports.apply(ctx))
  assert.equal(registrations.length, 1)
  const { options, component } = registrations[0]
  assert.equal(options.name, 'settings.section')
  assert.equal(options.id, 'toolgate')

  let rendered
  assert.doesNotThrow(() => { rendered = component() })
  assert.equal(rendered.props.className, 'cb-section')
  assert.equal(projectLinksOf(rendered).props['aria-label'], '项目与反馈')
})

test('the plugin declares the locale service it reads', () => {
  const { exports } = loadPlugin()
  assert.ok(exports.inject.includes('locale'), 'inject must declare locale before reading ctx.locale')
  assert.ok(exports.inject.includes('timer'))
})

test('the project links follow the active locale when the service is available', () => {
  const { exports } = loadPlugin()
  const english = makeContext(() => ({ language: { getSnapshot: () => 'en-US' } }))
  exports.apply(english.ctx)
  const englishNode = projectLinksOf(english.registrations[0].component())
  assert.equal(englishNode.props['aria-label'], 'Project and feedback')

  const chinese = makeContext(() => ({ language: { getSnapshot: () => 'zh-CN' } }))
  exports.apply(chinese.ctx)
  const chineseNode = projectLinksOf(chinese.registrations[0].component())
  assert.equal(chineseNode.props['aria-label'], '项目与反馈')
})
