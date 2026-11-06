import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CAMPAIGN_LEVELS,
  CAMPAIGN_PHASES,
  DECISIONS,
  LEVEL_LESSONS,
} from '../src/game/campaign/catalog.ts'
import {
  advanceOperation,
  contractState,
  createOperation,
  earnedProgress,
  operationMetrics,
  operationReducer,
  readCampaignProgress,
} from '../src/game/campaign/model.ts'
import type { OperationState } from '../src/game/campaign/model'
import { campaignFrame } from '../src/game/campaign/scene.ts'
import { lifecycleSources } from '../src/lifecycle/catalog.ts'
import { kvPerToken } from '../src/lifecycle/model.ts'
import * as THREE from 'three'
import { ContextOverlay } from '../src/scene/context.ts'

function choose(s: OperationState, decision: string, option: string) {
  const next = operationReducer(s, { type: 'choose', decision, option })
  assert.equal(next.config[decision], option, next.feedback)
  return next
}
function run(
  s: OperationState,
  until: (state: OperationState) => boolean,
  limit = 200,
) {
  let state = operationReducer(s, { type: 'run' })
  for (
    let i = 0;
    i < limit * 10 && state.status === 'running' && !until(state);
    i++
  )
    state = advanceOperation(state, 0.1)
  return state
}
function prepared(
  phase: OperationState['phase'],
  method: OperationState['method'] = 'grpo',
) {
  let s = createOperation(phase, method)
  for (const level of CAMPAIGN_LEVELS)
    s = operationReducer(s, { type: 'visit', level })
  const selections =
    phase === 'pretrain'
      ? [
          ['state', 'zero2'],
          ['microbatches', '8'],
          ['packing', 'packed'],
          ['kernel', 'fused'],
        ]
      : phase === 'posttrain'
        ? [
            ['state', 'lora'],
            ['objective', 'valid'],
            ['freshness', 'gated'],
            ['packing', 'packed'],
            method === 'grpo' ? ['roles', '4'] : ['overlap', 'overlap'],
          ]
        : [
            ['routing', 'prefix'],
            ['serving', 'chunked'],
            ['batching', 'continuous'],
            ['batch', '32'],
            ['kernel', 'fused'],
          ]
  for (const [id, option] of selections) s = choose(s, id, option)
  return s
}

