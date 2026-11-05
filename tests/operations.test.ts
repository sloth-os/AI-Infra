import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceGame,
  createGame,
  dispatchQueue,
  gameReducer,
  getGameMetrics,
  serviceContracts,
  SURGE,
} from '../src/game/model.ts'
import type { GameState, Job } from '../src/game/model.ts'
import {
  handoffPoint,
  handoffProgress,
  outputChunks,
} from '../src/game/flow.ts'
const start = () => ({
  ...gameReducer(createGame('sandbox'), { type: 'start' }),
  nextArrival: 9999,
})
function job(id: number, patch: Partial<Job> = {}): Job {
  return {
    id,
    tenant: 0,
    input: 512,
    output: 64,
    prefix: null,
    born: 0,
    deadline: 30,
    phase: 'queued',
    prefillId: null,
    decodeId: null,
    remaining: 512,
    stageTotal: 512,
    kvMiB: 180,
    generated: 0,
    completedAt: null,
    cacheHit: false,
    ...patch,
  }
}
function tick(s: GameState, seconds: number) {
  let next = s
  for (let t = 0; t < seconds; t += 0.1) next = advanceGame(next, 0.1)
  return next
}

test('queue policies use absolute expiry, retain stable ties and do not move running work', () => {
  const s = start(),
    jobs = [
      job(1, { born: 0, deadline: 30, input: 1024 }),
      job(2, { born: 10, deadline: 12, input: 512 }),
      job(3, { born: 5, deadline: 10, input: 256 }),
    ]
  assert.deepEqual(
    dispatchQueue(s, jobs).map((j) => j.id),
    [1, 3, 2],
  )
  assert.deepEqual(
    dispatchQueue({ ...s, dispatchPolicy: 'deadline' }, jobs).map((j) => j.id),
    [3, 2, 1],
  )
  assert.deepEqual(
    dispatchQueue({ ...s, dispatchPolicy: 'shortest' }, jobs).map((j) => j.id),
    [3, 2, 1],
  )
  assert.deepEqual(
    jobs.map((j) => j.id),
    [1, 2, 3],
  )
  const running = job(4, {
    phase: 'prefill',
    prefillId: s.units[0].id,
    remaining: 90000,
  })
  const next = advanceGame(
    {
      ...gameReducer(s, { type: 'dispatch', policy: 'deadline' }),
      jobs: [running, ...jobs],
    },
    0.1,
  )
  assert.equal(next.jobs[0].prefillId, running.prefillId)
  assert.equal(next.jobs[0].phase, 'prefill')
})

test('memory backfill admits a fitting request past a blocked head while respecting retained KV', () => {
  const s = start(),
    capacity = getGameMetrics(s).memory
  const queue = [job(1, { kvMiB: capacity + 1 }), job(2, { kvMiB: 180 })]
  const strict = advanceGame({ ...s, jobs: queue }, 0.1)
  assert.ok(strict.jobs.every((j) => j.phase === 'queued'))
  const next = advanceGame(
    gameReducer({ ...s, jobs: queue }, { type: 'backfill', enabled: true }),
    0.1,
  )
  assert.equal(next.jobs[0].phase, 'queued')
  assert.equal(next.jobs[1].phase, 'prefill')
  assert.ok(getGameMetrics(next).used <= capacity)
  assert.equal(s.memoryBackfill, false)
})

test('reserve increases only the chosen worker rate and has real energy, power, expiry and cooldown costs', () => {
  const s = start(),
    prefill = s.units.find((u) => u.type === 'prefill')!
  s.jobs = [
    job(1, {
      phase: 'prefill',
      prefillId: prefill.id,
      remaining: 90000,
      stageTotal: 90000,
    }),
  ]
  const normal = advanceGame(s, 0.1),
    boosted = gameReducer(s, { type: 'surge', unit: prefill.id }),
    fast = advanceGame(boosted, 0.1)
  assert.ok(
    Math.abs(
      (90000 - fast.jobs[0].remaining) / (90000 - normal.jobs[0].remaining) -
        SURGE.multiplier,
    ) < 1e-9,
  )
  assert.equal(boosted.energy, 40)
  assert.equal(getGameMetrics(boosted).power, getGameMetrics(s).power + 2)
  assert.equal(getGameMetrics(boosted).memory, getGameMetrics(s).memory)
  assert.equal(boosted.jobs[0].kvMiB, s.jobs[0].kvMiB)
  assert.equal(fast.jobs[0].surged, true)
  assert.equal(
    gameReducer(boosted, { type: 'surge', unit: prefill.id }).energy,
    boosted.energy,
  )
  const expired = tick(boosted, 6.1)
  assert.equal(getGameMetrics(expired).power, getGameMetrics(s).power)
  assert.ok(expired.surgeReadyAt > expired.time)
  const paused = gameReducer(boosted, { type: 'pause' })
  assert.equal(advanceGame(paused, 5), paused)
  assert.equal(s.energy, 100)
})

