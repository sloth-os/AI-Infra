import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { modelExamples } from '../src/examples/catalog.ts'
import { defaultExampleInputs, exampleUrl } from '../src/examples/model.ts'
import { defaultLifecycleView, lifecycleUrl } from '../src/lifecycle/model.ts'
import {
  defaultIssueInputs,
  defaultIssueView,
  issueUrl,
} from '../src/issues/model.ts'
import { hotIssues } from '../src/issues/catalog.ts'
import { ContextOverlay } from '../src/scene/context.ts'
import {
  contextAtLevel,
  contextSteps,
  hardwareAnchor,
  initialContextLevel,
  issuesAtLevel,
  levels,
  nativeLevel,
  parseContextLocation,
  stageAtLevel,
  withContextLocation,
} from '../src/learning/infrastructure/context.ts'
import type { ContextSelection } from '../src/learning/infrastructure/context'
const issue = (
  id: string,
  applied = false,
  inputs: Record<string, number> = {},
): ContextSelection => ({
  kind: 'issue',
  view: {
    ...defaultIssueView(),
    stage: hotIssues.findIndex((i) => i.id === id),
    applied,
    inputs: {
      ...defaultIssueInputs(hotIssues.find((i) => i.id === id)!.id),
      ...inputs,
    },
  },
})
const colors = (mesh: THREE.InstancedMesh) =>
  Array.from({ length: mesh.count }, (_, i) => {
    const c = new THREE.Color()
    mesh.getColorAt(i, c)
    return c.getHexString()
  })

test('every real model and lifecycle recipe connects all four physical levels with bounded native steps', () => {
  const selections: ContextSelection[] = modelExamples.map((m) => ({
    kind: 'model',
    view: {
      id: m.id,
      stage: 0,
      playing: false,
      inputs: defaultExampleInputs(m.id),
    },
  }))
  for (const phase of ['pretrain', 'posttrain', 'inference'] as const)
    for (const method of ['sft', 'dpo', 'grpo'] as const)
      selections.push({
        kind: 'lifecycle',
        view: { ...defaultLifecycleView(phase), method },
      })
  for (const selection of selections) {
    const steps = contextSteps(selection)
    assert.equal(steps.length, 6)
    assert.deepEqual(
      [...new Set(steps.map((s) => s.layer))].sort(),
      [...levels].sort(),
    )
    for (const level of levels) {
      const stage = stageAtLevel(selection, level)
      assert.ok(stage >= 0 && stage < 6)
      assert.equal(steps[stage].layer, level)
      assert.equal(nativeLevel(selection, stage), level)
    }
  }
})

test('all ten issues have distinct, explicit perspectives at every hardware scale and keep their experiment scope', () => {
  for (const topic of hotIssues) {
    const selection = issue(topic.id),
      frames = levels.map((level) => contextAtLevel(selection, level))
    assert.equal(new Set(frames.map((f) => f.heading)).size, 4)
    assert.equal(new Set(frames.map((f) => f.key)).size, 4)
    for (const f of frames) {
      assert.ok(f.explanation.length > 100)
      assert.ok(f.scope)
      assert.equal(f.stage, levels.indexOf(f.layer))
      assert.deepEqual(f.metrics, frames[0].metrics)
      assert.ok(hardwareAnchor(f.layer, f.node).every(Number.isFinite))
    }
  }
  const included = new Set(
    levels.flatMap((l) => issuesAtLevel(l).map((t) => t.issue.id)),
  )
  assert.equal(included.size, 10)
})

test('legacy case links resolve into physical levels and explicit level links choose a compatible model or lifecycle stage', () => {
  assert.equal(
    initialContextLevel('https://x.test/?example=kimi-k3&stage=3'),
    'pod',
  )
  assert.equal(initialContextLevel('https://x.test/?issue=kv-memory'), 'gpu')
  assert.equal(initialContextLevel('https://x.test/?hot=all'), 'fleet')
  const selected = parseContextLocation(
    'https://x.test/?example=kimi-k3&stage=4&level=server',
  )!
  assert.equal(selected.kind, 'model')
  assert.equal(selected.view.stage, 2)
  assert.equal(
    initialContextLevel('https://x.test/?lifecycle=pretrain&level=gpu'),
    'gpu',
  )
  assert.equal(
    parseContextLocation('https://x.test/?examples=all')?.kind,
    'model',
  )
  assert.equal(initialContextLevel('https://x.test/?level=invalid'), 'fleet')
})

