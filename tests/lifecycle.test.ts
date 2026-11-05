import test from 'node:test'
import assert from 'node:assert/strict'
import {
  lifecyclePhases,
  lifecycleSources,
  lifecycleStages,
} from '../src/lifecycle/catalog.ts'
import {
  defaultLifecycleInputs,
  defaultLifecycleView,
  dpoLoss,
  groupAdvantages,
  kvPerToken,
  lifecycleMetrics,
  lifecycleUrl,
  parseLifecycleLocation,
  pipelineSchedule,
  sanitizeLifecycleInputs,
  stateBytes,
} from '../src/lifecycle/model.ts'

test('training partitions do not multiply examples; the explicit Adam layout is conserved across sharding strategies', () => {
  const m = lifecycleMetrics(defaultLifecycleInputs)
  assert.equal(m.gpus, 64)
  assert.equal(m.sequences, 128)
  assert.equal(m.tokens, 262144)
  assert.equal(m.state, (70e9 * 16) / 64)
  const moreModelRanks = lifecycleMetrics({
    ...defaultLifecycleInputs,
    tp: 8,
    pp: 4,
  })
  assert.equal(moreModelRanks.tokens, m.tokens)
  assert.equal(moreModelRanks.state, m.state / 4)
  for (const mode of ['ddp', 'zero1', 'zero2', 'zero3'] as const) {
    assert.equal(stateBytes(7e9, 1, 2, 2, mode), (7e9 * 16) / 4)
  }
  assert.equal(stateBytes(7e9, 8, 1, 1, 'zero1'), 7e9 * (4 + 12 / 8))
  assert.equal(stateBytes(7e9, 8, 1, 1, 'zero2'), 7e9 * (2 + 14 / 8))
  assert.equal(
    lifecycleMetrics({ ...defaultLifecycleInputs, dp: 1 }).gradRing,
    0,
  )
  assert.equal(m.gradRing, ((2 * 7) / 8) * ((70e9 * 2) / 8))
  assert.equal(m.checkpoint / m.servingWeights, 8)
})

test('the GPipe toy schedules each microbatch forward and backward exactly once on each stage with causal dependencies', () => {
  for (const stages of [1, 2, 4, 8])
    for (const batches of [1, 3, 8, 64]) {
      const schedule = pipelineSchedule(stages, batches)
      let idle = 0
      for (let s = 0; s < stages; s++) {
        const row = schedule[s]
        idle += row.filter((c) => c.kind === 'idle').length
        for (let m = 0; m < batches; m++) {
          const f = row.findIndex(
            (c) => c.kind === 'forward' && c.microbatch === m,
          )
          const b = row.findIndex(
            (c) => c.kind === 'backward' && c.microbatch === m,
          )
          assert.ok(f >= 0 && b > f)
          assert.equal(
            row.filter((c) => c.kind === 'forward' && c.microbatch === m)
              .length,
            1,
          )
          assert.equal(
            row.filter((c) => c.kind === 'backward' && c.microbatch === m)
              .length,
            1,
          )
          if (s > 0)
            assert.ok(
              schedule[s - 1].findIndex(
                (c) => c.kind === 'forward' && c.microbatch === m,
              ) < f,
            )
          if (s + 1 < stages)
            assert.ok(
              schedule[s + 1].findIndex(
                (c) => c.kind === 'backward' && c.microbatch === m,
              ) < b,
            )
        }
      }
      assert.equal(
        idle / (stages * schedule[0].length),
        (stages - 1) / (batches + stages - 1),
      )
    }
})

test('LoRA sizing excludes frozen-base optimizer state; GRPO counts generation separately from learner work', () => {
  const m = lifecycleMetrics(defaultLifecycleInputs)
  assert.equal(m.adapterParams, 41943040)
  assert.equal(m.loraState, 140e9 + 16 * 41943040)
  assert.equal(m.rolloutSequences, 64)
  assert.equal(m.rolloutTokens, 16384)
  assert.equal(m.publishFull, 560e9)
  assert.equal(m.publishAdapters, 41943040 * 2 * 4)
  assert.equal(
    lifecycleMetrics({ ...defaultLifecycleInputs, rank: 32 }).adapterParams,
    m.adapterParams * 2,
  )
  assert.deepEqual(groupAdvantages([1, 1, 1, 1]), [0, 0, 0, 0])
  const a = groupAdvantages([0, 0, 1, 1])
  assert.ok(a[0] < -0.99 && a[2] > 0.99)
  assert.ok(Math.abs(a.reduce((x, y) => x + y, 0)) < 1e-8)
  assert.deepEqual(groupAdvantages([]), [])
})

