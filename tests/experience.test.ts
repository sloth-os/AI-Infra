import test from 'node:test'
import assert from 'node:assert/strict'
import {
  shouldWelcome,
  parseLesson,
  requestRecap,
  trainingRecap,
  operationDeltas,
  operationRecap,
  providerRecap,
} from '../src/learning/experience/model.ts'
import {
  changeProviderPlan,
  defaultProviderLesson,
  providerReplay,
  replaySnapshot,
} from '../src/learning/provider/model.ts'
import {
  createOperation,
  operationMetrics,
  operationReducer,
} from '../src/game/campaign/model.ts'
import {
  defaultLifecycleInputs,
  stateBytes,
  shapes,
} from '../src/lifecycle/model.ts'

test('beginner entry respects returning visitors and explicit destinations', () => {
  const root = 'https://sloth-os.github.io/AI-Infra/'
  assert.equal(shouldWelcome(root, false), true)
  assert.equal(shouldWelcome(`${root}?verify=123`, false), true)
  assert.equal(shouldWelcome(root, true), false)
  for (const q of [
    'view=journey',
    'scenario=cloud-provider',
    'operation=inference',
    'provider=cloud',
    'gpus=800',
    'ui=classic',
    'lesson=request',
  ])
    assert.equal(shouldWelcome(`${root}?${q}`, false), false, q)
  assert.equal(parseLesson('cloud'), 'cloud')
  assert.equal(parseLesson('unknown'), null)
})

test('policy edits compare at the existing clock, pause, and clamp only to the new horizon', () => {
  const original = {
    ...defaultProviderLesson(),
    time: 12,
    side: 'baseline' as const,
    playing: true,
  }
  const edited = changeProviderPlan(original, 0)
  assert.equal(edited.time, 12)
  assert.equal(edited.side, 'plan')
  assert.equal(edited.playing, false)
  assert.equal(original.policies, 255)
  assert.equal(original.playing, true)
  const snapshot = replaySnapshot(edited)
  assert.equal(snapshot.baseline.time, snapshot.plan.time)
  assert.equal(snapshot.time, 12)
  const clamped = changeProviderPlan({ ...original, time: 55 }, 255)
  assert.equal(clamped.time, providerReplay(255).end)
  assert.equal(changeProviderPlan({ ...original, time: NaN }, 255).time, 0)
})

test('intervention feedback reflects calculated memory admission and does not claim completed work', () => {
  const before = createOperation('pretrain')
  const after = operationReducer(before, {
    type: 'choose',
    decision: 'state',
    option: 'zero3',
  })
  const a = operationMetrics(before),
    b = operationMetrics(after)
  assert.ok(a.blocked)
  assert.equal(b.blocked, null)
  const deltas = operationDeltas('pretrain', a, b)
  assert.deepEqual(deltas[2], {
    label: 'Admissible configuration',
    before: 'No',
    after: 'Yes',
  })
  assert.equal(after.produced, 0)
  const recap = operationRecap(after, b, a)
  assert.match(recap.outcome, /0 updates committed/)
  assert.ok(recap.changes.some((c) => /Server:.*ZeRO/i.test(c)))
  assert.match(recap.tradeoff, /exchanges more state/)
})

test('Cloud lesson recaps use the actual paired baseline and observed completion counters', () => {
  const replay = providerReplay(255),
    plan = replay.plan.at(-1)!,
    baseline = replay.baseline.at(-1)!
  const recap = providerRecap(plan, baseline)
  assert.equal(recap.deltas[1].before, String(baseline.served))
  assert.ok(baseline.served > 0)
  assert.equal(recap.deltas[1].after, String(plan.served))
  assert.equal(recap.deltas[2].before, String(baseline.oom))
  assert.match(
    recap.outcome,
    new RegExp(`${plan.completed.train} training jobs`),
  )
  assert.equal(recap.correct, 0)
  assert.match(recap.tradeoff, /occupancy alone/)
})

test('training and request reflections preserve the boundary between sizing, walking and execution', () => {
  const inputs = { ...defaultLifecycleInputs, sharding: 'zero3' as const }
  const recap = trainingRecap(inputs)
  assert.match(recap.outcome, /No training update was executed/)
  assert.match(recap.scope, /model state only/)
  assert.ok(
    stateBytes(
      shapes[inputs.shape].parameters,
      inputs.dp,
      inputs.tp,
      inputs.pp,
      inputs.sharding,
    ) <
      80 * 2 ** 30,
  )
  assert.notEqual(recap.deltas[0].before, recap.deltas[0].after)
  const request = requestRecap(3, 6)
  assert.match(request.outcome, /3 of 6 request stages visited/)
  assert.match(request.explanation, /colocated decode/)
})
