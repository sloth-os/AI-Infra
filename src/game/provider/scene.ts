import type { Layer } from '../../content'
import type { ContextFrame } from '../../learning/infrastructure/context'
import { PROVIDER_LESSONS } from './catalog.ts'
import { allocated, GPU_GIB, gpuOwners, TENANTS } from './model.ts'
import type { Lease, ProviderState, Tenant } from './model'

export const OWNER = { train: 1, serve: 2, tune: 3 } as const
export function inspectLease(s: ProviderState, tenant: Tenant) {
  return (
    s.jobs.find(
      (j) => j.tenant === tenant && j.state !== 'queued' && j.state !== 'done',
    ) ||
    s.jobs.find((j) => j.tenant === tenant && j.state === 'queued') ||
    s.jobs.filter((j) => j.tenant === tenant).at(-1)!
  )
}
export function leaseProgress(j: Lease) {
  return j.state === 'queued'
    ? 0
    : j.state === 'done'
      ? 1
      : j.state === 'staging' || j.state === 'checkpoint'
        ? j.transferred / Math.max(1, j.transferSize)
        : 1 - j.remaining / j.work
}
export function providerFrame(
  s: ProviderState,
  layer: Layer,
  tenant: Tenant,
  server: number,
  gpu: number,
): ContextFrame {
  const j = inspectLease(s, tenant),
    lesson = PROVIDER_LESSONS[layer],
    owners = gpuOwners(s)
  const lease = allocated(s).find(
    (l) => l.server === server && l.slots.includes(gpu),
  )
  const owner = lease ? OWNER[lease.tenant] : 0
  const peak = lease?.peakGiB || 0
  const stage = ['queued', 'staging', 'running', 'checkpoint', 'done'].indexOf(
    j.state,
  )
  const values =
    layer === 'fleet'
      ? owners.map((o) => (o ? OWNER[o] : 0))
      : layer === 'pod'
        ? owners
            .slice(
              Math.floor(server / 4) * 32,
              Math.floor(server / 4) * 32 + 32,
            )
            .map((o) => (o ? OWNER[o] : 0))
        : layer === 'rack'
          ? owners
              .slice(server * 8, server * 8 + 8)
              .map((o) => (o ? OWNER[o] : 0))
          : Array.from(
              { length: Math.max(32, Math.ceil((peak / GPU_GIB) * 32)) },
              (_, i) => (i >= 32 ? -1 : i / 32 < peak / GPU_GIB ? owner : 0),
            )
  return {
    deviceBinding: {
      server: j.server,
      viewServer: server,
      gpu,
      phase: j.state,
    },
    key: `cloud-provider:${layer}:${server}:${gpu}:${j.id}:${j.state}`,
    id: 'cloud-provider',
    kind: 'lifecycle',
    layer,
    title: 'Cloud provider · physical capacity',
    color: TENANTS[tenant].color,
    stage,
    steps: [
      { title: 'Resource envelope / admission', layer: 'fleet' },
      { title: 'Devices bound / artifacts staged', layer: 'pod' },
      { title: 'Customer runtime computes', layer: 'gpu' },
      { title: 'Durable checkpoint acknowledged', layer: 'pod' },
      { title: 'Lease returned / metered', layer: 'rack' },
    ],
    playing:
      s.status === 'running' && j.state !== 'queued' && j.state !== 'done',
    duration: j.work,
    node:
      layer === 'fleet'
        ? j.state === 'queued'
          ? 'scheduler'
          : 'storage'
        : layer === 'pod'
          ? 'fabric'
          : layer === 'rack'
            ? 'nvlink'
            : 'hbm',
    traffic:
      j.state === 'running' && tenant !== 'serve' ? 'collectives' : 'requests',
    heading:
      layer === 'gpu'
        ? `S${server + 1} · GPU ${gpu + 1}: ${peak} / ${GPU_GIB} GiB`
        : lesson.title,
    explanation: lesson.process,
    payload:
      layer === 'gpu'
        ? `${lease ? TENANTS[lease.tenant].name : 'Unleased device'} · ${peak} GiB peak per rank · each tile = 2.5 GiB · ${lease?.isolated ? 'dedicated tenant device boundary' : 'baseline runtime boundary'}`
        : `${TENANTS[tenant].name} #${j.id}: ${j.state} · ${layer === 'fleet' ? '64 real device claims across two Pods' : layer === 'pod' ? `Pod ${Math.floor(server / 4) === 0 ? 'A' : 'B'}: four servers × eight devices; first four bays highlighted` : `Server ${server + 1}: eight local GPU claims`} · blue Nova / green Orbit / purple Forge / dim idle`,
    scope:
      'Playable 64-GPU district on reference infrastructure; other background hardware is outside this allocation. Game timing, not a vendor benchmark.',
    boundary:
      'Cloud: physical devices, leases, network, storage, identity. Model provider: model, runtime, user APIs, parallelism and checkpoint semantics.',
    pattern:
      j.state === 'checkpoint'
        ? 'checkpoint'
        : j.state === 'staging'
          ? 'weights'
          : 'placement',
    count: values.length,
    supplementRole: 'cloud-tenants',
    values,
    applied: s.config.placement,
    pressure: peak / GPU_GIB,
    probability: 1,
    metrics: [
      { label: 'Per-device budget', value: '80 GiB (toy)' },
      { label: 'Scope', value: '64 dedicated GPU slots' },
    ],
    workload: 'issue',
  }
}
