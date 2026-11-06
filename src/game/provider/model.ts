import type { Layer } from '../../content'

/** Playable capacity model, not a scheduler implementation or a GPU benchmark. */
export type Tenant = 'train' | 'serve' | 'tune'
export type Policy =
  | 'fair'
  | 'headroom'
  | 'qos'
  | 'cache'
  | 'placement'
  | 'checkpoint'
  | 'isolation'
  | 'envelope'
export type ProviderConfig = Record<Policy, boolean>
export const POLICIES: Policy[] = [
  'fair',
  'headroom',
  'qos',
  'cache',
  'placement',
  'checkpoint',
  'isolation',
  'envelope',
]
export const COSTS: Record<Policy, number> = {
  fair: 35,
  headroom: 25,
  qos: 35,
  cache: 30,
  placement: 40,
  checkpoint: 25,
  isolation: 35,
  envelope: 25,
}
export const TENANTS: Record<
  Tenant,
  { name: string; color: string; quota: number }
> = {
  train: { name: 'Nova · pre-training', color: '#9bc9e7', quota: 24 },
  serve: { name: 'Orbit · inference', color: '#b5d79b', quota: 24 },
  tune: { name: 'Forge · post-training', color: '#c4abe9', quota: 16 },
}
export const WINDOW = 120,
  BURST_AT = 18,
  GPU_GIB = 80
const COHORT = 3,
  REQUESTS = 8,
  CACHE_GIB = 128
export interface Lease {
  id: number
  tenant: Tenant
  state: 'queued' | 'staging' | 'running' | 'checkpoint' | 'done'
  server: number
  slots: number[]
  gpus: number
  peakGiB: number
  artifactGiB: number
  version: string
  created: number
  admitted: number
  completed: number
  remaining: number
  work: number
  transferred: number
  transferSize: number
  local: boolean
  rate: number
  borrowed: boolean
  drain: boolean
  reclaim: boolean
  snapshot: number
  isolated: boolean
  epoch: number
  cohorts: number
  tries: number
}
export interface CacheEntry {
  key: string
  gib: number
  touched: number
}
export interface ProviderState {
  status: 'ready' | 'running' | 'paused' | 'won' | 'lost'
  time: number
  credits: number
  config: ProviderConfig
  epoch: number
  jobs: Lease[]
  cache: CacheEntry[][]
  nextId: number
  round: number
  completed: Record<Tenant, number>
  requested: Record<Tenant, number>
  served: number
  usefulGpuSeconds: number
  leasedGpuSeconds: number
  wastedGpuSeconds: number
  wireGiB: number
  localGiB: number
  cacheHits: number
  cacheMisses: number
  qosGiB: number
  drains: number
  restores: number
  oom: number
  queuedSeconds: number
  admissions: number
  burstReady: number | null
  burstProtected: boolean
  evidence: Record<Layer, boolean>
  visited: Record<Layer, boolean>
  feedback: string
  events: { time: number; message: string }[]
}
export type ProviderAction =
  | { type: 'run' | 'pause' | 'reset' | 'repack' }
  | { type: 'tick'; dt: number }
  | { type: 'buy'; policy: Policy }
  | { type: 'visit'; level: Layer }

export function profile(tenant: Tenant, validated: boolean) {
  // Customer-declared manifests. The alternate tuning profile is explicitly approved.
  const gpus = tenant === 'serve' ? 2 : tenant === 'tune' && !validated ? 4 : 8
  const stateGiB = tenant === 'train' ? 448 : tenant === 'serve' ? 64 : 320
  return {
    gpus,
    peakGiB: stateGiB / gpus + 16,
    artifactGiB: tenant === 'train' ? 96 : tenant === 'serve' ? 16 : 80,
    work: tenant === 'train' ? 12 : tenant === 'serve' ? COHORT : 8,
  }
}
const emptyConfig = (): ProviderConfig =>
  Object.fromEntries(POLICIES.map((p) => [p, false])) as ProviderConfig