test('sharing preserves the existing workspace and project prefix while serializing a server level as server', () => {
  const base = 'https://x.test/AI-Infra/?view=explore&v=build&level=server'
  const model = {
    id: 'qwen-image-21' as const,
    stage: 1,
    playing: false,
    inputs: defaultExampleInputs('qwen-image-21'),
  }
  for (const url of [
    exampleUrl(base, model),
    lifecycleUrl(base, defaultLifecycleView()),
    issueUrl(base, defaultIssueView()),
  ]) {
    assert.equal(new URL(url).searchParams.get('view'), 'explore')
    assert.equal(new URL(url).pathname, '/AI-Infra/')
  }
  const url = withContextLocation(exampleUrl(base, model), 'guide', 'rack')
  assert.equal(new URL(url).searchParams.get('level'), 'server')
  assert.equal(new URL(url).searchParams.get('v'), 'build')
})

test('physical zooming does not substitute generic dense KV sizing into real media and hybrid models', () => {
  for (const m of modelExamples) {
    const view = {
      id: m.id,
      stage: 0,
      playing: false,
      inputs: defaultExampleInputs(m.id),
    }
    const a = contextAtLevel({ kind: 'model', view }, 'fleet'),
      b = contextAtLevel({ kind: 'model', view }, 'gpu')
    assert.deepEqual(a.metrics, b.metrics)
    assert.match(b.boundary, /./)
    if (m.kind !== 'moe') assert.notEqual(b.pattern, 'pages')
  }
})

test('colocated inference has local reads and token flows; full-prompt transfer appears only when explicitly disaggregated', () => {
  const view = defaultLifecycleView('inference')
  view.stage = 4
  const before = contextAtLevel({ kind: 'lifecycle', view }, 'pod'),
    after = contextAtLevel(
      {
        kind: 'lifecycle',
        view: { ...view, inputs: { ...view.inputs, disaggregated: true } },
      },
      'pod',
    )
  assert.equal(before.pattern, 'tokens')
  assert.equal(before.traffic, 'requests')
  assert.equal(after.pattern, 'transfer')
  assert.equal(after.traffic, 'kv')
})

test('KV glyphs are attached to physical HBM, halve under the declared precision assumption, and cap display without changing full bytes', () => {
  const overlay = new ContextOverlay()
  try {
    overlay.update(
      contextAtLevel(issue('kv-memory'), 'gpu'),
      0.2,
      'balanced',
      false,
    )
    assert.equal(overlay.glyphs.count, 64)
    const first = new THREE.Matrix4()
    overlay.glyphs.getMatrixAt(0, first)
    assert.ok(first.elements[12] < -3)
    overlay.update(
      contextAtLevel(issue('kv-memory', true), 'gpu'),
      0.2,
      'balanced',
      false,
    )
    assert.equal(overlay.glyphs.count, 32)
    const max = contextAtLevel(
      issue('kv-memory', false, {
        context: 32768,
        concurrency: 256,
        budget: 40,
      }),
      'gpu',
    )
    overlay.update(max, 0.2, 'balanced', false)
    assert.equal(overlay.glyphs.count, 64)
    assert.equal(max.metrics[0].value, '2.5 TiB')
  } finally {
    overlay.dispose()
  }
})

test('ideal placement changes the eight displayed server slots while conserving free slots across the declared nodes', () => {
  const overlay = new ContextOverlay()
  try {
    const a = contextAtLevel(issue('placement'), 'rack'),
      b = contextAtLevel(issue('placement', true), 'rack')
    assert.equal(a.slots!.filter(Boolean).length, 16)
    assert.equal(b.slots!.filter(Boolean).length, 16)
    overlay.update(a, 0.3, 'balanced', false)
    assert.equal(overlay.glyphs.count, 8)
    const before = colors(overlay.glyphs)
    overlay.update(b, 0.3, 'balanced', false)
    const after = colors(overlay.glyphs)
    assert.equal(before.filter((c) => c === after[0]).length, 4)
    assert.equal(new Set(after).size, 1)
  } finally {
    overlay.dispose()
  }
})

test('distinct top-2 routing preserves expected logical visits and adds a compatible physical hot-expert replica', () => {
  const a = contextAtLevel(issue('moe'), 'pod'),
    b = contextAtLevel(issue('moe', true), 'pod')
  assert.equal(a.count, 16)
  assert.equal(b.count, 17)
  const total = (values: number[]) => values.reduce((x, y) => x + y, 0)
  assert.ok(Math.abs(total(a.values!) - 2) < 1e-10)
  assert.ok(Math.abs(total(b.values!) - 2) < 1e-10)
  assert.equal(b.values![0], a.values![0] / 2)
})

