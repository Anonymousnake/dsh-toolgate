import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import test from 'node:test'
import { ToolRuntime, defineTool } from '@deepseek-ai/dsh-tools'
import { apply } from '../../lib/index.js'

// Resolve services from the installed host, not a second Cordis instance.
const host = createRequire(import.meta.resolve('@deepseek-ai/dsh-tools'))
const load = name => import(pathToFileURL(host.resolve(name)).href)
const [{ Context }, { SystemPrompt }, { SkillRegistry }, { createScope }] = await Promise.all([
  load('@deepseek-ai/cordis'), load('@deepseek-ai/dsh-system-prompt'),
  load('@deepseek-ai/dsh-skill'), load('@deepseek-ai/dsh-scope'),
])

async function fixture(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'toolgate-contract-'))
  fs.writeFileSync(path.join(home, 'toolgate.json'), JSON.stringify({ disabled: ['mcp:hidden'] }))
  const ctx = new Context()
  ctx.provide('dshHomePath', () => home)
  new SystemPrompt(ctx, {})
  new ToolRuntime(ctx)
  new SkillRegistry(ctx)
  t.after(async () => {
    await ctx.fiber.dispose()
    fs.rmSync(home, { recursive: true, force: true })
  })
  const register = (name, target = ctx) => target.tools.register(defineTool({
    name, description: name, parameters: {},
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute: async () => name,
  }))
  register('read')
  register('mcp__hidden__initial')
  await apply(ctx)
  const agents = ['a', 'b', 'c'].map(id => {
    const agent = { session: { id } }
    agent.ctx = createScope(ctx, agent).ctx
    return agent
  })
  const step = agent => ctx.parallel('agent/pre-step', agent, () => {})
  const names = async agent => (await ctx.systemPrompt.assemble({ scope: agent })).tools.map(tool => tool.name)
  const gate = (agent, action, disabled = []) => ctx.tools.execute({
    callId: `gate-${agent.session.id}`, name: 'toolgate', arguments: { action, disabled },
    agent, signal: new AbortController().signal,
  })
  await Promise.all(agents.map(step))
  return { ctx, register, agents, step, names, gate }
}

const noHidden = names => !names.some(name => name.startsWith('mcp__hidden__'))

test('refreshing one session preserves hidden tools in every other session', async t => {
  const { ctx, register, agents: [a, b], step, names } = await fixture(t)
  register('mcp__hidden__late')
  await step(b)
  assert(!ctx.tools.schemas(a).some(tool => tool.name === 'mcp__hidden__initial'))
  assert(noHidden(await names(a)))
  assert(noHidden(await names(b)))
  assert((await names(a)).includes('read'))
})

test('late scoped tools obey the gate while session overrides remain isolated', async t => {
  const { register, agents: [a, b], names, gate } = await fixture(t)
  register('mcp__hidden__scoped', a.ctx)
  assert(noHidden(await names(a)))
  const opened = await gate(a, 'session', [])
  assert(!opened.isError)
  assert((await names(a)).includes('mcp__hidden__scoped'))
  assert(noHidden(await names(b)))
  const reset = await gate(a, 'reset')
  assert(!reset.isError)
  assert(noHidden(await names(a)))
})

test('interleaved registry changes do not expose hidden tools or churn stable requests', async t => {
  const { ctx, register, agents, step, names } = await fixture(t)
  for (let round = 0; round < 40; round += 1) {
    const dispose = register(`mcp__hidden__dynamic_${round}`)
    await step(agents[round % agents.length])
    for (const agent of agents) assert(noHidden(await names(agent)))
    dispose()
  }
  await Promise.all(agents.map(step))
  let changes = 0
  ctx.on('tools/change', () => { changes += 1 })
  for (let round = 0; round < 20; round += 1) {
    await Promise.all(agents.map(step))
    for (const agent of agents) assert(noHidden(await names(agent)))
  }
  assert.equal(changes, 0)
})