test('all twelve level contracts have real interventions, valid sources and hardware-native scene mappings', () => {
  for (const phase of CAMPAIGN_PHASES)
    for (const level of CAMPAIGN_LEVELS) {
      assert.equal(DECISIONS[phase].filter((d) => d.level === level).length, 2)
      assert.ok(
        LEVEL_LESSONS[phase][level].sources.every((id) => lifecycleSources[id]),
      )
      const frame = campaignFrame(createOperation(phase), level)
      assert.equal(frame.layer, level)
      assert.equal(frame.kind, 'lifecycle')
      assert.ok(frame.payload.length > 20)
      assert.ok(frame.scope.includes('game'))
    }
})
test('camera visits and purchased toggles cannot award contracts; only completed, admissible work can', () => {
  const s = prepared('pretrain')
  assert.equal(s.cycles, 0)
  assert.deepEqual(earnedProgress(s), {})
  assert.ok(CAMPAIGN_LEVELS.every((l) => !contractState(s, l).done))
  const blocked = run(
    createOperation('pretrain'),
    (state) => state.cycles > 0,
    10,
  )
  assert.equal(blocked.cycles, 0)
  assert.equal(blocked.produced, 0)
  assert.ok(blocked.idle > 9)
  assert.match(blocked.feedback, /HBM blocked/)
})
test('a real strategy earns all twelve contracts and improves actual simulated completion time', () => {
  for (const phase of CAMPAIGN_PHASES) {
    let s = prepared(phase)
    if (phase === 'pretrain') {
      s = run(s, (state) => state.cycles === 1)
      assert.equal(s.cycles, 1)
      s = choose(s, 'network', '400')
      assert.equal(s.status, 'paused')
    }
    s = run(s, (state) => state.status === 'won')
    assert.equal(s.status, 'won', `${phase}: ${s.feedback}`)
    assert.ok(s.produced > 0)
    assert.equal(Object.keys(earnedProgress(s)).length, 4)
    assert.ok(CAMPAIGN_LEVELS.every((level) => s.evidence[level] === 2))
    assert.ok(s.credits >= 0)
    assert.ok(s.time < 240)
  }
})
test('SFT, DPO and GRPO have different executable paths and can all complete post-training', () => {
  for (const method of ['sft', 'dpo', 'grpo'] as const) {
    const initial = prepared('posttrain', method),
      m = operationMetrics(initial)
    const finished = run(initial, (state) => state.status === 'won')
    assert.equal(finished.status, 'won', `${method}: ${finished.feedback}`)
    assert.equal(finished.produced, 2)
    assert.ok(
      m.stages.some((stage) =>
        stage.payload.includes(
          method === 'sft'
            ? 'assistant'
            : method === 'dpo'
              ? 'reference'
              : 'advantages',
        ),
      ),
    )
  }
})
test('invalid objectives consume work without producing updates, while stale online samples are rejected after the first version', () => {
  let s = choose(createOperation('posttrain'), 'state', 'lora')
  const invalid = run(s, (state) => state.rejected >= 2)
  assert.equal(invalid.produced, 0)
  assert.equal(invalid.cycles, 0)
  assert.equal(invalid.rejected, 2)
  assert.ok(operationMetrics(invalid).advantages.every((x) => x === 0))
  assert.deepEqual(earnedProgress(invalid), {})
  s = choose(s, 'objective', 'valid')
  const stale = run(s, (state) => state.rejected >= 1)
  assert.equal(stale.cycles, 1)
  assert.equal(stale.policyVersion, 1)
  assert.match(stale.feedback, /stale/)
  const offline = run({ ...s, method: 'sft' }, (state) => state.cycles >= 3)
  assert.equal(offline.cycles, 3)
  assert.equal(
    offline.rejected,
    0,
    'offline SFT must not inherit the on-policy version constraint',
  )
})
test('state sharding changes residency and wire volume; fixed-batch microbatching exposes a real bubble trade-off', () => {
  const s = createOperation('pretrain'),
    base = operationMetrics(s)
  const zero2 = operationMetrics(s, {
    ...s.config,
    state: 'zero2',
    microbatches: '8',
  })
  const zero3 = operationMetrics(s, {
    ...s.config,
    state: 'zero3',
    microbatches: '8',
  })
  assert.ok(base.residentGiB > 80)
  assert.ok(zero2.residentGiB < 80)
  assert.ok(zero3.residentGiB < zero2.residentGiB)
  assert.ok(zero3.wireBytes > zero2.wireBytes)
  assert.equal(base.usefulTokens, zero2.usefulTokens)
  assert.ok(zero2.bubble < base.bubble)
  const recomputed = operationMetrics(s, {
    ...s.config,
    state: 'zero2',
    microbatches: '8',
    recompute: 'recompute',
  })
  assert.ok(recomputed.residentGiB < zero2.residentGiB)
  assert.ok(recomputed.computeSeconds > zero2.computeSeconds)
})
test('split serving conserves cohort wire bytes across replicas and KV precision changes admission rather than creating compute', () => {
  const s = createOperation('inference'),
    c = { ...s.config, batch: '64', serving: 'split' }
  const one = operationMetrics(s, c),
    four = operationMetrics(s, { ...c, replicas: '4' })
  assert.equal(one.wireBytes, kvPerToken('70b') * 16384 * 64)
  assert.equal(four.wireBytes, one.wireBytes * 4)
  assert.equal(four.allocatedGPUs, 64)
  assert.equal(operationMetrics(s).wireBytes, 0)
  assert.equal(operationMetrics(s, { ...c, serving: 'chunked' }).wireBytes, 0)
  assert.ok(one.blocked)
  const quantized = operationMetrics(s, { ...c, precision: '8' })
  assert.equal(quantized.blocked, null)
  assert.ok(Math.abs(quantized.kvGiB / one.kvGiB - 0.505) < 1e-10)
  assert.equal(quantized.computeSeconds, one.computeSeconds)
})
test('replanning preserves committed work, pause freezes all progress, and baseline configurations can be revisited without a second charge', () => {
  let s = run(prepared('inference'), (state) => state.cycles === 1)
  s = operationReducer(s, { type: 'pause' })
  assert.equal(advanceOperation(s, 100), s)
  assert.equal(advanceOperation(s, Infinity), s)
  const before = s.credits,
    produced = s.produced
  s = choose(s, 'batching', 'static')
  s = choose(s, 'batching', 'continuous')
  assert.equal(s.credits, before)
  assert.equal(s.produced, produced)
  assert.equal(s.progress, 0)
  const rejected = operationReducer(
    { ...s, credits: 0 },
    { type: 'choose', decision: 'replicas', option: '4' },
  )
  assert.equal(rejected.config.replicas, '1')
  assert.equal(rejected.credits, 0)
})
test('the recovery drill restores durable model and optimizer progress and loses only unsaved work', () => {
  let s = createOperation('pretrain')
  for (const [id, option] of [
    ['state', 'zero2'],
    ['microbatches', '8'],
    ['checkpoint', 'periodic'],
  ])
    s = choose(s, id, option)
  s = run(s, (state) => state.cycles >= 3)
  assert.equal(s.cycles, 3)
  assert.equal(s.checkpoint, 2)
  s = operationReducer(s, { type: 'fault' })
  assert.equal(s.cycles, 2)
  assert.equal(s.produced, 2)
  assert.equal(s.status, 'paused')
  assert.match(s.feedback, /Lost 1 unsaved update/)
})
test('progress storage accepts only valid phase/level medals', () => {
  assert.deepEqual(
    readCampaignProgress(
      '{"pretrain:fleet":3,"inference:gpu":2,"posttrain:pod":-1,"pretrain:gpu":999,"hacked":3}',
    ),
    { 'pretrain:fleet': 3, 'inference:gpu': 2 },
  )
  assert.deepEqual(readCampaignProgress('null'), {})
  assert.deepEqual(readCampaignProgress('not json'), {})
})

