import type { Layer } from '../../content'
import type { ContextFrame } from '../infrastructure/context'
import {
  advanceProvider,
  createProvider,
  POLICIES,
  providerMetrics,
  providerReducer,
  TENANTS,
} from '../../game/provider/model.ts'
import type { Policy, ProviderState, Tenant } from '../../game/provider/model'
import {
  inspectLease,
  leaseProgress,
  providerFrame,
} from '../../game/provider/scene.ts'
import { PROVIDER_LESSONS } from '../../game/provider/catalog.ts'

export const PROVIDER_LEVELS: Layer[] = ['fleet', 'pod', 'rack', 'gpu']
export const PROVIDER_STEPS = [
  { title: 'Capacity commitments', layer: 'fleet' as Layer },
  { title: 'Artifacts and fabric', layer: 'pod' as Layer },
  { title: 'Placement and recovery', layer: 'rack' as Layer },
  { title: 'Memory and tenant boundary', layer: 'gpu' as Layer },
]
export interface ProviderLesson {
  stage: number
  playing: boolean
  time: number
  policies: number
  side: 'baseline' | 'plan'
  tenant: Tenant
  server: number // -1 follows the selected tenant's lease
  gpu: number
  speed: 1 | 2 | 4
  panel: 'service' | 'lab' | 'sources'
}
export const defaultProviderLesson = (): ProviderLesson => ({
  stage: 0,
  playing: false,
  time: 0,
  policies: 255,
  side: 'plan',
  tenant: 'train',
  server: -1,
  gpu: 0,
  speed: 1,
  panel: 'lab',
})
export const hasPolicy = (view: ProviderLesson, policy: Policy) =>
  !!(view.policies & (1 << POLICIES.indexOf(policy)))
export const policyMask = (policies: Policy[]) =>
  policies.reduce((mask, p) => mask | (1 << POLICIES.indexOf(p)), 0)
export function sanitizeProviderLesson(
  raw: Partial<ProviderLesson>,
): ProviderLesson {
  const d = defaultProviderLesson()
  const integer = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v)
      ? Math.min(max, Math.max(min, Math.round(v)))
      : fallback
  return {
    ...d,
    stage: integer(raw.stage, 0, 0, 3),
    time:
      typeof raw.time === 'number' && Number.isFinite(raw.time)
        ? Math.min(60, Math.max(0, raw.time))
        : 0,
    policies: integer(raw.policies, 255, 0, 255),
    side: raw.side === 'baseline' ? 'baseline' : 'plan',
    tenant:
      raw.tenant && ['train', 'serve', 'tune'].includes(raw.tenant)
        ? raw.tenant
        : d.tenant,
    server: integer(raw.server, -1, -1, 7),
    gpu: integer(raw.gpu, 0, 0, 7),
    speed: raw.speed === 2 || raw.speed === 4 ? raw.speed : 1,
    panel:
      raw.panel === 'service' || raw.panel === 'sources' ? raw.panel : 'lab',
    playing: raw.playing === true,
  }
}
export interface ProviderReplay {
  baseline: ProviderState[]
  plan: ProviderState[]
  end: number
  mask: number
}
const replays = new Map<number, ProviderReplay>()
const SAMPLE = 0.25,
  HORIZON = 60
/** Both policies run the same initial manifests, arrivals and elapsed time.
 * End at the candidate's verified goal or 60 teaching seconds, whichever is first.
 * Never advance the baseline farther than the candidate in a comparison. */