test('DPO toy has a stable logistic objective and rewards policy improvement relative to a fixed reference', () => {
  assert.ok(Math.abs(dpoLoss(1, 1, 0.1) - Math.log(2)) < 1e-12)
  assert.ok(dpoLoss(2, 1, 0.1) < dpoLoss(1, 1, 0.1))
  assert.ok(dpoLoss(2, 2, 0.1) > dpoLoss(2, 1, 0.1))
  assert.ok(Number.isFinite(dpoLoss(-10000, 0, 2)))
  assert.equal(dpoLoss(-10000, 0, 2), 20000)
})

test('inference reserves output KV, groups replicas independently and charges network handoff only when requested', () => {
  const m = lifecycleMetrics(defaultLifecycleInputs)
  assert.equal(kvPerToken('70b'), 327680)
  assert.equal(kvPerToken('7b'), 131072)
  assert.equal(m.promptKV, 640 * 2 ** 20)
  assert.equal(m.reservedKV, 45 * 2 ** 30)
  assert.equal(m.replicas, 12500)
  assert.equal(m.handoffBytes, 0)
  assert.equal(m.handoffMs, 0)
  const separated = lifecycleMetrics({
    ...defaultLifecycleInputs,
    disaggregated: true,
  })
  assert.equal(separated.handoffBytes, m.promptKV)
  assert.ok(Math.abs(separated.handoffMs - 19.17396114285714) < 1e-8)
  assert.equal(
    lifecycleMetrics({
      ...defaultLifecycleInputs,
      disaggregated: true,
      network: 200,
    }).handoffMs,
    separated.handoffMs * 2,
  )
  assert.equal(
    lifecycleMetrics({ ...defaultLifecycleInputs, fleet: 3 }).replicas,
    0,
  )
  assert.equal(
    lifecycleMetrics({ ...defaultLifecycleInputs, fleet: 3 }).remainder,
    3,
  )
})

test('lifecycle links round-trip controls with playback stopped and remove incompatible real-model state', () => {
  const view = {
    ...defaultLifecycleView('posttrain'),
    method: 'grpo' as const,
    stage: 4,
    playing: true,
    inputs: {
      ...defaultLifecycleInputs,
      group: 8,
      equalRewards: true,
      tuning: 'full' as const,
    },
  }
  const url = lifecycleUrl(
    'https://example.com/AI-Infra/?example=kimi-k3&stage=2&ex_tokens=100&examples=all&v=abc',
    view,
  )
  const q = new URL(url).searchParams
  for (const key of ['example', 'stage', 'ex_tokens', 'examples'])
    assert.equal(q.has(key), false)
  assert.equal(q.get('v'), 'abc')
  assert.deepEqual(parseLifecycleLocation(url), { ...view, playing: false })
  const invalid = parseLifecycleLocation(
    'https://x.test/?lifecycle=inference&lc_stage=999&lc_tp=3&lc_fleet=-20&lc_prompt=NaN&lc_method=invalid',
  )!
  assert.equal(invalid.stage, 5)
  assert.equal(invalid.inputs.tp, 4)
  assert.equal(invalid.inputs.fleet, 1)
  assert.equal(invalid.inputs.prompt, 2048)
  assert.equal(invalid.method, 'sft')
  assert.equal(parseLifecycleLocation('https://x.test/?lifecycle=other'), null)
  assert.deepEqual(sanitizeLifecycleInputs({}), defaultLifecycleInputs)
})

test('all lifecycle methods have complete six-stage sourced workflows with reachable primary-source identifiers', () => {
  for (const phase of lifecyclePhases)
    for (const method of ['sft', 'dpo', 'grpo'] as const) {
      const stages = lifecycleStages(phase.id, method)
      assert.equal(stages.length, 6)
      for (const stage of stages) {
        assert.ok(
          stage.input &&
            stage.output &&
            stage.compute &&
            stage.memory &&
            stage.traffic &&
            stage.problem &&
            stage.solution &&
            stage.performance,
        )
        assert.ok(stage.sources.length)
        for (const id of stage.sources)
          assert.ok(
            lifecycleSources[id] &&
              new URL(lifecycleSources[id].url).protocol === 'https:',
          )
      }
    }
})