function makeJob(id: number, tenant: Tenant, time: number): Lease {
  const p = profile(tenant, false)
  return {
    id,
    tenant,
    state: 'queued',
    server: -1,
    slots: [],
    ...p,
    version: `${tenant}:artifact-v1`,
    created: time,
    admitted: -1,
    completed: -1,
    remaining: p.work,
    transferred: 0,
    transferSize: p.artifactGiB,
    local: false,
    rate: 0,
    borrowed: false,
    drain: false,
    reclaim: false,
    snapshot: 0,
    isolated: false,
    epoch: 0,
    cohorts: 0,
    tries: 0,
  }
}
function log(s: ProviderState, message: string) {
  s.feedback = message
  s.events = [{ time: s.time, message }, ...s.events].slice(0, 12)
}
export function createProvider(): ProviderState {
  const jobs: Lease[] = []
  // Eight already warm replicas, one on every server: aggregate spare capacity
  // is insufficient evidence that an eight-rank, single-domain gang fits.
  for (let i = 0; i < 8; i++) {
    const j = makeJob(i + 1, 'serve', 0)
    Object.assign(j, {
      state: 'running',
      server: i,
      slots: [0, 1],
      admitted: 0,
      remaining: COHORT - (i % 4) * 0.4,
      transferred: 16,
    })
    jobs.push(j)
  }
  for (const tenant of ['train', 'tune'] as Tenant[])
    for (let i = 0; i < 3; i++) jobs.push(makeJob(jobs.length + 1, tenant, 0))
  return {
    status: 'ready',
    time: 0,
    credits: 280,
    config: emptyConfig(),
    epoch: 0,
    jobs,
    cache: Array.from({ length: 8 }, () => []),
    nextId: 15,
    round: 0,
    completed: { train: 0, serve: 0, tune: 0 },
    requested: { train: 3, serve: 8, tune: 3 },
    served: 0,
    usefulGpuSeconds: 0,
    leasedGpuSeconds: 0,
    wastedGpuSeconds: 0,
    wireGiB: 0,
    localGiB: 0,
    cacheHits: 0,
    cacheMisses: 0,
    qosGiB: 0,
    drains: 0,
    restores: 0,
    oom: 0,
    queuedSeconds: 0,
    admissions: 0,
    burstReady: null,
    burstProtected: false,
    evidence: { fleet: false, pod: false, rack: false, gpu: false },
    visited: { fleet: true, pod: false, rack: false, gpu: false },
    feedback:
      '48 GPUs are free, but no eight-GPU NVLink domain is free. Inspect Server placement.',
    events: [],
  }
}
export const allocated = (s: ProviderState) =>
  s.jobs.filter((j) => j.slots.length > 0)
