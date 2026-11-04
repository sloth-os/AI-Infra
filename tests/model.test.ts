import test from 'node:test'
import assert from 'node:assert/strict'
import { defaults, kvBytes, simulate } from '../src/model.ts'

test('KV dimensions reproduce 640 MiB for a 2,048-token GQA prompt', () => {
  assert.equal(kvBytes(1), 327680)
  assert.equal(kvBytes(2048) / 2 ** 20, 640)
})

test('100k GPUs become 12,500 TP=8 replicas with a conserved memory budget', () => {
  const r = simulate(defaults, 'continuous')
  assert.equal(r.replicas, 12500)
  assert.equal(r.weightGB, 140)
  assert.equal(r.cacheBudgetGB + r.weightGB + 48, 640)
  assert.equal(r.prefillReplicas + r.decodeReplicas, r.replicas)
  assert.ok(r.stable)
})

test('saturation produces no finite steady-state latency', () => {
  const r = simulate({ ...defaults, arrivalRate: 50000 }, 'continuous')
  assert.equal(r.stable, false)
  assert.equal(r.ttftMs, Infinity)
  assert.equal(r.queueMs, Infinity)
})

test('adding replicas scales capacity; output throughput is bounded by capacity', () => {
  const baseline = simulate(defaults, 'continuous')
  const half = simulate({ ...defaults, gpus: 50000 }, 'continuous')
  assert.equal(baseline.capacity, half.capacity * 2)
  const saturated = simulate({ ...defaults, arrivalRate: 50000 }, 'continuous')
  assert.equal(saturated.outputTPS, saturated.capacity * defaults.outputTokens)
})

test('long contexts consume more KV and clamp active batches to memory capacity', () => {
  const short = simulate(defaults, 'continuous')
  const long = simulate(
    { ...defaults, inputTokens: 32768, outputTokens: 2048, batchSize: 256 },
    'continuous',
  )
  assert.ok(long.cacheGB > short.cacheGB)
  assert.ok(long.batch < 256)
  assert.ok(long.batch * long.cacheGB <= long.cacheBudgetGB)
})

test('faster networking helps handoff, but does not change colocated serving', () => {
  const slow = { ...defaults, networkGbps: 25 }
  const fast = { ...defaults, networkGbps: 400 }
  assert.equal(
    simulate(slow, 'disaggregated').transferMs,
    simulate(fast, 'disaggregated').transferMs * 16,
  )
  assert.equal(simulate(slow, 'continuous').transferMs, 0)
  assert.equal(
    simulate(slow, 'continuous').ttftMs,
    simulate(fast, 'continuous').ttftMs,
  )
  assert.ok(Math.abs(simulate(fast, 'disaggregated').transferMs - 19.17) < 0.1)
})

test('prefix reuse saves prefill compute but still requires full KV state', () => {
  const r = simulate({ ...defaults, prefixHit: 80 }, 'continuous')
  const baseline = simulate(defaults, 'continuous')
  assert.ok(r.prefillService < baseline.prefillService)
  assert.equal(r.cacheGB, baseline.cacheGB)
  assert.ok(r.capacity > baseline.capacity)
})

test('split pools are limited by the weaker phase', () => {
  const r = simulate({ ...defaults, prefillShare: 90 }, 'disaggregated')
  assert.equal(
    r.capacity,
    Math.min(
      r.prefillReplicas / r.prefillService,
      r.decodeReplicas / r.decodeService,
    ),
  )
})
