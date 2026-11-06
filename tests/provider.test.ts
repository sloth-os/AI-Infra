import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceProvider,
  allocated,
  createProvider,
  gpuOwners,
  POLICIES,
  profile,
  providerMetrics,
  providerReducer,
  WINDOW,
} from '../src/game/provider/model.ts'
import type { ProviderState } from '../src/game/provider/model'
import {
  providerFrame,
  inspectLease,
  leaseProgress,
} from '../src/game/provider/scene.ts'
import { contextRole } from '../src/learning/infrastructure/context.ts'
import { ContextOverlay } from '../src/scene/context.ts'
import * as THREE from 'three'

function ready() {
  let s = createProvider()
  for (const policy of POLICIES) s = providerReducer(s, { type: 'buy', policy })
  for (const level of ['fleet', 'pod', 'rack', 'gpu'] as const)
    s = providerReducer(s, { type: 'visit', level })
  return providerReducer(s, { type: 'repack' })
}
function run(s: ProviderState, seconds: number) {
  s = providerReducer(s, { type: 'run' })
  for (let i = 0; i < seconds * 10 && s.status === 'running'; i++)
    s = advanceProvider(s, 0.1)
  return s
}
function invariant(s: ProviderState) {
  const leases = allocated(s),
    claims = leases.flatMap((j) => j.slots.map((slot) => j.server * 8 + slot))
  assert.equal(
    new Set(claims).size,
    claims.length,
    'device claims never overlap',
  )
  assert.ok(claims.every((c) => c >= 0 && c < 64))
  assert.equal(gpuOwners(s).filter(Boolean).length, claims.length)
  for (const j of leases) {
    assert.equal(j.slots.length, j.gpus)
    assert.ok(j.transferred <= j.transferSize + 1e-6)
  }
  for (const entries of s.cache)
    assert.ok(entries.reduce((n, e) => n + e.gib, 0) <= 128)
  for (const rate of providerMetrics(s).wireRates)
    assert.ok(rate <= ((100 * 1e9) / 8 / 2 ** 30) * 0.7 + 1e-6)
  for (let server = 0; server < 8; server++)
    assert.ok(
      leases
        .filter((j) => j.server === server && j.local)
        .reduce((n, j) => n + j.rate, 0) <=
        20 + 1e-6,
    )
}
test('physical fragmentation and per-device envelopes differ from aggregate spare capacity', () => {
  const s = createProvider(),
    m = providerMetrics(s)
  assert.equal(m.free, 48)
  assert.equal(m.emptyServers, 0)
  assert.equal(profile('tune', false).peakGiB, 96)
  assert.equal(profile('tune', true).peakGiB, 56)
  assert.equal(profile('train', true).peakGiB, 72)
  invariant(s)
  const baseline = run(s, 22)
  assert.equal(baseline.completed.train, 0)
  assert.ok(baseline.oom > 0)
  assert.equal(baseline.evidence.gpu, false)
})
test('policies do not move live GPUs, change customer profiles or award completion', () => {
  const s = ready()
  assert.deepEqual(gpuOwners(s), gpuOwners(createProvider()))
  assert.equal(providerMetrics(s).contracts, 0)
  assert.equal(s.jobs[0].peakGiB, 48)
  assert.equal(s.credits, 30)
  assert.equal(s.served, 0)
  assert.equal(advanceProvider(s, 100), s)
})
test('a full provider strategy completes real work, meets the burst target and earns all four physical-level contracts', () => {
  let s = providerReducer(ready(), { type: 'run' })
  for (let i = 0; i < 1200 && s.status === 'running'; i++) {
    s = advanceProvider(s, 0.1)
    invariant(s)
  }
  assert.equal(
    s.status,
    'won',
    JSON.stringify({
      feedback: s.feedback,
      time: s.time,
      evidence: s.evidence,
      completed: s.completed,
      burst: s.burstReady,
      cache: s.cacheHits,
    }),
  )
  assert.ok(s.completed.train >= 2 && s.completed.tune >= 2)
  assert.ok(s.served >= 128)
  assert.ok(s.burstReady !== null && s.burstReady <= 10)
  assert.ok(s.drains >= 4)
  assert.equal(s.oom, 0)
  assert.ok(s.cacheHits > 0 && s.qosGiB >= 32)
  assert.ok(s.leasedGpuSeconds >= s.usefulGpuSeconds)
  assert.ok(s.time < 120)
})
test('replicas remain warm between user cohorts; pause, invalid clocks and reset preserve accounting', () => {
  const s = run(createProvider(), 8)
  assert.ok(s.served >= 128)
  assert.equal(
    s.jobs.filter((j) => j.tenant === 'serve' && j.state === 'running').length,
    8,
  )
  assert.ok(
    s.jobs
      .filter((j) => j.tenant === 'serve')
      .every((j) => j.admitted === 0 && j.transferred === 16),
    'serving weights stay resident across user cohorts',
  )
  const paused = providerReducer(s, { type: 'pause' })
  assert.equal(advanceProvider(paused, 10), paused)
  assert.equal(advanceProvider(s, NaN), s)
  assert.equal(advanceProvider(s, -10), s)
  assert.deepEqual(providerReducer(s, { type: 'reset' }), createProvider())
})