test('3D packing and HBM glyphs change with useful data density and actual residency', () => {
  const baseline = createOperation('pretrain'),
    optimized = prepared('pretrain')
  const before = campaignFrame(baseline, 'fleet'),
    after = campaignFrame(optimized, 'fleet')
  assert.equal(before.values!.filter(Boolean).length, 18)
  assert.equal(after.values!.filter(Boolean).length, 30)
  const large = campaignFrame(baseline, 'gpu'),
    fitted = campaignFrame(optimized, 'gpu')
  assert.equal(large.node, 'hbm')
  assert.equal(large.count, 64)
  assert.ok(fitted.count < 32)
  assert.ok(fitted.payload.includes('80 GiB'))
  const offline = createOperation('posttrain', 'sft'),
    rejected = operationReducer(offline, {
      type: 'choose',
      decision: 'roles',
      option: '4',
    })
  assert.equal(rejected.credits, offline.credits)
  assert.equal(rejected.config.roles, '2')
})

test('prefix ownership is earned by completed compatible work and is released when prefix retention is disabled', () => {
  const cold = run(createOperation('inference'), (state) => state.cycles === 1)
  assert.equal(cold.warm, false)
  let s = choose(cold, 'routing', 'prefix')
  assert.equal(s.warm, false)
  s = run(s, (state) => state.cycles === 2)
  assert.equal(s.warm, true)
  const expanded = choose(s, 'replicas', '2')
  assert.equal(
    expanded.warm,
    false,
    'new placements must warm their own compatible prefixes',
  )
  const retained = operationMetrics(s).kvGiB
  s = choose(s, 'routing', 'round')
  assert.equal(s.warm, false)
  assert.ok(operationMetrics(s).kvGiB < retained)
})

test('improving execution completes the same inference work sooner, without a larger batch or fabricated requests', () => {
  const baseline = run(
    createOperation('inference'),
    (state) => state.cycles === 1,
  )
  let configured = createOperation('inference')
  configured = choose(configured, 'batching', 'continuous')
  configured = choose(configured, 'serving', 'chunked')
  configured = choose(configured, 'kernel', 'fused')
  configured = run(configured, (state) => state.cycles === 1)
  assert.equal(configured.produced, baseline.produced)
  assert.equal(configured.produced, 8)
  assert.ok(configured.time < baseline.time * 0.6)
})

test('an operation cannot execute work beyond its finite game deadline', () => {
  const s = {
    ...createOperation('inference'),
    status: 'running' as const,
    time: 239.95,
  }
  const ended = advanceOperation(s, 2)
  assert.equal(ended.time, 240)
  assert.equal(ended.status, 'lost')
  assert.equal(ended.produced, 0)
})

test('post-training peak activations follow the global batch divided among learners and preserve the sampler-memory trade-off', () => {
  const s = createOperation('posttrain'),
    base = operationMetrics(s, { ...s.config, state: 'lora' }),
    moreSamplers = operationMetrics(s, {
      ...s.config,
      state: 'lora',
      roles: '6',
    })
  assert.ok(Math.abs(moreSamplers.residentGiB - base.residentGiB - 15) < 1e-9)
  assert.equal(moreSamplers.usefulTokens, base.usefulTokens)
  const full = operationMetrics(s, {
    ...s.config,
    state: 'sharded',
    roles: '6',
  })
  const accumulated = operationMetrics(s, {
    ...s.config,
    state: 'sharded',
    roles: '6',
    accumulation: '4',
  })
  assert.ok(full.blocked)
  assert.equal(accumulated.blocked, null)
})

test('rollout and learner allocations color eight actual pod worker bays instead of drawing an MoE topology', () => {
  const s = choose(createOperation('posttrain'), 'roles', '4'),
    frame = campaignFrame(s, 'pod'),
    overlay = new ContextOverlay()
  try {
    assert.equal(frame.pattern, 'rollouts')
    overlay.update(frame, 0, 'balanced', false)
    assert.equal(overlay.glyphs.count, 8)
    const positions = new Set<string>(),
      colors: string[] = []
    for (let i = 0; i < 8; i++) {
      const matrix = new THREE.Matrix4(),
        color = new THREE.Color()
      overlay.glyphs.getMatrixAt(i, matrix)
      overlay.glyphs.getColorAt(i, color)
      positions.add(
        new THREE.Vector3().setFromMatrixPosition(matrix).toArray().join(','),
      )
      colors.push(color.getHexString())
    }
    assert.equal(positions.size, 8)
    assert.equal(new Set(colors).size, 2)
    assert.equal(colors.filter((color) => color === colors[0]).length, 4)
  } finally {
    overlay.dispose()
  }
})
