import test from 'node:test'
import assert from 'node:assert/strict'
import {
  advanceGame,
  createGame,
  gameReducer,
  getGameMetrics,
  MISSIONS,
  readProgress,
  requirementsMet,
  unitPower,
} from '../src/game/model.ts'
import type { GameAction, GameState, Job } from '../src/game/model.ts'

function run(state: GameState, seconds: number) {
  let s = state
  for (let i = 0; i < seconds * 10 && s.phase === 'playing'; i++)
    s = advanceGame(s, 0.1)
  return s
}
function job(id: number, patch: Partial<Job> = {}): Job {
  return {
    id,
    tenant: 0,
    input: 256,
    output: 96,
    prefix: null,
    born: 0,
    deadline: 100,
    phase: 'ready',
    prefillId: 1,
    decodeId: null,
    remaining: 0,
    stageTotal: 256,
    kvMiB: 110,
    generated: 0,
    completedAt: null,
    cacheHit: false,
    ...patch,
  }
}

test('the first mission is won by an actual prefill → transfer → decode pipeline', () => {
  let s = gameReducer(createGame(), { type: 'start' })
  s = gameReducer(s, { type: 'build', module: 'prefill', pad: 4 })
  s = gameReducer(s, { type: 'build', module: 'decode', pad: 7 })
  const original = s
  s = run(s, 60)
  assert.equal(s.phase, 'victory')
  assert.equal(s.served, 12)
  assert.equal(s.lost, 0)
  assert.equal(s.integrity, 100)
  assert.ok(s.generated >= 12 * 64 - 1e-6)
  assert.ok(s.score > 1200)
  assert.equal(s.credits, 360 - 120 - 100 + 12 * 12)
  assert.equal(original.served, 0)
  assert.equal(original.jobs.length, 0)
})

test('building respects credits, occupancy and power without charging rejected actions', () => {
  let s = gameReducer(createGame(), { type: 'start' })
  s = gameReducer(s, { type: 'build', module: 'prefill', pad: 0 })
  const occupied = gameReducer(s, { type: 'build', module: 'decode', pad: 0 })
  assert.equal(occupied.credits, s.credits)
  assert.equal(occupied.units.length, 1)
  const poor = gameReducer(
    { ...s, credits: 20 },
    { type: 'build', module: 'decode', pad: 1 },
  )
  assert.equal(poor.credits, 20)
  assert.equal(poor.units.length, 1)
  s = { ...s, credits: 2000 }
  for (let i = 1; i < 6; i++)
    s = gameReducer(s, { type: 'build', module: 'prefill', pad: i })
  assert.equal(getGameMetrics(s).power, 18)
  const full = gameReducer(s, { type: 'build', module: 'prefill', pad: 6 })
  assert.equal(full.credits, s.credits)
  assert.equal(full.units.length, 6)
  assert.equal(unitPower(s.units[0]), 3)
})

test('pause freezes arrivals, deadlines, currency and simulation time', () => {
  let s = gameReducer(createGame(), { type: 'start' })
  s = run(s, 3)
  s = gameReducer(s, { type: 'pause' })
  assert.equal(advanceGame(s, 5), s)
  assert.equal(advanceGame(s, Infinity), s)
  assert.equal(gameReducer(s, { type: 'resume' }).phase, 'playing')
})

test('an incomplete service eventually loses integrity rather than delivering fake successes', () => {
  const s = run(gameReducer(createGame(), { type: 'start' }), 60)
  assert.equal(s.phase, 'defeat')
  assert.equal(s.integrity, 0)
  assert.equal(s.served, 0)
  assert.ok(s.lost > 0)
})

test('retained KV prevents unsafe bank removal and blocks admission at capacity', () => {
  let s = gameReducer(createGame('memory-garden'), { type: 'start' })
  s = gameReducer(s, { type: 'build', module: 'cache', pad: 0 })
  s = {
    ...s,
    jobs: [
      job(1, { phase: 'ready', kvMiB: 1320 }),
      job(2, { phase: 'ready', kvMiB: 1320 }),
    ],
    nextArrival: 9999,
  }
  const bank = s.units.find((u) => u.type === 'cache')!
  const next = gameReducer(s, { type: 'sell', unit: bank.id })
  assert.equal(next.units.length, s.units.length)
  assert.equal(next.credits, s.credits)
  const over = {
    ...s,
    jobs: [...s.jobs, job(3, { phase: 'queued', kvMiB: 1320 })],
  }
  const tick = advanceGame(over, 0.1)
  assert.equal(tick.jobs.find((j) => j.id === 3)!.phase, 'queued')
  assert.ok(getGameMetrics(tick).used <= getGameMetrics(tick).memory)
})

test('prefix reuse requires an exact tenant-scoped key on an idle prefill engine', () => {
  let s = gameReducer(createGame('familiar-voices'), { type: 'start' })
  s = gameReducer(s, { type: 'research', research: 'prefix' })
  s = {
    ...s,
    nextArrival: 9999,
    units: s.units.map((u, i) => ({
      ...u,
      prefixes: i === 0 ? ['tenant-0:system-prefix-v1'] : [],
    })),
    jobs: [
      job(1, {
        input: 2048,
        phase: 'queued',
        prefix: 'tenant-1:system-prefix-v1',
        tenant: 1,
        kvMiB: 660,
      }),
    ],
  }
  const miss = advanceGame(s, 0.1)
  assert.equal(miss.prefixHits, 0)
  const hit = advanceGame(
    {
      ...s,
      jobs: [{ ...s.jobs[0], tenant: 0, prefix: 'tenant-0:system-prefix-v1' }],
    },
    0.1,
  )
  assert.equal(hit.prefixHits, 1)
  assert.equal(hit.jobs[0].cacheHit, true)
  assert.ok(hit.jobs[0].remaining < miss.jobs[0].remaining)
})