test('rolling repacks never remove the last ready replica from a Pod or teleport existing claims', () => {
  let s = providerReducer(ready(), { type: 'run' })
  const original = s.jobs
    .filter((j) => j.tenant === 'serve')
    .map((j) => [j.id, j.server])
  s = advanceProvider(s, 0.1)
  for (const [id, server] of original)
    assert.equal(s.jobs.find((j) => j.id === id)!.server, server)
  for (let i = 0; i < 100; i++) {
    s = advanceProvider(s, 0.1)
    invariant(s)
    for (const pod of [0, 1])
      assert.ok(
        s.jobs.some(
          (j) =>
            j.tenant === 'serve' &&
            j.state === 'running' &&
            Math.floor(j.server / 4) === pod,
        ),
      )
  }
  assert.ok(s.drains >= 6)
  assert.ok(
    providerMetrics(s).emptyServers > 0 ||
      s.jobs.some((j) => j.tenant === 'train' && j.state !== 'queued'),
  )
})
test('borrowed batch reclaim waits for a durable checkpoint; killing wastes real computed work', () => {
  const results = [true, false].map((safe) => {
    let s = createProvider()
    for (const policy of POLICIES)
      if (policy !== 'headroom' && (safe || policy !== 'checkpoint'))
        s = providerReducer(s, { type: 'buy', policy })
    s = providerReducer(s, { type: 'repack' })
    return run(s, 45)
  })
  assert.ok(results[0].restores > 0)
  assert.equal(results[0].wastedGpuSeconds, 0)
  assert.ok(results[1].wastedGpuSeconds > 0)
  for (const s of results) {
    invariant(s)
    assert.ok(s.burstReady !== null)
    assert.ok(s.completed.train > 0 && s.completed.tune > 0)
  }
})
test('physical annotations conserve claim colors and per-device residency without reusing inference labels', () => {
  const s = createProvider(),
    overlay = new ContextOverlay()
  for (const [level, count] of [
    ['fleet', 64],
    ['pod', 32],
    ['rack', 8],
    ['gpu', 32],
  ] as const) {
    const frame = providerFrame(s, level, 'serve', 0, 0)
    overlay.update(frame, 0, 'high', true)
    assert.equal(overlay.glyphs.count, count)
    assert.ok(
      contextRole('gateway', frame)?.[1].includes('no customer prompts'),
    )
    if (level === 'gpu') {
      assert.equal(
        frame.values!.filter(Boolean).length,
        Math.ceil((48 / 80) * 32),
      )
      assert.ok(frame.payload.includes('2.5 GiB'))
    }
  }
  const server = providerFrame(s, 'rack', 'serve', 0, 0)
  overlay.update(server, 0, 'high', true)
  const matrix = new THREE.Matrix4(),
    position = new THREE.Vector3(),
    scale = new THREE.Vector3()
  overlay.glyphs.getMatrixAt(7, matrix)
  matrix.decompose(position, new THREE.Quaternion(), scale)
  assert.equal(position.x, 5.25)
  assert.equal(position.z, 2.75)
  assert.ok(scale.y < 0.1, 'unleased GPU is dim and flat')
  assert.equal(leaseProgress(inspectLease(s, 'train')), 0)
  overlay.dispose()
})

test('the finite shift cannot bill or compute beyond its remaining wall-clock budget', () => {
  const s = createProvider()
  s.time = WINDOW - 0.025
  s.status = 'running'
  const end = advanceProvider(s, 4)
  assert.equal(end.status, 'lost')
  assert.equal(end.time, WINDOW)
  assert.ok(end.leasedGpuSeconds <= 64 * 0.025 + 1e-8)
})

test('buying peak reserve after a successful burst cannot retroactively earn the fleet contract', () => {
  let s = createProvider()
  for (const policy of POLICIES)
    if (policy !== 'headroom') s = providerReducer(s, { type: 'buy', policy })
  for (const level of ['fleet', 'pod', 'rack', 'gpu'] as const)
    s = providerReducer(s, { type: 'visit', level })
  s = run(providerReducer(s, { type: 'repack' }), 45)
  assert.ok(s.burstReady !== null && s.burstReady <= 10)
  assert.ok(s.completed.train >= 2 && s.completed.tune >= 2)
  assert.equal(s.burstProtected, false)
  s = run(providerReducer(s, { type: 'buy', policy: 'headroom' }), 1)
  assert.equal(s.evidence.fleet, false)
  assert.equal(s.status, 'running')
})
