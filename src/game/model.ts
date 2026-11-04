import { kvBytes } from '../model.ts'

export type ModuleType = 'prefill' | 'decode' | 'cache' | 'fabric'
export type GamePhase = 'briefing' | 'playing' | 'paused' | 'victory' | 'defeat'
export type JobPhase =
  | 'queued'
  | 'prefill'
  | 'ready'
  | 'transfer'
  | 'decode'
  | 'done'
export interface Pad {
  id: number
  name: string
  x: number
  z: number
}
export const PADS: Pad[] = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  name: `${'ABCD'[Math.floor(i / 4)]}${(i % 4) + 1}`,
  x: (i % 4) * 4 - 5,
  z: Math.floor(i / 4) * 4 - 6,
}))
export const MODULES: Record<
  ModuleType,
  {
    name: string
    cost: number
    color: string
    power: number
    short: string
    description: string
    lesson: string
  }
> = {
  prefill: {
    name: 'Prefill engine',
    short: 'PREFILL',
    cost: 120,
    color: '#b49af3',
    power: 3,
    description: 'Turns prompt tokens into model state.',
    lesson:
      'More prefill capacity reduces prompt queues and time to first token.',
  },
  decode: {
    name: 'Decode engine',
    short: 'DECODE',
    cost: 100,
    color: '#c9ee87',
    power: 2,
    description: 'Generates and streams output tokens.',
    lesson: 'Independent decode capacity keeps token streams responsive.',
  },
  cache: {
    name: 'KV memory bank',
    short: 'KV BANK',
    cost: 80,
    color: '#74d4d3',
    power: 1,
    description: 'Adds 2,048 MiB of cache capacity per level.',
    lesson:
      'Long prompts retain larger caches. Admission waits when memory is full.',
  },
  fabric: {
    name: 'Fabric switch',
    short: 'FABRIC',
    cost: 110,
    color: '#efb07a',
    power: 2,
    description: 'Adds 200 Gb/s of shared fabric per level.',
    lesson:
      'Split prefill/decode moves much more state than the original API text.',
  },
}
export interface Unit {
  id: number
  pad: number
  type: ModuleType
  level: number
  invested: number
  offlineUntil: number
  prefixes: string[]
}
export interface Job {
  id: number
  tenant: number
  input: number
  output: number
  prefix: string | null
  born: number
  deadline: number
  phase: JobPhase
  prefillId: number | null
  decodeId: number | null
  remaining: number
  stageTotal: number
  kvMiB: number
  generated: number
  completedAt: number | null
  cacheHit: boolean
}
export interface GameEvent {
  id: number
  at: number
  kind: 'good' | 'warning' | 'info'
  text: string
}
export interface Mission {
  id: string
  name: string
  kicker: string
  brief: string
  lesson: string
  goal: number
  duration: number
  deadline: number
  credits: number
  memory: number
  network: number
  interval: number
  prompts: number[]
  output: number
  starter: { type: ModuleType; pad: number; level?: number }[]
  requirement: 'none' | 'batching' | 'memory' | 'network' | 'prefix' | 'all'
}
export const MISSIONS: Mission[] = [
  {
    id: 'first-light',
    name: 'First light',
    kicker: '01 / BOOT THE CITY',
    brief:
      'Bring a model online. Build a prefill engine and a decode engine, then deliver 12 requests.',
    lesson:
      'A prompt needs both processing phases. Compute alone does not make a complete service.',
    goal: 12,
    duration: 65,
    deadline: 15,
    credits: 360,
    memory: 2048,
    network: 100,
    interval: 1.8,
    prompts: [256, 512, 1024],
    output: 64,
    starter: [],
    requirement: 'none',
  },
  {
    id: 'rush-hour',
    name: 'Rush hour',
    kicker: '02 / SHARE THE COMPUTE',
    brief:
      'A wave of users is arriving. Enable continuous batching and deliver 36 requests.',
    lesson:
      'Continuous batching shares work across sequences. Aggregate throughput improves while each iteration may slow.',
    goal: 36,
    duration: 80,
    deadline: 14,
    credits: 400,
    memory: 4096,
    network: 400,
    interval: 1.05,
    prompts: [256, 512, 1024],
    output: 96,
    starter: [
      { type: 'prefill', pad: 4 },
      { type: 'decode', pad: 7 },
    ],
    requirement: 'batching',
  },
  {
    id: 'memory-garden',
    name: 'Memory garden',
    kicker: '03 / MAKE ROOM FOR CONTEXT',
    brief:
      'Long prompts are filling HBM. Add a KV bank and deliver 22 requests without losing the service.',
    lesson:
      'KV state scales with context. More free compute does not help if another sequence cannot fit in memory.',
    goal: 22,
    duration: 85,
    deadline: 20,
    credits: 500,
    memory: 1536,
    network: 400,
    interval: 1.65,
    prompts: [1024, 2048, 4096],
    output: 96,
    starter: [
      { type: 'prefill', pad: 4, level: 2 },
      { type: 'decode', pad: 7, level: 2 },
    ],
    requirement: 'memory',
  },
  {
    id: 'crossing-streams',
    name: 'Crossing streams',
    kicker: '04 / UNBLOCK THE FABRIC',
    brief:
      'Large KV shards are stuck on a slow link. Reach 400 Gb/s of fabric and deliver 24 requests.',
    lesson:
      'Prefill/decode separation creates a state-transfer cost. Bandwidth and pool balance must work together.',
    goal: 24,
    duration: 90,
    deadline: 19,
    credits: 450,
    memory: 8192,
    network: 50,
    interval: 1.5,
    prompts: [2048, 4096],
    output: 64,
    starter: [
      { type: 'prefill', pad: 4, level: 3 },
      { type: 'decode', pad: 7, level: 2 },
    ],
    requirement: 'network',
  },
  {
    id: 'familiar-voices',
    name: 'Familiar voices',
    kicker: '05 / REMEMBER THE PREFIX',
    brief:
      'Repeated system prompts are wasting work. Enable prefix reuse, earn 8 cache hits, and deliver 40 requests.',
    lesson:
      'Exact compatible prefixes can reuse KV state. Cache-aware routing needs a load-balancing escape hatch and tenant isolation.',
    goal: 40,
    duration: 90,
    deadline: 16,
    credits: 500,
    memory: 8192,
    network: 400,
    interval: 0.95,
    prompts: [2048, 4096],
    output: 64,
    starter: [
      { type: 'prefill', pad: 4, level: 2 },
      { type: 'decode', pad: 7, level: 2 },
    ],
    requirement: 'prefix',
  },
  {
    id: 'the-long-shift',
    name: 'The long shift',
    kicker: '06 / KEEP THE FLEET ALIVE',
    brief:
      'Handle traffic bursts and a cooling fault. Deliver 60 requests with batching, a KV bank, and upgraded fabric.',
    lesson:
      'Resilience is a system property. Repair faults, control queues, and balance compute, memory, power, and the network.',
    goal: 60,
    duration: 110,
    deadline: 18,
    credits: 750,
    memory: 4096,
    network: 100,
    interval: 0.9,
    prompts: [512, 1024, 2048],
    output: 96,
    starter: [
      { type: 'prefill', pad: 4, level: 2 },
      { type: 'decode', pad: 7, level: 2 },
    ],
    requirement: 'all',
  },
]
export const SANDBOX: Mission = {
  id: 'sandbox',
  name: 'Open horizon',
  kicker: 'SANDBOX / YOUR OWN RULES',
  brief:
    'Build freely and see how long your service can hold. Traffic grows over time. Pause whenever you want to plan.',
  lesson:
    'Experiment with the bottleneck. These are game-balanced rules, not a real fleet capacity estimate.',
  goal: Infinity,
  duration: Infinity,
  deadline: 20,
  credits: 650,
  memory: 4096,
  network: 200,
  interval: 1.5,
  prompts: [256, 512, 1024, 2048],
  output: 64,
  starter: [
    { type: 'prefill', pad: 4 },
    { type: 'decode', pad: 7 },
  ],
  requirement: 'none',
}
export interface GameState {
  mission: string
  phase: GamePhase
  time: number
  credits: number
  integrity: number
  served: number
  lost: number
  generated: number
  latencyTotal: number
  score: number
  prefixHits: number
  batching: boolean
  prefixReuse: boolean
  powerUpgrades: number
  units: Unit[]
  jobs: Job[]
  events: GameEvent[]
  seed: number
  nextJob: number
  nextUnit: number
  nextArrival: number
  faultTriggered: boolean
  feedback: string
  reason: string
}
export type GameAction =
  | { type: 'start' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'tick'; dt: number }
  | { type: 'build'; module: ModuleType; pad: number }
  | { type: 'upgrade'; unit: number }
  | { type: 'sell'; unit: number }
  | { type: 'repair'; unit: number }
  | { type: 'research'; research: 'batching' | 'prefix' | 'power' }
  | { type: 'finish' }