export function providerReplay(mask: number): ProviderReplay {
  const normalized = sanitizeProviderLesson({ policies: mask }).policies
  const cached = replays.get(normalized)
  if (cached) return cached
  let baseline = createProvider(),
    plan = createProvider()
  for (const policy of POLICIES)
    if (normalized & (1 << POLICIES.indexOf(policy)))
      plan = providerReducer(plan, { type: 'buy', policy })
  for (const level of PROVIDER_LEVELS) {
    baseline = providerReducer(baseline, { type: 'visit', level })
    plan = providerReducer(plan, { type: 'visit', level })
  }
  if (plan.config.placement) plan = providerReducer(plan, { type: 'repack' })
  baseline = providerReducer(baseline, { type: 'run' })
  plan = providerReducer(plan, { type: 'run' })
  const replay: ProviderReplay = {
    baseline: [baseline],
    plan: [plan],
    end: 0,
    mask: normalized,
  }
  while (plan.time < HORIZON - 1e-8 && plan.status === 'running') {
    const step = Math.min(SAMPLE, HORIZON - plan.time)
    const next = advanceProvider(plan, step)
    // Use identical integration steps, avoiding tiny floating-point differences
    // that could shift a cohort completion across a sample boundary.
    baseline = advanceProvider(
      baseline,
      next.status === 'won' ? Number((next.time - plan.time).toFixed(8)) : step,
    )
    plan = next
    replay.plan.push(plan)
    replay.baseline.push(baseline)
  }
  replay.end = Number(plan.time.toFixed(8))
  if (replays.size >= 4) replays.delete(replays.keys().next().value!)
  replays.set(normalized, replay)
  return replay
}
export function replaySnapshot(view: ProviderLesson) {
  const replay = providerReplay(view.policies),
    time = Math.max(0, Math.min(replay.end, view.time))
  // Last interval can be shorter when a goal completes inside a sample.
  let index = Math.min(
    replay.plan.length - 1,
    Math.floor((time + 1e-8) / SAMPLE),
  )
  if (time >= replay.end - 1e-8) index = replay.plan.length - 1
  const baseline = replay.baseline[index],
    plan = replay.plan[index],
    state = view.side === 'baseline' ? baseline : plan
  const next = (view.side === 'baseline' ? replay.baseline : replay.plan)[
    Math.min(index + 1, replay.plan.length - 1)
  ]
  const job = inspectLease(state, view.tenant),
    nextJob = inspectLease(next, view.tenant)
  const fraction =
    next.time > state.time
      ? Math.max(0, Math.min(1, (time - state.time) / (next.time - state.time)))
      : 0
  const start = leaseProgress(job),
    end = leaseProgress(nextJob)
  const progress =
    job.id === nextJob.id && job.state === nextJob.state && end >= start
      ? start + (end - start) * fraction
      : start
  const server = view.server >= 0 ? view.server : Math.max(0, job.server)
  return {
    replay,
    time,
    index,
    baseline,
    plan,
    state,
    job,
    server,
    progress,
    metrics: providerMetrics(state),
  }
}
export function providerVisualKey(view: ProviderLesson, layer: Layer) {
  const r = replaySnapshot(view)
  return `${layer}|${view.playing}|${view.side}|${view.tenant}|${r.server}:${view.gpu}|${view.policies}|${r.state.jobs.map((j) => `${j.id}:${j.state}:${j.server}:${j.slots.join('.')}:${j.peakGiB}:${j.isolated}`).join(',')}|${r.state.served}:${r.state.completed.train}:${r.state.completed.tune}:${r.state.cacheHits}`
}
export function providerLessonFrame(
  view: ProviderLesson,
  layer: Layer,
): ContextFrame {
  const r = replaySnapshot(view),
    f = providerFrame(r.state, layer, view.tenant, r.server, view.gpu)
  const m = r.metrics,
    lesson = PROVIDER_LESSONS[layer]
  return {
    ...f,
    kind: 'provider',
    key: `provider-learning:${layer}:${r.server}:${view.gpu}:${r.job.id}:${r.job.state}`,
    title: 'Cloud provider scenario',
    stage: PROVIDER_LEVELS.indexOf(layer),
    steps: PROVIDER_STEPS,
    playing: view.playing && view.time < r.replay.end,
    duration: r.replay.end,
    heading:
      layer === 'fleet'
        ? 'Commit capacity across three model providers.'
        : layer === 'pod'
          ? 'Deliver artifacts through a bounded fabric.'
          : layer === 'rack'
            ? 'Make free devices form a runnable gang.'
            : f.heading,
    explanation: lesson.process,
    payload: `${view.side === 'baseline' ? 'Baseline' : 'Your plan'} · ${f.payload}`,
    scope:
      '64-slot teaching district · paired replay at the same elapsed time · synthetic manifests and timing · other hardware is reference',
    metrics:
      layer === 'fleet'
        ? [
            { label: 'Leased / physical GPUs', value: `${m.used} / 64` },
            {
              label: 'Train / tune jobs',
              value: `${r.state.completed.train} / ${r.state.completed.tune}`,
            },
            { label: 'API requests delivered', value: String(r.state.served) },
          ]
        : layer === 'pod'
          ? [
              {
                label: 'Pod A wire rate',
                value: `${m.wireRates[0].toFixed(2)} GiB/s`,
              },
              {
                label: 'Pod B wire rate',
                value: `${m.wireRates[1].toFixed(2)} GiB/s`,
              },
              { label: 'Local cache hits', value: String(r.state.cacheHits) },
            ]
          : layer === 'rack'
            ? [
                { label: 'Free GPU slots', value: String(m.free) },
                {
                  label: 'Empty local domains',
                  value: `${m.emptyServers} / 8`,
                },
                {
                  label: 'Replica cohorts drained',
                  value: String(r.state.drains),
                },
              ]
            : f.metrics.concat({
                label: 'Runtime OOM events',
                value: String(r.state.oom),
              }),
  }
}
export function resourceEnvelope(view: ProviderLesson) {
  const r = replaySnapshot(view),
    p = r.job
  return {
    tenant: TENANTS[view.tenant].name.split(' · ')[0],
    workload:
      view.tenant === 'train'
        ? 'pre-training'
        : view.tenant === 'tune'
          ? 'post-training'
          : 'inference',
    approvedProfiles:
      view.tenant === 'tune'
        ? [
            { gpus: 4, peakGiBPerDevice: 96 },
            { gpus: 8, peakGiBPerDevice: 56 },
          ]
        : [{ gpus: p.gpus, peakGiBPerDevice: p.peakGiB }],
    topology: 'single eight-device server domain',
    artifact: {
      identity: p.version,
      tenantScoped: true,
      bundleGiB: p.artifactGiB,
    },
    recovery:
      view.tenant === 'serve'
        ? 'finish cohort, replace replica'
        : 'customer checkpoint acknowledgment and restore',
  }
}
export function clearProviderParams(url: URL) {
  for (const key of [...url.searchParams.keys()])
    if (key === 'provider' || key.startsWith('cp_'))
      url.searchParams.delete(key)
}
export function providerLessonUrl(href: string, raw: ProviderLesson) {
  const view = sanitizeProviderLesson(raw),
    url = new URL(href)
  for (const key of [...url.searchParams.keys()])
    if (
      [
        'example',
        'examples',
        'stage',
        'issue',
        'hot',
        'lifecycle',
        'campaign',
        'operation',
        'gameLevel',
        'scenario',
      ].includes(key) ||
      /^(ex_|lc_|hot_|issue_)/.test(key)
    )
      url.searchParams.delete(key)
  clearProviderParams(url)
  if (
    !['explore', 'guide', 'journey', 'lab'].includes(
      url.searchParams.get('view') || '',
    )
  )
    url.searchParams.set('view', 'explore')
  url.searchParams.set('learn', 'fusion')
  url.searchParams.set('provider', 'cloud')
  for (const [key, value] of Object.entries(view))
    if (key !== 'playing')
      url.searchParams.set(
        `cp_${key}`,
        String(key === 'time' ? Number(view.time.toFixed(2)) : value),
      )
  return url.toString()
}
export function parseProviderLesson(href: string): ProviderLesson | null {
  const q = new URL(href).searchParams
  if (q.get('provider') !== 'cloud') return null
  const raw: Record<string, unknown> = {}
  for (const key of ['stage', 'time', 'policies', 'server', 'gpu', 'speed'])
    if (q.has(`cp_${key}`)) raw[key] = Number(q.get(`cp_${key}`))
  for (const key of ['side', 'tenant', 'panel'])
    if (q.has(`cp_${key}`)) raw[key] = q.get(`cp_${key}`)
  return sanitizeProviderLesson(raw)
}