export function gpuOwners(s: ProviderState): (Tenant | null)[] {
  const owners: (Tenant | null)[] = Array(64).fill(null)
  for (const j of allocated(s))
    for (const slot of j.slots) owners[j.server * 8 + slot] = j.tenant
  return owners
}
export function providerMetrics(s: ProviderState) {
  const owners = gpuOwners(s),
    leases = allocated(s)
  const held = (tenant: Tenant) => owners.filter((o) => o === tenant).length
  const ready = s.jobs.filter(
    (j) => j.tenant === 'serve' && j.state === 'running',
  ).length
  return {
    owners,
    used: owners.filter(Boolean).length,
    free: owners.filter((o) => !o).length,
    emptyServers: Array.from({ length: 8 }, (_, i) =>
      owners.slice(i * 8, i * 8 + 8).every((o) => !o),
    ).filter(Boolean).length,
    held: { train: held('train'), serve: held('serve'), tune: held('tune') },
    ready,
    desired: s.time >= BURST_AT ? 12 : 8,
    queued: s.jobs.filter((j) => j.state === 'queued').length,
    utilization: s.time ? s.leasedGpuSeconds / (64 * s.time) : 16 / 64,
    efficiency: s.leasedGpuSeconds
      ? s.usefulGpuSeconds / s.leasedGpuSeconds
      : 0,
    contracts: Object.values(s.evidence).filter(Boolean).length,
    wireRates: [0, 1].map((p) =>
      leases
        .filter((j) => Math.floor(j.server / 4) === p && !j.local)
        .reduce((v, j) => v + j.rate, 0),
    ),
    queueMean: s.admissions ? s.queuedSeconds / s.admissions : 0,
    // Dedicated GPU leases, illustrative tariff $2/GPU-hour, never engineering credits.
    bill: (s.leasedGpuSeconds * 2) / 3600,
  }
}
function release(j: Lease) {
  j.server = -1
  j.slots = []
  j.rate = 0
}
function requeue(s: ProviderState, j: Lease, saved: boolean) {
  if (j.tenant !== 'serve') {
    const completedWork = j.work - j.remaining
    if (!saved) s.wastedGpuSeconds += completedWork * j.gpus
    j.remaining = saved ? Math.max(0.1, j.work - j.snapshot) : j.work
    if (saved) s.restores++
  } else j.remaining = COHORT
  release(j)
  j.state = 'queued'
  j.created = s.time
  j.drain = false
  j.reclaim = false
  j.transferred = 0
  j.tries++
}
function cacheKey(j: Lease) {
  return `${j.tenant}|${j.version}`
}
function storeCache(s: ProviderState, j: Lease) {
  if (!s.config.cache || j.local) return
  const entries = s.cache[j.server],
    key = cacheKey(j)
  if (entries.some((e) => e.key === key)) return
  while (entries.reduce((sum, e) => sum + e.gib, 0) + j.artifactGiB > CACHE_GIB)
    entries.shift()
  entries.push({ key, gib: j.artifactGiB, touched: s.time })
}
function finishBatch(s: ProviderState, j: Lease) {
  s.completed[j.tenant]++
  s.credits += 20
  s.usefulGpuSeconds += j.work * j.gpus
  if (j.tenant === 'train' && s.config.placement && j.gpus === 8)
    s.evidence.rack = true
  if (j.tenant === 'tune' && j.isolated && j.peakGiB <= GPU_GIB && j.gpus === 8)
    s.evidence.gpu = true
  log(
    s,
    `${TENANTS[j.tenant].name.split(' · ')[0]} job #${j.id}: checkpoint acknowledged; ${j.gpus} GPUs released.`,
  )
  j.state = 'done'
  j.completed = s.time
  release(j)
  if (s.requested[j.tenant] < 6) {
    s.jobs.push(makeJob(s.nextId++, j.tenant, s.time))
    s.requested[j.tenant]++
  }
}
function markRepack(s: ProviderState) {
  for (let p = 0; p < 2; p++) {
    const leases = allocated(s).filter(
      (j) => j.tenant === 'serve' && Math.floor(j.server / 4) === p,
    )
    if (
      leases.some((j) => j.drain) ||
      leases.filter((j) => j.state === 'running').length < 2
    )
      continue
    // Move only old leases. New leases never get repeatedly evicted by this plan.
    const old = leases
      .filter((j) => j.epoch < s.epoch)
      .sort((a, b) => b.server - a.server)[0]
    if (old) old.drain = true
  }
}
function admit(s: ProviderState) {
  const tenants: Tenant[] = s.config.fair
    ? [
        'serve',
        ...((s.round % 2 ? ['tune', 'train'] : ['train', 'tune']) as Tenant[]),
      ]
    : ['train', 'tune', 'serve']
  // First allocate fitting work within every nominal quota. Only a second
  // pass may borrow idle entitlement, so queue order cannot spend it first.
  for (const borrow of s.config.fair ? [false, true] : [false]) {
    for (const tenant of tenants) {
      for (const j of s.jobs.filter(
        (job) => job.tenant === tenant && job.state === 'queued',
      )) {
        const p = profile(tenant, s.config.envelope),
          m = providerMetrics(s)
        if (!borrow && m.held[tenant] + p.gpus > TENANTS[tenant].quota) continue
        if (borrow && m.held[tenant] + p.gpus <= TENANTS[tenant].quota) continue
        // Lending cannot consume capacity protected for this shift's declared peak.
        const batchHeld = m.held.train + m.held.tune
        if (tenant !== 'serve' && s.config.headroom && batchHeld + p.gpus > 40)
          continue
        const owners = m.owners
        const candidates = Array.from({ length: 8 }, (_, server) => ({
          server,
          slots: Array.from({ length: 8 }, (_, n) => n).filter(
            (n) => !owners[server * 8 + n],
          ),
          cache: s.cache[server].some((e) => e.key === cacheKey(j)),
        })).filter((c) => c.slots.length >= p.gpus)
        if (s.config.placement) {
          const serveByPod = [0, 1].map(
            (pod) =>
              allocated(s).filter(
                (a) => a.tenant === 'serve' && Math.floor(a.server / 4) === pod,
              ).length,
          )
          candidates.sort((a, b) =>
            tenant === 'serve'
              ? serveByPod[Math.floor(a.server / 4)] -
                  serveByPod[Math.floor(b.server / 4)] ||
                a.slots.length - b.slots.length ||
                a.server - b.server
              : Number(b.cache && s.config.cache) -
                  Number(a.cache && s.config.cache) ||
                a.slots.length - b.slots.length ||
                a.server - b.server,
          )
        }
        const c = candidates[0]
        if (!c) continue
        const remaining = j.tries > 0 && j.snapshot > 0 ? j.remaining : p.work
        Object.assign(j, p, {
          state: 'staging',
          server: c.server,
          slots: c.slots.slice(0, p.gpus),
          remaining,
          transferred: 0,
          transferSize: p.artifactGiB,
          local: s.config.cache && c.cache,
          borrowed: m.held[tenant] + p.gpus > TENANTS[tenant].quota,
          admitted: s.time,
          isolated: s.config.isolation,
          epoch: s.epoch,
        })
        s.admissions++
        s.queuedSeconds += s.time - j.created
        if (j.local) {
          s.cacheHits++
          const entries = s.cache[c.server],
            index = entries.findIndex((e) => e.key === cacheKey(j))
          const entry = entries.splice(index, 1)[0]
          entry.touched = s.time
          entries.push(entry)
        } else s.cacheMisses++
      }
    }
  }
  s.round++
}
function step(s: ProviderState, dt: number) {
  const before = s.time
  s.time = Math.min(WINDOW, s.time + dt)
  if (before < BURST_AT && s.time >= BURST_AT) {
    s.burstProtected =
      s.config.headroom && s.config.fair && providerMetrics(s).free >= 8
    for (let i = 0; i < 4; i++)
      s.jobs.push(makeJob(s.nextId++, 'serve', s.time))
    s.requested.serve = 12
    log(
      s,
      'Orbit requests four more two-GPU replicas. Cloud-ready capacity is due within 10 game seconds.',
    )
  }
  markRepack(s)
  const capacity = providerMetrics(s)
  const reclaimFor = (['serve', 'train', 'tune'] as Tenant[]).find((tenant) => {
    const waiting = s.jobs.filter(
      (j) => j.tenant === tenant && j.state === 'queued',
    ).length
    const need = Math.min(
      TENANTS[tenant].quota - capacity.held[tenant],
      waiting * profile(tenant, s.config.envelope).gpus,
    )
    const pending = allocated(s)
      .filter((j) => j.reclaim && j.tenant !== tenant)
      .reduce((n, j) => n + j.gpus, 0)
    return need > capacity.free + pending
  })
  if (s.config.fair && reclaimFor) {
    const victim = allocated(s).find(
      (j) =>
        j.tenant !== 'serve' &&
        j.tenant !== reclaimFor &&
        capacity.held[j.tenant] > TENANTS[j.tenant].quota &&
        !j.reclaim,
    )
    if (victim) {
      if (s.config.checkpoint) victim.reclaim = true
      else {
        log(
          s,
          `Borrowed job #${victim.id} killed to reclaim capacity; uncheckpointed GPU work lost.`,
        )
        requeue(s, victim, false)
      }
    }
  }
  admit(s)
  const leases = allocated(s)
  s.leasedGpuSeconds += leases.reduce((n, j) => n + j.gpus, 0) * dt
  for (const j of leases) j.rate = 0
  // Each Pod has one modeled 100 Gbit/s storage/uplink budget. QoS divides a
  // fixed budget; it does not create bandwidth. GiB/s = Gbit/s * 1e9 / 8 / 2^30.
  const wireCapacity = ((100 * 1e9) / 8 / 2 ** 30) * 0.7
  for (const pod of [0, 1]) {
    const transfers = leases.filter(
      (j) =>
        Math.floor(j.server / 4) === pod &&
        ['staging', 'checkpoint'].includes(j.state) &&
        !j.local,
    )
    const weight = (j: Lease) => (s.config.qos && j.tenant === 'serve' ? 5 : 1)
    const total = transfers.reduce((n, j) => n + weight(j), 0)
    for (const j of transfers) j.rate = (wireCapacity * weight(j)) / total
  }
  // A cache hit bypasses the shared uplink, not the physical disk budget.
  for (let server = 0; server < 8; server++) {
    const readers = leases.filter(
      (j) => j.server === server && j.local && j.state === 'staging',
    )
    for (const j of readers) j.rate = 20 / readers.length
  }
  for (const j of leases) {
    if (j.state === 'staging' || j.state === 'checkpoint') {
      const amount = Math.min(
        j.transferSize - j.transferred,
        (j.rate * dt) / 0.18,
      )
      j.transferred += amount
      if (j.local) s.localGiB += amount
      else {
        s.wireGiB += amount
        if (s.config.qos) s.qosGiB += amount
      }
      if (j.transferred >= j.transferSize - 1e-8) {
        if (j.state === 'checkpoint') {
          if (j.reclaim) {
            log(
              s,
              `Job #${j.id}: customer checkpoint acknowledged, borrowed lease returned.`,
            )
            requeue(s, j, true)
          } else finishBatch(s, j)
        } else {
          storeCache(s, j)
          j.state = 'running'
          j.rate = 0
        }
      }
      continue
    }
    if (j.state !== 'running') continue
    if (j.peakGiB > GPU_GIB) {
      s.oom++
      log(
        s,
        `Forge #${j.id} rejected at runtime: ${j.peakGiB} GiB/rank exceeds ${GPU_GIB} GiB. Select its approved eight-GPU manifest.`,
      )
      requeue(s, j, false)
      continue
    }
    j.remaining = Math.max(0, j.remaining - dt)
    if (j.tenant === 'serve') {
      s.usefulGpuSeconds += dt * j.gpus
      if (j.remaining <= 0) {
        s.served += REQUESTS
        s.completed.serve++
        s.credits += 2
        j.cohorts++
        if (j.drain) {
          s.drains++
          requeue(s, j, true)
        } else j.remaining += COHORT // persistent warm replica; no repeat weight load
      }
    } else if (
      j.remaining <= 0 ||
      (j.reclaim &&
        Math.floor((j.work - j.remaining) / 2) >
          Math.floor((j.work - j.remaining - dt) / 2))
    ) {
      j.snapshot = j.work - j.remaining
      j.state = 'checkpoint'
      j.transferred = 0
      j.transferSize = j.tenant === 'train' ? 8 : 4
      j.local = false // acknowledgment requires tenant-scoped durable object storage
    }
  }
  const m = providerMetrics(s)
  if (s.time >= BURST_AT && m.ready >= 12 && s.burstReady === null) {
    s.burstReady = s.time - BURST_AT
    log(
      s,
      `Orbit peak ready: 12 replicas across both Pods, ${s.burstReady.toFixed(1)} game seconds after request.`,
    )
  }
  if (
    s.completed.train >= 2 &&
    s.completed.tune >= 2 &&
    s.served >= 128 &&
    s.burstReady !== null &&
    s.burstReady <= 10 &&
    s.config.fair &&
    s.config.headroom &&
    s.burstProtected
  )
    s.evidence.fleet = true
  if (
    s.cacheHits > 0 &&
    s.qosGiB >= 32 &&
    s.completed.train + s.completed.tune >= 2
  )
    s.evidence.pod = true
  if (
    Object.values(s.evidence).every(Boolean) &&
    Object.values(s.visited).every(Boolean) &&
    s.completed.train >= 2 &&
    s.completed.tune >= 2
  ) {
    s.status = 'won'
    log(
      s,
      'Cloud shift complete: three customers made useful progress; all four physical-level contracts verified.',
    )
  } else if (s.time >= WINDOW) {
    s.status = 'lost'
    log(
      s,
      'Shift ended. Reset to compare a placement and admission plan that meets the peak capacity target.',
    )
  }
}
export function advanceProvider(
  state: ProviderState,
  dt: number,
): ProviderState {
  if (state.status !== 'running' || !Number.isFinite(dt) || dt <= 0)
    return state
  const s = structuredClone(state)
  let left = Math.min(dt, 4)
  while (left > 1e-8 && s.status === 'running') {
    const slice = Math.min(0.1, left, WINDOW - s.time)
    if (slice <= 0) {
      s.status = 'lost'
      break
    }
    step(s, slice)
    left -= slice
  }
  return s
}
export function providerReducer(
  state: ProviderState,
  action: ProviderAction,
): ProviderState {
  if (action.type === 'reset') return createProvider()
  if (action.type === 'tick') return advanceProvider(state, action.dt)
  if (action.type === 'run')
    return ['ready', 'paused'].includes(state.status)
      ? { ...state, status: 'running' }
      : state
  if (action.type === 'pause')
    return state.status === 'running' ? { ...state, status: 'paused' } : state
  if (action.type === 'visit')
    return { ...state, visited: { ...state.visited, [action.level]: true } }
  const s = structuredClone(state)
  if (action.type === 'buy') {
    if (
      s.config[action.policy] ||
      s.credits < COSTS[action.policy] ||
      ['won', 'lost'].includes(s.status)
    )
      return state
    s.config[action.policy] = true
    s.credits -= COSTS[action.policy]
    if (s.status === 'running') s.status = 'paused'
    log(
      s,
      'Policy installed. Existing leases retain their placement and memory manifest; resume to apply it to admissions.',
    )
  } else if (
    action.type === 'repack' &&
    s.config.placement &&
    !['won', 'lost'].includes(s.status)
  ) {
    s.epoch++
    log(
      s,
      'Rolling plan queued: finish one replica cohort per Pod, then repack into occupied servers. At least one ready replica per Pod stays serving.',
    )
  }
  return s
}