export function missionById(id: string): Mission {
  return MISSIONS.find((m) => m.id === id) || SANDBOX
}
export function unitPower(unit: Unit) {
  return (
    MODULES[unit.type].power +
    (unit.type === 'cache' || unit.type === 'fabric'
      ? Math.floor((unit.level - 1) / 2)
      : unit.level - 1)
  )
}
export function upgradeCost(unit: Unit) {
  return Math.round(MODULES[unit.type].cost * 0.65 * unit.level)
}
export function prefillRate(unit: Unit) {
  return 850 * (1 + 0.65 * (unit.level - 1))
}
export function decodeRate(unit: Unit) {
  return 48 * (1 + 0.55 * (unit.level - 1))
}
export function decodeSlots(s: GameState, u: Unit) {
  return s.batching ? Math.min(4, u.level + 1) : 1
}
export function activeOn(s: GameState, unit: number) {
  return s.jobs.filter(
    (j) =>
      (j.prefillId === unit && j.phase === 'prefill') ||
      (j.decodeId === unit && (j.phase === 'decode' || j.phase === 'transfer')),
  ).length
}
export function getGameMetrics(s: GameState) {
  const m = missionById(s.mission)
  const memory =
    m.memory +
    s.units
      .filter((u) => u.type === 'cache')
      .reduce((sum, u) => sum + u.level * 2048, 0)
  const used =
    s.jobs
      .filter((j) => j.phase !== 'queued' && j.phase !== 'done')
      .reduce((sum, j) => sum + j.kvMiB, 0) + (s.prefixReuse ? 256 : 0)
  const bandwidth =
    m.network +
    s.units
      .filter((u) => u.type === 'fabric' && u.offlineUntil <= s.time)
      .reduce((sum, u) => sum + u.level * 200, 0)
  return {
    memory,
    used,
    bandwidth,
    power: s.units.reduce((sum, u) => sum + unitPower(u), 0),
    maxPower: 18 + s.powerUpgrades * 8,
    queued: s.jobs.filter((j) => j.phase === 'queued').length,
    transfers: s.jobs.filter((j) => j.phase === 'transfer').length,
    active: s.jobs.filter((j) => j.phase !== 'queued' && j.phase !== 'done')
      .length,
    averageLatency: s.served ? s.latencyTotal / s.served : 0,
    wave: Math.floor(s.time / 15) + 1,
  }
}
export function requirementsMet(s: GameState) {
  const m = missionById(s.mission),
    metrics = getGameMetrics(s)
  switch (m.requirement) {
    case 'batching':
      return s.batching
    case 'memory':
      return s.units.some((u) => u.type === 'cache')
    case 'network':
      return metrics.bandwidth >= 400
    case 'prefix':
      return s.prefixReuse && s.prefixHits >= 8
    case 'all':
      return (
        s.batching &&
        metrics.bandwidth >= 400 &&
        s.units.some((u) => u.type === 'cache')
      )
    default:
      return true
  }
}
export function createGame(mission = MISSIONS[0].id): GameState {
  const m = missionById(mission)
  return {
    mission: m.id,
    phase: 'briefing',
    time: 0,
    credits: m.credits,
    integrity: 100,
    served: 0,
    lost: 0,
    generated: 0,
    latencyTotal: 0,
    score: 0,
    prefixHits: 0,
    batching: false,
    prefixReuse: false,
    powerUpgrades: 0,
    units: m.starter.map((u, i) => ({
      id: i + 1,
      pad: u.pad,
      type: u.type,
      level: u.level || 1,
      invested: MODULES[u.type].cost,
      offlineUntil: 0,
      prefixes: [],
    })),
    jobs: [],
    events: [],
    seed: 20261104,
    nextJob: 1,
    nextUnit: m.starter.length + 1,
    nextArrival: 1.5,
    faultTriggered: false,
    feedback: 'Select a module, then choose a glowing build pad.',
    reason: '',
  }
}
function event(s: GameState, text: string, kind: GameEvent['kind'] = 'info') {
  s.feedback = text
  s.events = [
    { id: (s.events[0]?.id || 0) + 1, at: s.time, kind, text },
    ...s.events,
  ].slice(0, 8)
}
function denied(s: GameState, message: string): GameState {
  return { ...s, feedback: message }
}
function clone(s: GameState): GameState {
  return {
    ...s,
    units: s.units.map((u) => ({ ...u, prefixes: [...u.prefixes] })),
    jobs: s.jobs.map((j) => ({ ...j })),
    events: [...s.events],
  }
}
function random(s: GameState) {
  s.seed = (Math.imul(s.seed, 1664525) + 1013904223) >>> 0
  return s.seed / 2 ** 32
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'start')
    return state.phase === 'briefing'
      ? {
          ...state,
          phase: 'playing',
          feedback: 'Your shift is live. Build a complete serving path.',
        }
      : state
  if (action.type === 'pause')
    return state.phase === 'playing' ? { ...state, phase: 'paused' } : state
  if (action.type === 'resume')
    return state.phase === 'paused' ? { ...state, phase: 'playing' } : state
  if (action.type === 'tick') return advanceGame(state, action.dt)
  if (action.type === 'finish' && state.mission === 'sandbox')
    return {
      ...state,
      phase: 'victory',
      reason: 'Shift complete. Your personal run is recorded.',
    }
  if (state.phase !== 'playing' && state.phase !== 'paused') return state
  const s = clone(state),
    metrics = getGameMetrics(s)
  if (action.type === 'build') {
    if (!Number.isInteger(action.pad) || !PADS[action.pad])
      return denied(state, 'Choose a valid build pad.')
    if (s.units.some((u) => u.pad === action.pad))
      return denied(state, 'That pad already has a module.')
    const spec = MODULES[action.module]
    if (!spec) return denied(state, 'Choose a module from the build menu.')
    if (s.credits < spec.cost)
      return denied(
        state,
        `Need ${spec.cost} credits to build ${spec.name.toLowerCase()}.`,
      )
    if (metrics.power + spec.power > metrics.maxPower)
      return denied(state, 'Power limit reached. Research more power headroom.')
    s.credits -= spec.cost
    s.units.push({
      id: s.nextUnit++,
      pad: action.pad,
      type: action.module,
      level: 1,
      invested: spec.cost,
      offlineUntil: 0,
      prefixes: [],
    })
    event(s, `${spec.name} online in sector ${PADS[action.pad].name}.`, 'good')
    return s
  }
  if (action.type === 'research') {
    const cost =
      action.research === 'batching'
        ? 85
        : action.research === 'prefix'
          ? 70
          : 120
    if (
      (action.research === 'batching' && s.batching) ||
      (action.research === 'prefix' && s.prefixReuse)
    )
      return denied(state, 'That optimization is already installed.')
    if (action.research === 'power' && s.powerUpgrades >= 3)
      return denied(state, 'Power infrastructure is at maximum level.')
    if (s.credits < cost)
      return denied(state, `Need ${cost} credits for this research.`)
    if (action.research === 'prefix' && metrics.used + 256 > metrics.memory)
      return denied(
        state,
        'Prefix reuse reserves 256 MiB. Add memory headroom first.',
      )
    s.credits -= cost
    if (action.research === 'batching') {
      s.batching = true
      event(
        s,
        'Continuous batching enabled. Decode workers can share an iteration.',
        'good',
      )
    } else if (action.research === 'prefix') {
      s.prefixReuse = true
      event(
        s,
        'Tenant-aware prefix reuse enabled. Compatible warm prefixes save prefill work.',
        'good',
      )
    } else {
      s.powerUpgrades++
      event(s, 'Power headroom increased by 8 game units.', 'good')
    }
    return s
  }
  if ('unit' in action) {
    const u = s.units.find((u) => u.id === action.unit)
    if (!u) return denied(state, 'Select an existing module.')
    if (action.type === 'upgrade') {
      if (u.level >= 3) return denied(state, 'This module is already level 3.')
      const cost = upgradeCost(u)
      if (s.credits < cost)
        return denied(state, `Need ${cost} credits for the upgrade.`)
      if (
        metrics.power - unitPower(u) + unitPower({ ...u, level: u.level + 1 }) >
        metrics.maxPower
      )
        return denied(state, 'The upgrade needs more power headroom.')
      s.credits -= cost
      u.invested += cost
      u.level++
      event(s, `${MODULES[u.type].name} upgraded to level ${u.level}.`, 'good')
      return s
    }
    if (action.type === 'sell') {
      if (activeOn(s, u.id))
        return denied(
          state,
          'This engine is busy. Wait for its active work to finish.',
        )
      if (u.type === 'cache' && metrics.used > metrics.memory - u.level * 2048)
        return denied(
          state,
          'This bank holds needed KV capacity. Drain requests before selling it.',
        )
      const refund = Math.floor(u.invested * 0.6)
      s.credits += refund
      s.units = s.units.filter((x) => x.id !== u.id)
      event(s, `Module recycled. ${refund} credits recovered.`)
      return s
    }
    if (action.type === 'repair') {
      if (u.offlineUntil <= s.time)
        return denied(state, 'This module is healthy.')
      if (s.credits < 40)
        return denied(state, 'Need 40 credits for an immediate repair.')
      s.credits -= 40
      u.offlineUntil = 0
      event(s, `${MODULES[u.type].name} repaired and back online.`, 'good')
      return s
    }
  }
  return state
}