test('reserve rejects unavailable targets and insufficient headroom without spending energy', () => {
  let s = start()
  s = gameReducer(s, { type: 'build', module: 'cache', pad: 0 })
  const cache = s.units.find((u) => u.type === 'cache')!,
    prefill = s.units.find((u) => u.type === 'prefill')!
  assert.equal(gameReducer(s, { type: 'surge', unit: cache.id }).energy, 100)
  assert.equal(
    gameReducer({ ...s, energy: 20 }, { type: 'surge', unit: prefill.id })
      .energy,
    20,
  )
  const offline = {
    ...s,
    units: s.units.map((u) =>
      u.id === prefill.id ? { ...u, offlineUntil: 12 } : u,
    ),
  }
  assert.equal(
    gameReducer(offline, { type: 'surge', unit: prefill.id }).surgeUses,
    0,
  )
  let full = { ...s, credits: 5000 }
  for (const pad of [1, 2, 3, 5])
    full = gameReducer(full, { type: 'build', module: 'prefill', pad })
  assert.equal(getGameMetrics(full).power, 18)
  assert.equal(
    gameReducer(full, { type: 'surge', unit: prefill.id }).energy,
    100,
  )
})

test('a fabric reserve changes the selected switch contribution, not all switches or KV payload size', () => {
  let s = start()
  s = gameReducer(s, { type: 'build', module: 'fabric', pad: 0 })
  s = gameReducer(s, { type: 'build', module: 'fabric', pad: 1 })
  const switches = s.units.filter((u) => u.type === 'fabric'),
    before = getGameMetrics(s)
  const active = gameReducer(s, { type: 'surge', unit: switches[0].id })
  assert.equal(getGameMetrics(active).bandwidth, before.bandwidth + 200 * 0.75)
  assert.equal(getGameMetrics(active).used, before.used)
  assert.equal(
    gameReducer(active, { type: 'sell', unit: switches[0].id }).units.length,
    active.units.length,
  )
})

test('contracts count delivered work and pay only once, with streaks broken by missed requests', () => {
  const s = start(),
    decode = s.units.find((u) => u.type === 'decode')!
  s.batching = true
  s.jobs = [1, 2, 3].map((id) =>
    job(id, {
      phase: 'decode',
      decodeId: decode.id,
      prefillId: s.units[0].id,
      output: 8,
      generated: 7,
      remaining: 1,
      surged: true,
    }),
  )
  const next = advanceGame(s, 0.1)
  assert.equal(next.served, 3)
  assert.equal(next.streak, 3)
  assert.equal(next.surgedCompletions, 3)
  assert.equal(
    serviceContracts(next).find((c) => c.id === 'reserve')!.ready,
    true,
  )
  const paid = gameReducer(next, { type: 'claim', contract: 'reserve' })
  assert.equal(paid.credits, next.credits + 45)
  assert.equal(paid.score, next.score + 150)
  assert.equal(
    gameReducer(paid, { type: 'claim', contract: 'reserve' }).credits,
    paid.credits,
  )
  assert.equal(
    gameReducer(s, { type: 'claim', contract: 'steady' }).credits,
    s.credits,
  )
  const missed = advanceGame(
    { ...paid, jobs: [job(99, { born: -30, deadline: 1 })] },
    0.1,
  )
  assert.equal(missed.streak, 0)
  assert.equal(missed.bestStreak, 3)
  assert.equal(missed.lost, 1)
})

test('sandbox drills create bounded queued requests with real KV reservations and cannot run in campaign missions', () => {
  const s = start(),
    wave = gameReducer(s, { type: 'drill', kind: 'context' })
  assert.equal(wave.jobs.length, 8)
  assert.equal(wave.nextJob, s.nextJob + 8)
  assert.ok(
    wave.jobs.every(
      (j) => j.phase === 'queued' && [4096, 8192].includes(j.input),
    ),
  )
  assert.ok(wave.jobs.every((j) => j.kvMiB > 1000))
  assert.equal(wave.served, 0)
  assert.equal(
    gameReducer(wave, { type: 'drill', kind: 'burst' }).jobs.length,
    8,
  )
  const nearFull = {
    ...s,
    jobs: Array.from({ length: 63 }, (_, i) => job(i + 100)),
  }
  assert.equal(
    gameReducer(nearFull, { type: 'drill', kind: 'burst' }).jobs.length,
    64,
  )
  const campaign = gameReducer(createGame(), { type: 'start' })
  assert.equal(
    gameReducer(campaign, { type: 'drill', kind: 'burst' }).jobs.length,
    0,
  )
})

test('handoff geometry follows transferred bytes and output chunks never invent ungenerated tokens', () => {
  assert.equal(handoffProgress(100, 100), 0)
  assert.equal(handoffProgress(25, 100), 0.75)
  assert.equal(handoffProgress(-1, 100), 1)
  const a = { x: -3, z: 2 },
    b = { x: 9, z: 8 }
  assert.deepEqual(handoffPoint(a, b, 0), { x: -3, y: 1.4, z: 2 })
  const mid = handoffPoint(a, b, 0.5)
  assert.deepEqual(mid, { x: 3, y: 4.4, z: 5 })
  assert.equal(outputChunks(7.9, 64), 0)
  assert.equal(outputChunks(8, 64), 1)
  assert.equal(outputChunks(999, 64), 8)
  assert.equal(outputChunks(-5, 64), 0)
})