test('shared network bandwidth affects actual handoff completion', () => {
  let slow = gameReducer(createGame('crossing-streams'), { type: 'start' })
  slow = {
    ...slow,
    nextArrival: 9999,
    jobs: [
      job(1, {
        phase: 'transfer',
        input: 2048,
        decodeId: 2,
        remaining: 640,
        stageTotal: 640,
        kvMiB: 660,
      }),
    ],
  }
  let fast = gameReducer(slow, { type: 'build', module: 'fabric', pad: 0 })
  fast = gameReducer(fast, { type: 'upgrade', unit: 3 })
  const a = run(slow, 2),
    b = run(fast, 2)
  assert.equal(a.jobs[0].phase, 'transfer')
  assert.notEqual(b.jobs[0]?.phase, 'transfer')
  assert.equal(getGameMetrics(fast).bandwidth, 450)
})

test('continuous batching serves more admitted sequences while charging research once', () => {
  let s = gameReducer(createGame('sandbox'), { type: 'start' })
  s = gameReducer(s, { type: 'upgrade', unit: 2 })
  s = { ...s, nextArrival: 9999, jobs: [job(1), job(2), job(3)] }
  const batched = gameReducer(s, { type: 'research', research: 'batching' })
  assert.equal(
    gameReducer(batched, { type: 'research', research: 'batching' }).credits,
    batched.credits,
  )
  assert.ok(run(batched, 4).served > run(s, 4).served)
})

test('special requirements gate victory and outages are repaired with a real credit cost', () => {
  let s = gameReducer(createGame('rush-hour'), { type: 'start' })
  s = { ...s, served: 36, nextArrival: 9999 }
  assert.equal(requirementsMet(s), false)
  assert.equal(advanceGame(s, 0.1).phase, 'playing')
  s = gameReducer(s, { type: 'research', research: 'batching' })
  assert.equal(advanceGame(s, 0.1).phase, 'victory')
  let broken = gameReducer(createGame('the-long-shift'), { type: 'start' })
  broken = {
    ...broken,
    units: broken.units.map((u, i) => ({
      ...u,
      offlineUntil: i === 0 ? 12 : 0,
    })),
  }
  const repaired = gameReducer(broken, { type: 'repair', unit: 1 })
  assert.equal(repaired.credits, broken.credits - 40)
  assert.equal(repaired.units[0].offlineUntil, 0)
})

test('all six campaign missions have winning strategies within their actual budgets', () => {
  const plans: GameAction[][] = [
    [
      { type: 'build', module: 'prefill', pad: 4 },
      { type: 'build', module: 'decode', pad: 7 },
    ],
    [
      { type: 'research', research: 'batching' },
      { type: 'build', module: 'prefill', pad: 5 },
      { type: 'build', module: 'decode', pad: 11 },
      { type: 'upgrade', unit: 1 },
    ],
    [
      { type: 'build', module: 'cache', pad: 0 },
      { type: 'upgrade', unit: 1 },
      { type: 'build', module: 'prefill', pad: 5 },
      { type: 'research', research: 'batching' },
    ],
    [
      { type: 'build', module: 'fabric', pad: 0 },
      { type: 'upgrade', unit: 3 },
      { type: 'build', module: 'cache', pad: 1 },
      { type: 'research', research: 'batching' },
    ],
    [
      { type: 'research', research: 'prefix' },
      { type: 'research', research: 'batching' },
      { type: 'build', module: 'prefill', pad: 5 },
      { type: 'build', module: 'decode', pad: 11 },
      { type: 'build', module: 'fabric', pad: 0 },
    ],
    [
      { type: 'research', research: 'batching' },
      { type: 'build', module: 'cache', pad: 0 },
      { type: 'build', module: 'fabric', pad: 1 },
      { type: 'upgrade', unit: 4 },
      { type: 'build', module: 'prefill', pad: 5 },
      { type: 'build', module: 'decode', pad: 11 },
      { type: 'research', research: 'prefix' },
    ],
  ]
  MISSIONS.forEach((m, i) => {
    let s = gameReducer(createGame(m.id), { type: 'start' })
    for (const action of plans[i]) s = gameReducer(s, action)
    for (let tick = 0; tick < 1200 && s.phase === 'playing'; tick++) {
      const broken = s.units.find((u) => u.offlineUntil > s.time)
      if (broken) s = gameReducer(s, { type: 'repair', unit: broken.id })
      s = advanceGame(s, 0.1)
    }
    assert.equal(s.phase, 'victory', m.name)
    assert.ok(s.credits >= 0)
    assert.ok(s.integrity > 0)
  })
})

test('browser-local progress rejects malformed or out-of-range records', () => {
  assert.deepEqual(readProgress('not json'), { stars: {}, best: {} })
  assert.deepEqual(
    readProgress('{"stars":{"first-light":99},"best":{"first-light":-10}}'),
    { stars: {}, best: {} },
  )
  assert.equal(
    readProgress('{"stars":{"first-light":3},"best":{"first-light":2000}}')
      .stars['first-light'],
    3,
  )
})