function step(s: GameState, dt: number) {
  const m = missionById(s.mission)
  s.time += dt
  if (m.requirement === 'all' && !s.faultTriggered && s.time >= 24) {
    const victim = s.units.find((u) => u.type === 'prefill')
    if (victim) {
      victim.offlineUntil = s.time + 12
      s.faultTriggered = true
      event(
        s,
        'Cooling fault! A prefill engine is offline for 12 seconds. Select it to repair.',
        'warning',
      )
    }
  }
  const burst =
    (m.id === 'rush-hour' || m.requirement === 'all') &&
    s.time >= 25 &&
    s.time < 43
  const interval =
    (m.interval * (burst ? 0.56 : 1)) /
    (m.id === 'sandbox' ? 1 + s.time / 80 : 1)
  if (s.time >= s.nextArrival) {
    s.nextArrival += interval
    if (s.jobs.filter((j) => j.phase !== 'done').length >= 64) {
      s.lost++
      s.integrity -= 2
      event(
        s,
        'Admission queue full. An incoming request was rejected.',
        'warning',
      )
    } else {
      const tenant = Math.floor(random(s) * 3),
        input = m.prompts[Math.floor(random(s) * m.prompts.length)]
      const cacheable =
        (m.requirement === 'prefix' ||
          m.requirement === 'all' ||
          m.id === 'sandbox') &&
        random(s) < 0.72
      s.jobs.push({
        id: s.nextJob++,
        tenant,
        input,
        output: m.output,
        prefix: cacheable ? `tenant-${tenant}:system-prefix-v1` : null,
        born: s.time,
        deadline: m.deadline,
        phase: 'queued',
        prefillId: null,
        decodeId: null,
        remaining: input,
        stageTotal: input,
        kvMiB: kvBytes(input + m.output) / 2 ** 20,
        generated: 0,
        completedAt: null,
        cacheHit: false,
      })
    }
  }
  for (const j of s.jobs) {
    if (j.phase === 'done') continue
    if (s.time - j.born > j.deadline) {
      j.phase = 'done'
      j.completedAt = s.time
      s.lost++
      s.integrity -= 8
      event(
        s,
        `Request ${j.id.toString().padStart(3, '0')} missed its deadline. Inspect the bottleneck.`,
        'warning',
      )
    }
  }
  for (const j of s.jobs.filter((j) => j.phase === 'queued')) {
    const metrics = getGameMetrics(s)
    if (metrics.used + j.kvMiB > metrics.memory) break
    const candidates = s.units.filter(
      (u) =>
        u.type === 'prefill' &&
        u.offlineUntil <= s.time &&
        !s.jobs.some(
          (job) => job.phase === 'prefill' && job.prefillId === u.id,
        ),
    )
    const worker =
      (s.prefixReuse && j.prefix
        ? candidates.find((u) => u.prefixes.includes(j.prefix!))
        : null) || candidates[0]
    if (!worker) break
    const hit = Boolean(
      s.prefixReuse && j.prefix && worker.prefixes.includes(j.prefix),
    )
    j.cacheHit = hit
    if (hit) s.prefixHits++
    j.phase = 'prefill'
    j.prefillId = worker.id
    j.remaining = j.input - (hit ? Math.min(1536, j.input * 0.75) : 0)
    j.stageTotal = j.remaining
  }
  for (const j of s.jobs.filter((j) => j.phase === 'prefill')) {
    const worker = s.units.find((u) => u.id === j.prefillId)
    if (!worker || worker.offlineUntil > s.time) continue
    j.remaining -= prefillRate(worker) * dt
    if (j.remaining <= 0) {
      j.phase = 'ready'
      j.remaining = 0
      if (s.prefixReuse && j.prefix && !worker.prefixes.includes(j.prefix))
        worker.prefixes = [j.prefix, ...worker.prefixes].slice(0, 3)
    }
  }
  for (const j of s.jobs.filter((j) => j.phase === 'ready')) {
    const candidates = s.units.filter(
      (u) =>
        u.type === 'decode' &&
        u.offlineUntil <= s.time &&
        activeOn(s, u.id) < decodeSlots(s, u),
    )
    candidates.sort((a, b) => activeOn(s, a.id) - activeOn(s, b.id))
    const worker = candidates[0]
    if (!worker) continue
    j.phase = 'transfer'
    j.decodeId = worker.id
    j.remaining = kvBytes(j.input) / 2 ** 20
    j.stageTotal = j.remaining
  }
  const transferring = s.jobs.filter((j) => j.phase === 'transfer')
  const bandwidth = getGameMetrics(s).bandwidth
  // Sizes are analytical; 45× stretched transfer time makes the network leg
  // playable. Game compute rates, currency and power are balance parameters.
  const perTransfer =
    ((bandwidth / 8) * 0.7 * 1e9) /
    2 ** 20 /
    45 /
    Math.max(1, transferring.length)
  for (const j of transferring) {
    const worker = s.units.find((u) => u.id === j.decodeId)
    if (!worker || worker.offlineUntil > s.time) continue
    j.remaining -= perTransfer * dt
    if (j.remaining <= 0) {
      j.phase = 'decode'
      j.remaining = j.output
      j.stageTotal = j.output
    }
  }
  for (const u of s.units.filter(
    (u) => u.type === 'decode' && u.offlineUntil <= s.time,
  )) {
    const jobs = s.jobs.filter(
      (j) => j.phase === 'decode' && j.decodeId === u.id,
    )
    const rate =
      (decodeRate(u) * (s.batching ? 1 + 0.55 * (jobs.length - 1) : 1)) /
      Math.max(1, jobs.length)
    for (const j of jobs) {
      const amount = Math.min(j.remaining, rate * dt)
      j.remaining -= amount
      j.generated += amount
      s.generated += amount
      if (j.remaining <= 0.000001) {
        s.generated += j.output - j.generated
        j.generated = j.output
        j.remaining = 0
        j.phase = 'done'
        j.completedAt = s.time
        s.served++
        s.credits += 12
        s.latencyTotal += s.time - j.born
        s.score +=
          100 +
          Math.max(0, Math.round((j.deadline - (s.time - j.born)) * 5)) +
          (j.cacheHit ? 15 : 0)
        if (s.served === 1 || s.served % 5 === 0)
          event(
            s,
            `${s.served} requests delivered. +12 credits per completed request.`,
            'good',
          )
      }
    }
  }
  s.jobs = s.jobs.filter(
    (j) =>
      j.phase !== 'done' ||
      (j.completedAt !== null && s.time - j.completedAt < 1.2),
  )
  s.integrity = Math.max(0, Math.min(100, s.integrity))
  if (s.integrity <= 0) {
    s.phase = 'defeat'
    s.reason =
      'The service lost integrity. Add capacity at the bottleneck and try again.'
  } else if (s.served >= m.goal && requirementsMet(s)) {
    s.phase = 'victory'
    s.reason = 'All mission objectives met. Your service held the line.'
    s.score += Math.round(
      s.integrity * 4 + Math.max(0, m.duration - s.time) * 2,
    )
  } else if (s.time >= m.duration) {
    s.phase = 'defeat'
    s.reason =
      'The shift ended before all objectives were complete. Try a different capacity balance.'
  }
}
export function advanceGame(state: GameState, dt: number): GameState {
  if (state.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return state
  const s = clone(state)
  let remaining = Math.min(dt, 5)
  while (remaining > 0.000001 && s.phase === 'playing') {
    const part = Math.min(0.1, remaining)
    step(s, part)
    remaining -= part
  }
  return s
}

export interface Progress {
  stars: Record<string, number>
  best: Record<string, number>
}
export function readProgress(raw: string | null): Progress {
  const clean: Progress = { stars: {}, best: {} }
  try {
    const value = JSON.parse(raw || '{}')
    for (const m of [...MISSIONS, SANDBOX]) {
      const stars = value?.stars?.[m.id],
        best = value?.best?.[m.id]
      if (Number.isInteger(stars) && stars >= 0 && stars <= 3)
        clean.stars[m.id] = stars
      if (Number.isFinite(best) && best >= 0 && best <= 1e8)
        clean.best[m.id] = Math.floor(best)
    }
  } catch {
    /* Corrupt browser-local progress never blocks the game. */
  }
  return clean
}
export function medal(s: GameState) {
  return s.integrity >= 90 && getGameMetrics(s).averageLatency < 10
    ? 3
    : s.integrity >= 65
      ? 2
      : 1
}
export function formatTime(seconds: number) {
  const value = Math.max(0, Math.floor(seconds))
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`
}