test('speculative tints encode prefix survival and sixteen tenant scopes retain distinct colors', () => {
  const overlay = new ContextOverlay()
  try {
    for (const acceptance of [0, 50, 100]) {
      overlay.update(
        contextAtLevel(issue('reasoning', true, { acceptance }), 'gpu'),
        0.3,
        'balanced',
        false,
      )
      const c = colors(overlay.glyphs)
      assert.equal(c.length, 5)
      assert.equal(
        new Set(c).size,
        acceptance === 0 ? 2 : acceptance === 100 ? 1 : 5,
      )
    }
    overlay.update(
      contextAtLevel(issue('isolation', true, { tenants: 16 }), 'gpu'),
      0.3,
      'balanced',
      false,
    )
    assert.equal(new Set(colors(overlay.glyphs)).size, 16)
  } finally {
    overlay.dispose()
  }
})

test('the pipeline schedule colors ranks on the actual eight-slot server and changes from forward to backward at the selected slot', () => {
  const overlay = new ContextOverlay()
  try {
    const v = { ...defaultLifecycleView(), stage: 3 }
    const a = contextAtLevel({ kind: 'lifecycle', view: v }, 'rack')
    assert.equal(a.schedule!.length, 8)
    overlay.update(a, 0.2, 'balanced', false)
    assert.equal(overlay.glyphs.count, 8)
    const before = colors(overlay.glyphs)
    overlay.update(
      contextAtLevel(
        {
          kind: 'lifecycle',
          view: { ...v, inputs: { ...v.inputs, scheduleSlot: 9 } },
        },
        'rack',
      ),
      0.2,
      'balanced',
      false,
    )
    assert.notEqual(colors(overlay.glyphs)[0], before[0])
  } finally {
    overlay.dispose()
  }
})

test('a one-GPU training job leaves the other seven reference server slots idle', () => {
  const view = defaultLifecycleView()
  const frame = contextAtLevel(
    {
      kind: 'lifecycle',
      view: {
        ...view,
        stage: 3,
        inputs: { ...view.inputs, dp: 1, tp: 1, pp: 1 },
      },
    },
    'rack',
  )
  assert.equal(frame.schedule!.length, 8)
  assert.ok(frame.schedule![0].some((value) => value !== 0))
  assert.ok(
    frame.schedule!.slice(1).every((row) => row.every((value) => value === 0)),
  )
})

test('one annotation layer is reused across stories and disposes shared geometry exactly once', () => {
  const overlay = new ContextOverlay(),
    scene = new THREE.Scene()
  scene.add(overlay.group)
  let disposed = 0
  overlay.glyphs.geometry.addEventListener('dispose', () => disposed++)
  overlay.update(
    contextAtLevel(issue('precision', true), 'gpu'),
    0.2,
    'balanced',
    false,
  )
  assert.equal(overlay.metadata.count, 8)
  const group = overlay.group
  overlay.update(
    contextAtLevel(issue('rl', true), 'pod'),
    0.2,
    'balanced',
    false,
  )
  assert.equal(group, overlay.group)
  assert.equal(overlay.metadata.userData.role, 'policy-publication')
  assert.equal(overlay.metadata.count, 4)
  overlay.dispose()
  assert.equal(disposed, 1)
  assert.equal(overlay.group.parent, null)
})

test('local cache reads remain inside one worker while MoE dispatch/combine starts and ends on actual worker bays', () => {
  const overlay = new ContextOverlay()
  const lines = () =>
    overlay.group.children.flatMap((child) =>
      child instanceof THREE.Group
        ? (child.children.filter(
            (o) => o instanceof THREE.Line,
          ) as THREE.Line[])
        : [],
    )
  const endpoints = (line: THREE.Line) => {
    const p = line.geometry.getAttribute('position')
    return [
      [p.getX(0), p.getY(0), p.getZ(0)],
      [p.getX(p.count - 1), p.getY(p.count - 1), p.getZ(p.count - 1)],
    ]
  }
  try {
    overlay.update(
      contextAtLevel(issue('kv-memory'), 'pod'),
      0.1,
      'balanced',
      false,
    )
    let routes = lines()
    assert.equal(routes.length, 1)
    let [a, b] = endpoints(routes[0])
    assert.ok(a[0] < -4 && b[0] < -4)
    overlay.update(
      contextAtLevel(issue('disaggregation'), 'pod'),
      0.1,
      'balanced',
      false,
    )
    routes = lines()
    ;[a, b] = endpoints(routes[0])
    assert.ok(a[0] < 0 && b[0] > 0)
    overlay.update(contextAtLevel(issue('moe'), 'pod'), 0.1, 'balanced', false)
    routes = lines()
    assert.equal(routes.length, 16)
    for (const route of routes) {
      const [from, to] = endpoints(route)
      assert.ok(from[1] > 3 && to[1] > 3)
    }
    assert.equal(overlay.packets.count, 48)
  } finally {
    overlay.dispose()
  }
})
