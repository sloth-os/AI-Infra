import test from 'node:test'
import assert from 'node:assert/strict'
import { layerNodes } from '../src/content.ts'
import { defaults, kvBytes, simulate } from '../src/model.ts'
import { getMotionFrame } from '../src/motion.ts'
import {
  adjacentJourneyStage,
  collectiveTime,
  conceptWorld,
  journeyPayload,
  journeyScene,
  learningScenarioUrl,
  pinLearningCard,
} from '../src/learning/model.ts'

test('spatial explanations clear the desktop rails and remain stable as their world anchors move', () => {
  const first = pinLearningCard(null, 'scheduler', 600, 500, 1440, 1000, 420)
  assert.equal(first.x, 1044)
  const moved = pinLearningCard(first, 'scheduler', 900, 400, 1440, 1000, 420)
  assert.equal(moved.x, first.x)
  assert.equal(moved.y, first.y)
  assert.notEqual(moved.tetherLength, first.tetherLength)
  const rightSubject = pinLearningCard(
    null,
    'decode',
    1100,
    500,
    1440,
    1000,
    420,
  )
  assert.equal(rightSubject.x, 320)
  const highSubject = pinLearningCard(
    null,
    'prefill',
    640,
    140,
    1440,
    1000,
    420,
  )
  assert.ok(highSubject.y >= 182)
  const phone = pinLearningCard(first, 'scheduler', 195, 400, 390, 844, 430)
  assert.ok(phone.x >= 14 && phone.x + phone.width <= 376)
  assert.ok(phone.y + 430 <= 844 - 168)
})

test('every request stage selects a real component and the appropriate 3D transformation', () => {
  for (let i = 0; i < 7; i++) {
    const scene = journeyScene(i)
    assert.ok(layerNodes[scene.layer].includes(scene.node))
    assert.ok(scene.time >= 0 && scene.time <= 48)
  }
  assert.equal(journeyScene(3).traffic, 'tensors')
  assert.equal(journeyScene(3).layer, 'gpu')
  const handoff = journeyScene(4),
    frame = getMotionFrame(handoff.time, handoff.traffic, defaults)
  assert.equal(handoff.layer, 'pod')
  assert.equal(frame.chapterIndex, 2)
  assert.equal(frame.cacheMiB, 640)
  assert.equal(frame.shardMiB, 80)
  assert.equal(journeyScene(99).node, 'gateway')
  assert.equal(journeyScene(NaN).node, 'gateway')
})

test('optional retrieval is skipped in both directions without skipping generation stages', () => {
  const steps = [0]
  while (steps.at(-1)! < 6)
    steps.push(adjacentJourneyStage(steps.at(-1)!, 1, false))
  assert.deepEqual(steps, [0, 2, 3, 4, 5, 6])
  assert.equal(adjacentJourneyStage(2, -1, false), 0)
  assert.equal(adjacentJourneyStage(0, 1, true), 1)
  assert.equal(adjacentJourneyStage(6, 1, true), 6)
})

test('ring exchange controls land on the exact snapshot used by the 3D ranks', () => {
  for (let step = 0; step <= 14; step++)
    assert.equal(
      getMotionFrame(collectiveTime(step), 'collectives', defaults)
        .collectiveStep,
      step,
    )
  const complete = getMotionFrame(collectiveTime(14), 'collectives', defaults)
  assert.ok(complete.buffers.every((row) => row.every((value) => value === 36)))
  assert.ok(
    complete.contributions.every((row) => row.every((value) => value === 8)),
  )
})

test('concept navigation preserves the distinction between replica, pipeline and expert parallelism', () => {
  assert.deepEqual(conceptWorld('Data parallelism (DP)'), {
    layer: 'fleet',
    traffic: 'requests',
    node: 'scheduler',
  })
  assert.deepEqual(conceptWorld('Expert parallelism (EP)'), {
    layer: 'pod',
    traffic: 'requests',
    node: 'fabric',
  })
  assert.deepEqual(conceptWorld('Pipeline parallelism (PP)'), {
    layer: 'rack',
    traffic: 'requests',
    node: 'fabric',
  })
  assert.deepEqual(conceptWorld('Tensor parallelism (TP)'), {
    layer: 'rack',
    traffic: 'collectives',
    node: 'nvlink',
  })
  assert.deepEqual(conceptWorld('Embedding'), {
    layer: 'gpu',
    traffic: 'tensors',
    node: 'tensor',
  })
  assert.deepEqual(conceptWorld('All-to-all'), {
    layer: 'pod',
    traffic: 'requests',
    node: 'fabric',
  })
  assert.deepEqual(conceptWorld('Prefix caching'), {
    layer: 'gpu',
    traffic: 'kv',
    node: 'hbm',
  })
})

test('shared learning scenarios preserve the Pages path, workspace and all model inputs', () => {
  const p = { ...defaults, inputTokens: 4096, networkGbps: 25, gpus: 32000 }
  const url = new URL(
    learningScenarioUrl(
      'https://sloth-os.github.io/AI-Infra/?view=explore&v=abc',
      p,
      'disaggregated',
    ),
  )
  assert.equal(url.pathname, '/AI-Infra/')
  assert.equal(url.searchParams.get('learn'), 'fusion')
  assert.equal(url.searchParams.get('view'), 'lab')
  assert.equal(url.searchParams.get('strategy'), 'disaggregated')
  for (const [key, value] of Object.entries(p))
    assert.equal(Number(url.searchParams.get(key)), value)
  assert.equal(p.inputTokens, 4096)
})

test('the 3D load frame uses the selected serving strategy while KV dimensions remain identical', () => {
  const a = getMotionFrame(25, 'kv', defaults, 'continuous'),
    b = getMotionFrame(25, 'kv', defaults, 'disaggregated')
  assert.equal(a.load, simulate(defaults, 'continuous').utilization)
  assert.equal(b.load, simulate(defaults, 'disaggregated').utilization)
  assert.notEqual(a.load, b.load)
  assert.equal(a.cacheMiB, b.cacheMiB)
  assert.equal(a.transferMs, b.transferMs)
})

test('local request payloads retain the prompt and derive handoff bytes from the experiment', () => {
  const prompt = 'A "quoted" prompt\n<script>example</script>'
  assert.equal(
    JSON.parse(journeyPayload(0, prompt, defaults)).messages[0].content,
    prompt,
  )
  const p = { ...defaults, inputTokens: 4096 },
    payload = JSON.parse(journeyPayload(4, prompt, p))
  assert.equal(payload.total_bytes, kvBytes(4096))
  assert.equal(payload.prompt_tokens, 4096)
  assert.equal(payload.sharding, '8 TP ranks')
})
