import { defaults, simulate } from '../model.ts'
import type { Parameters, Strategy } from '../model'
import type { Layer, Traffic } from '../content'
export type ChallengeId = 'burst' | 'context' | 'balance' | 'handoff'
export interface LearningChallenge {
  id: ChallengeId
  title: string
  subtitle: string
  brief: string
  hint: string
  initial: Parameters
  strategy: Strategy
  prefixLimit: number
  networkLimit: number
  world: { layer: Layer; traffic: Traffic; node: string }
}
export const learningChallenges: LearningChallenge[] = [
  {
    id: 'burst',
    title: 'Hold the traffic spike',
    subtitle: 'CAPACITY / PREFIX LOCALITY',
    brief:
      'Serve at least 3,200 requests/s on at most 8,000 GPUs with offered load below 90%. Keep 2,048 prompt and 256 output tokens. Up to 80% of this scenario’s prompt tokens are eligible for exact compatible prefix reuse.',
    hint: 'Static batching wastes modeled capacity. Compare continuous batching and reuse eligible prefixes; buying more than 8,000 GPUs exceeds the mission budget.',
    initial: { ...defaults, gpus: 8000, arrivalRate: 3200 },
    strategy: 'static',
    prefixLimit: 80,
    networkLimit: 400,
    world: { layer: 'fleet', traffic: 'requests', node: 'scheduler' },
  },
  {
    id: 'context',
    title: 'Give context a home',
    subtitle: 'KV MEMORY / ADMISSION',
    brief:
      'Keep a 32,768-token prompt, 256 output tokens, and at least 150 requests/s on at most 8,000 GPUs. Set a batch limit that really fits the modeled KV budget, without relying on silent memory clamping. Prefix reuse is unavailable.',
    hint: 'The model admits only 41 sequences at this context length. A requested batch of 256 cannot fit; lower the batch limit while retaining a stable service.',
    initial: {
      ...defaults,
      gpus: 8000,
      arrivalRate: 150,
      inputTokens: 32768,
      batchSize: 256,
    },
    strategy: 'continuous',
    prefixLimit: 0,
    networkLimit: 400,
    world: { layer: 'gpu', traffic: 'kv', node: 'hbm' },
  },
  {
    id: 'balance',
    title: 'Balance the two pools',
    subtitle: 'PREFILL / DECODE PLACEMENT',
    brief:
      'Use split prefill/decode to serve at least 800 requests/s on at most 8,000 GPUs, below 90% offered load. Keep 4,096 prompt and 64 output tokens, with no prefix reuse. The prefill pool starts undersized.',
    hint: 'The capacity is the smaller of the two pools. Move more replicas to prefill; roughly 65% prefill is one valid answer for this synthetic workload.',
    initial: {
      ...defaults,
      gpus: 8000,
      arrivalRate: 800,
      inputTokens: 4096,
      outputTokens: 64,
      prefillShare: 10,
    },
    strategy: 'disaggregated',
    prefixLimit: 0,
    networkLimit: 400,
    world: { layer: 'pod', traffic: 'requests', node: 'prefill' },
  },
  {
    id: 'handoff',
    title: 'Unblock the state handoff',
    subtitle: 'FABRIC / KV TRANSFER',
    brief:
      'Keep split serving, a 4,096-token prompt and 256 output tokens, at least 800 requests/s, and at most 8,000 GPUs. Bring the modeled full-prompt handoff below 50ms, using an endpoint no faster than 400 Gb/s. Prefix reuse is unavailable.',
    hint: 'KV is far larger than the API text. Increase useful endpoint bandwidth; at 400 Gb/s with 70% efficiency, this toy’s 1,280 MiB prompt cache has a 38.35ms wire estimate.',
    initial: {
      ...defaults,
      gpus: 8000,
      arrivalRate: 800,
      inputTokens: 4096,
      networkGbps: 25,
      prefillShare: 70,
    },
    strategy: 'disaggregated',
    prefixLimit: 0,
    networkLimit: 400,
    world: { layer: 'pod', traffic: 'kv', node: 'fabric' },
  },
]
export function findChallenge(id: string) {
  return learningChallenges.find((c) => c.id === id)
}
export function evaluateChallenge(
  id: ChallengeId,
  p: Parameters,
  strategy: Strategy,
) {
  const c = findChallenge(id)!,
    r = simulate(p, strategy)
  const checks = [
    {
      label: 'Keep the user workload',
      pass:
        p.inputTokens === c.initial.inputTokens &&
        p.outputTokens === c.initial.outputTokens &&
        p.arrivalRate >= c.initial.arrivalRate,
      detail: `${c.initial.inputTokens.toLocaleString()} prompt / ${c.initial.outputTokens} output tokens; ≥ ${c.initial.arrivalRate.toLocaleString()} req/s.`,
    },
    {
      label: 'Respect the infrastructure budget',
      pass:
        p.gpus >= 80 &&
        p.gpus <= 8000 &&
        p.networkGbps >= 25 &&
        p.networkGbps <= c.networkLimit &&
        p.prefixHit >= 0 &&
        p.prefixHit <= c.prefixLimit &&
        p.batchSize >= 1 &&
        p.batchSize <= 256 &&
        p.prefillShare >= 10 &&
        p.prefillShare <= 90,
      detail: `≤ 8,000 GPUs, ≤ ${c.networkLimit} Gb/s endpoint, ≤ ${c.prefixLimit}% eligible prefix reuse.`,
    },
    {
      label:
        id === 'balance' || id === 'handoff'
          ? 'Retain the split serving architecture'
          : 'Use a valid serving architecture',
      pass:
        ['static', 'continuous', 'disaggregated'].includes(strategy) &&
        (!(id === 'balance' || id === 'handoff') ||
          strategy === 'disaggregated'),
      detail:
        id === 'balance' || id === 'handoff'
          ? 'Prefill/decode separation is a requirement of this scenario.'
          : 'Choose a strategy and compare its modeled behavior.',
    },
    {
      label:
        id === 'context'
          ? 'Fit the requested active batch'
          : id === 'handoff'
            ? 'Meet the handoff target'
            : 'Keep offered load below 90%',
      pass:
        id === 'context'
          ? r.valid && r.batch === p.batchSize && r.stable
          : id === 'handoff'
            ? r.stable && r.transferMs < 50
            : r.stable && r.utilization < 0.9,
      detail:
        id === 'context'
          ? `${r.memorySlots} KV slots; requested ${p.batchSize}, admitted ${r.batch}. Service ${r.stable ? 'stable' : 'over capacity'}.`
          : id === 'handoff'
            ? `${r.transferMs.toFixed(2)}ms modeled handoff. Service ${r.stable ? 'stable' : 'over capacity'}.`
            : `${Number.isFinite(r.utilization) ? (r.utilization * 100).toFixed(1) : '∞'}% offered load; ${Math.round(r.capacity).toLocaleString()} req/s capacity.`,
    },
  ]
  return {
    pass:
      checks.every((c) => c.pass) &&
      Object.values(p).every(Number.isFinite) &&
      [p.gpus, p.batchSize, p.inputTokens, p.outputTokens].every(
        Number.isInteger,
      ),
    checks,
    result: r,
  }
}
export function readChallengeProgress(
  raw: string | null,
): Partial<Record<ChallengeId, number>> {
  try {
    const value: unknown = JSON.parse(raw || '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(
      learningChallenges.flatMap((c) => {
        const n = (value as Record<string, unknown>)[c.id]
        return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= 3
          ? [[c.id, n]]
          : []
      }),
    )
  } catch {
    return {}
  }
}
