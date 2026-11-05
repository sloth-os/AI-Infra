import test from 'node:test'
import assert from 'node:assert/strict'
import { createGame, gameReducer, getGameMetrics } from '../src/game/model.ts'
import type { GameState, Job } from '../src/game/model.ts'
import {
  moduleTelemetry,
  pinSpatialCard,
  placeSpatialCard,
  serviceHint,
} from '../src/game/fusion.ts'

function handoff(id: number, prefillId = 1): Job {
  return {
    id,
    tenant: 0,
    input: 1024,
    output: 96,
    prefix: null,
    born: 0,
    deadline: 20,
    phase: 'transfer',
    prefillId,
    decodeId: 2,
    remaining: 320,
    stageTotal: 320,
    kvMiB: 350,
    generated: 0,
    completedAt: null,
    cacheHit: false,
  }
}
function district(): GameState {
  let s = gameReducer(createGame('memory-garden'), { type: 'start' })
  s = gameReducer(s, { type: 'build', module: 'cache', pad: 0 })
  s = gameReducer(s, { type: 'build', module: 'prefill', pad: 5 })
  s = gameReducer(s, { type: 'build', module: 'fabric', pad: 1 })
  return {
    ...s,
    batching: true,
    prefixReuse: true,
    jobs: [handoff(1), handoff(2, 4)],
  }
}

test('spatial panels stay within the viewport, clear the dock and reserve the camera rail', () => {
  for (const [width, height] of [
    [320, 700],
    [390, 844],
    [768, 1024],
    [1440, 1080],
    [2560, 1440],
  ]) {
    for (const [x, y] of [
      [-300, -200],
      [0, height],
      [width / 2, height / 2],
      [width + 300, height + 200],
    ]) {
      const p = placeSpatialCard(x, y, width, height, 370)
      assert.ok(p.x >= 14 && p.y >= 112)
      assert.ok(p.x + p.width <= width - 14)
      assert.ok(p.y + 370 <= height - 168)
      if (width >= 700) assert.ok(p.x + p.width <= width - 84)
      assert.ok(
        Number.isFinite(p.tetherAngle) && Number.isFinite(p.tetherLength),
      )
    }
  }
})

test('moving payloads keep controls pinned while their tether follows the world', () => {
  const first = pinSpatialCard(null, 'request', 320, 300, 1440, 1080, 400)
  const later = pinSpatialCard(first, 'request', 1050, 720, 1440, 1080, 400)
  assert.equal(later.x, first.x)
  assert.equal(later.y, first.y)
  assert.notEqual(later.tetherAngle, first.tetherAngle)
  const resized = pinSpatialCard(later, 'request', 600, 400, 390, 844, 400)
  assert.ok(resized.x >= 14 && resized.x + resized.width <= 376)
  assert.ok(resized.y + 400 <= 676)
})

test('memory holograms expose the same retained reservation as admission, including prefix headroom', () => {
  const s = district(),
    m = getGameMetrics(s),
    bank = s.units.find((u) => u.type === 'cache')!
  assert.equal(m.used, 956)
  const reading = moduleTelemetry(s, bank, 'memory')
  assert.equal(reading.value, '956 MiB')
  assert.equal(reading.ratio, 956 / m.memory)
  assert.match(reading.label, /reserved/)
  assert.equal(moduleTelemetry(s, s.units[0], 'memory').value, '350 MiB')
  assert.equal(s.jobs[0].remaining, 320)
})

test('flow rings include reserved handoff slots and network rings conserve useful shared bandwidth', () => {
  const s = district(),
    decode = s.units[1],
    switchUnit = s.units.find((u) => u.type === 'fabric')!
  assert.equal(moduleTelemetry(s, decode, 'flow').value, '2 / 3')
  const a = moduleTelemetry(s, s.units[0], 'fabric'),
    b = moduleTelemetry(s, s.units[3], 'fabric')
  assert.equal(a.ratio + b.ratio, 1)
  assert.equal(a.value, '210 Gb/s')
  assert.equal(b.value, '210 Gb/s')
  assert.equal(moduleTelemetry(s, switchUnit, 'fabric').value, '420 Gb/s')
})

test('an offline module exposes a repairable fault and the next hint reflects the actual missing phase', () => {
  let s = gameReducer(createGame(), { type: 'start' })
  assert.match(serviceHint(s), /prefill/)
  s = gameReducer(s, { type: 'build', module: 'prefill', pad: 4 })
  assert.match(serviceHint(s), /decode/)
  const u = { ...s.units[0], offlineUntil: 7 }
  assert.deepEqual(moduleTelemetry(s, u, 'flow'), {
    ratio: 0,
    value: '7s',
    label: 'Cooling fault',
    detail: 'Repair this engine or wait for recovery.',
    color: '#f08c83',
  })
})
