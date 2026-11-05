import {
  lifecyclePhases,
  type LifecyclePhase,
  type PostMethod,
} from './catalog.ts'

export type StateSharding = 'ddp' | 'zero1' | 'zero2' | 'zero3'
export interface LifecycleInputs {
  shape: '7b' | '70b'
  dp: number
  tp: number
  pp: number
  microbatch: number
  accumulation: number
  scheduleSlot: number
  sequence: number
  sharding: StateSharding
  checkpoint: boolean
  tuning: 'full' | 'lora'
  rank: number
  rolloutPrompts: number
  group: number
  completion: number
  rolloutReplicas: number
  equalRewards: boolean
  batch: number
  prompt: number
  output: number
  fleet: number
  disaggregated: boolean
  network: number
}
export interface LifecycleView {
  phase: LifecyclePhase
  method: PostMethod
  stage: number
  playing: boolean
  inputs: LifecycleInputs
}
export interface LifecycleBudget {
  label: string
  value: string
  unit: string
  formula: string
  note: string
}
export const shapes = {
  '7b': { parameters: 7e9, layers: 32, hidden: 4096, kvHeads: 8, headDim: 128 },
  '70b': {
    parameters: 70e9,
    layers: 80,
    hidden: 8192,
    kvHeads: 8,
    headDim: 128,
  },
} as const
export const defaultLifecycleInputs: LifecycleInputs = {
  shape: '70b',
  dp: 8,
  tp: 4,
  pp: 2,
  microbatch: 2,
  accumulation: 8,
  scheduleSlot: 0,
  sequence: 2048,
  sharding: 'zero3',
  checkpoint: true,
  tuning: 'lora',
  rank: 16,
  rolloutPrompts: 16,
  group: 4,
  completion: 256,
  rolloutReplicas: 4,
  equalRewards: false,
  batch: 64,
  prompt: 2048,
  output: 256,
  fleet: 100000,
  disaggregated: false,
  network: 400,
}
const bounded = (v: unknown, min: number, max: number, fallback: number) =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v))
    ? fallback
    : Math.max(min, Math.min(max, Math.round(Number(v))))
const choice = <T extends string | number>(
  v: unknown,
  options: readonly T[],
  fallback: T,
): T => (options.includes(v as T) ? (v as T) : fallback)
export function sanitizeLifecycleInputs(
  raw: Partial<LifecycleInputs>,
): LifecycleInputs {
  const d = defaultLifecycleInputs
  const pp = choice(raw.pp, [1, 2, 4, 8], d.pp),
    accumulation = bounded(raw.accumulation, 1, 64, d.accumulation)
  return {
    shape: choice(raw.shape, ['7b', '70b'], d.shape),
    dp: choice(raw.dp, [1, 2, 4, 8, 16, 32, 64], d.dp),
    tp: choice(raw.tp, [1, 2, 4, 8], d.tp),
    pp,
    microbatch: bounded(raw.microbatch, 1, 16, d.microbatch),
    accumulation,
    scheduleSlot: bounded(
      raw.scheduleSlot,
      0,
      2 * (pp + accumulation - 1) - 1,
      d.scheduleSlot,
    ),
    sequence: bounded(raw.sequence, 128, 32768, d.sequence),
    sharding: choice(
      raw.sharding,
      ['ddp', 'zero1', 'zero2', 'zero3'],
      d.sharding,
    ),
    checkpoint:
      typeof raw.checkpoint === 'boolean' ? raw.checkpoint : d.checkpoint,
    tuning: choice(raw.tuning, ['full', 'lora'], d.tuning),
    rank: choice(raw.rank, [8, 16, 32, 64], d.rank),
    rolloutPrompts: bounded(raw.rolloutPrompts, 1, 256, d.rolloutPrompts),
    group: choice(raw.group, [2, 4, 8, 16], d.group),
    completion: bounded(raw.completion, 16, 4096, d.completion),
    rolloutReplicas: bounded(raw.rolloutReplicas, 1, 64, d.rolloutReplicas),
    equalRewards:
      typeof raw.equalRewards === 'boolean' ? raw.equalRewards : d.equalRewards,
    batch: bounded(raw.batch, 1, 512, d.batch),
    prompt: bounded(raw.prompt, 128, 32768, d.prompt),
    output: bounded(raw.output, 1, 8192, d.output),
    fleet: bounded(raw.fleet, 1, 100000, d.fleet),
    disaggregated:
      typeof raw.disaggregated === 'boolean'
        ? raw.disaggregated
        : d.disaggregated,
    network: choice(raw.network, [25, 100, 200, 400, 800], d.network),
  }
}
export const lifecycleStage = (n: number) =>
  Math.max(0, Math.min(5, Math.trunc(Number.isFinite(n) ? n : 0)))
export function defaultLifecycleView(
  phase: LifecyclePhase = 'pretrain',
): LifecycleView {
  return {
    phase,
    method: 'sft',
    stage: 0,
    playing: false,
    inputs: { ...defaultLifecycleInputs },
  }
}
export function clearLifecycleParams(url: URL) {
  for (const key of [...url.searchParams.keys()])
    if (key === 'lifecycle' || key.startsWith('lc_'))
      url.searchParams.delete(key)
}
export function parseLifecycleLocation(href: string): LifecycleView | null {
  const q = new URL(href).searchParams
  const phase = q.get('lifecycle')
  if (!lifecyclePhases.some((p) => p.id === phase)) return null
  const raw: Record<string, unknown> = {}
  for (const [key, fallback] of Object.entries(defaultLifecycleInputs)) {
    const v = q.get(`lc_${key}`)
    if (v !== null)
      raw[key] =
        typeof fallback === 'number'
          ? Number(v)
          : typeof fallback === 'boolean'
            ? v === 'true'
            : v
  }
  return {
    phase: phase as LifecyclePhase,
    method: choice(q.get('lc_method'), ['sft', 'dpo', 'grpo'], 'sft'),
    stage: lifecycleStage(Number(q.get('lc_stage'))),
    playing: false,
    inputs: sanitizeLifecycleInputs(raw),
  }
}
export function lifecycleUrl(base: string, view: LifecycleView) {
  const url = new URL(base)
  for (const key of [...url.searchParams.keys()])
    if (['example', 'examples', 'stage'].includes(key) || key.startsWith('ex_'))
      url.searchParams.delete(key)
  if (
    !['explore', 'guide', 'lab', 'journey'].includes(
      url.searchParams.get('view') || '',
    )
  )
    url.searchParams.set('view', 'guide')
  url.searchParams.set('learn', 'fusion')
  url.searchParams.set('lifecycle', view.phase)
  url.searchParams.set('lc_method', view.method)
  url.searchParams.set('lc_stage', String(lifecycleStage(view.stage)))
  for (const [key, value] of Object.entries(
    sanitizeLifecycleInputs(view.inputs),
  ))
    url.searchParams.set(`lc_${key}`, String(value))
  return url.toString()
}
// An explicit mixed-precision Adam layout: BF16 weights + BF16 gradients +
// FP32 master weights + FP32 first and second moments. Not a framework peak.
export function stateBytes(
  parameters: number,
  dp: number,
  tp: number,
  pp: number,
  sharding: StateSharding,
) {
  const bytes = {
    ddp: 16,
    zero1: 4 + 12 / dp,
    zero2: 2 + 14 / dp,
    zero3: 16 / dp,
  }[sharding]
  return (parameters * bytes) / (tp * pp)
}
export function kvPerToken(shape: keyof typeof shapes) {
  const s = shapes[shape]
  return 2 * s.layers * s.kvHeads * s.headDim * 2
}
export function pipelineSchedule(stages: number, microbatches: number) {
  // Balanced GPipe flush schedule: all forwards, then all backwards.
  const half = stages + microbatches - 1
  return Array.from({ length: stages }, (_, s) =>
    Array.from(
      { length: half * 2 },
      (
        _,
        t,
      ): { kind: 'forward' | 'backward' | 'idle'; microbatch?: number } => {
        if (t < half) {
          const m = t - s
          return m >= 0 && m < microbatches
            ? { kind: 'forward', microbatch: m }
            : { kind: 'idle' }
        }
        const m = t - half - (stages - 1 - s)
        return m >= 0 && m < microbatches
          ? { kind: 'backward', microbatch: m }
          : { kind: 'idle' }
      },
    ),
  )
}
export function groupAdvantages(rewards: number[]) {
  if (!rewards.length) return []
  const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length
  const std = Math.sqrt(
    rewards.reduce((a, b) => a + (b - mean) ** 2, 0) / rewards.length,
  )
  return rewards.map((r) => (r - mean) / (std + 1e-8))
}
export function dpoLoss(policyGap: number, referenceGap: number, beta: number) {
  const x = beta * (policyGap - referenceGap)
  return Math.max(-x, 0) + Math.log1p(Math.exp(-Math.abs(x)))
}
export function lifecycleMetrics(raw: LifecycleInputs) {
  const p = sanitizeLifecycleInputs(raw),
    s = shapes[p.shape]
  const mp = p.tp * p.pp
  const sequences = p.microbatch * p.accumulation * p.dp
  const tokens = sequences * p.sequence
  const adapterParams = s.layers * 2 * p.rank * (s.hidden + s.hidden)
  const gradShard = (2 * s.parameters) / mp
  const promptKV = kvPerToken(p.shape) * p.prompt
  return {
    shape: s,
    gpus: p.dp * mp,
    sequences,
    tokens,
    adapterParams,
    state: stateBytes(s.parameters, p.dp, p.tp, p.pp, p.sharding),
    states: (['ddp', 'zero1', 'zero2', 'zero3'] as const).map((mode) => ({
      mode,
      bytes: stateBytes(s.parameters, p.dp, p.tp, p.pp, mode),
    })),
    activation: p.microbatch * p.sequence * s.hidden * 2,
    trainingFlops: 6 * s.parameters * tokens,
    bubble: (p.pp - 1) / (p.accumulation + p.pp - 1),
    gradRing: ((2 * (p.dp - 1)) / p.dp) * gradShard,
    parameterGather: ((p.dp - 1) / p.dp) * gradShard,
    checkpoint: 16 * s.parameters,
    servingWeights: 2 * s.parameters,
    loraState: 2 * s.parameters + 16 * adapterParams,
    rolloutSequences: p.rolloutPrompts * p.group,
    rolloutTokens: p.rolloutPrompts * p.group * p.completion,
    publishFull: 2 * s.parameters * p.rolloutReplicas,
    publishAdapters: 2 * adapterParams * p.rolloutReplicas,
    promptKV,
    reservedKV: kvPerToken(p.shape) * (p.prompt + p.output) * p.batch,
    kvRank: (kvPerToken(p.shape) * (p.prompt + p.output) * p.batch) / mp,
    weightRank: (2 * s.parameters) / mp,
    replicas: Math.floor(p.fleet / mp),
    remainder: p.fleet % mp,
    wireBytesPerSecond: ((p.network * 1e9) / 8) * 0.7,
    handoffBytes: p.disaggregated ? promptKV : 0,
    handoffMs: p.disaggregated
      ? (promptKV / (((p.network * 1e9) / 8) * 0.7)) * 1000
      : 0,
  }
}
export const number = (n: number, digits = 0) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits })
export function byteSize(n: number) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const i = n <= 0 ? 0 : Math.min(5, Math.floor(Math.log2(n) / 10))
  return `${number(n / 1024 ** i, i ? 2 : 0)} ${units[i]}`
}
export function lifecycleBudgets(view: LifecycleView): LifecycleBudget[] {
  const p = sanitizeLifecycleInputs(view.inputs),
    m = lifecycleMetrics(p)
  const bytes = (
    label: string,
    n: number,
    formula: string,
    note: string,
  ): LifecycleBudget => ({ label, value: byteSize(n), unit: '', formula, note })
  if (view.phase === 'pretrain')
    return [
      {
        label: 'One training job',
        value: number(m.gpus),
        unit: 'GPUs',
        formula: `DP ${p.dp} × TP ${p.tp} × PP ${p.pp}`,
        note: 'A gang-scheduled job. ZeRO/FSDP shards within DP; it is not another GPU-count multiplier.',
      },
      bytes(
        'Model states / GPU',
        m.state,
        `${p.sharding.toUpperCase()} · ${p.shape.toUpperCase()} · BF16/FP32 Adam layout`,
        'Weights, gradients and optimizer only. Excludes activations, temporary all-gathers, communication buffers and runtime overhead.',
      ),
      {
        label: 'Global tokens / optimizer step',
        value: number(m.tokens),
        unit: 'tokens',
        formula: `${p.microbatch} sequences × ${p.accumulation} microbatches × DP ${p.dp} × ${number(p.sequence)} tokens`,
        note: 'TP and PP partition each model replica; they do not multiply the number of different training examples.',
      },
    ]
  if (view.phase === 'posttrain')
    return [
      bytes(
        p.tuning === 'lora'
          ? 'LoRA trainable parameter state'
          : 'Full policy model state',
        p.tuning === 'lora' ? m.adapterParams * 16 : m.shape.parameters * 16,
        p.tuning === 'lora'
          ? `${number(m.adapterParams)} adapter parameters × 16 bytes`
          : `${p.shape.toUpperCase()} parameters × 16 bytes`,
        p.tuning === 'lora'
          ? 'Unsharded adapter states only, for Q and O targets. Frozen base weights and activations are additional.'
          : 'Logical unsharded mixed-precision Adam state. Reference, reward, rollout and activations are additional.',
      ),
      {
        label:
          view.method === 'grpo'
            ? 'Online rollout work / round'
            : view.method === 'dpo'
              ? 'Preference pair evaluations'
              : 'Training objective',
        value:
          view.method === 'grpo'
            ? number(m.rolloutSequences)
            : view.method === 'dpo'
              ? '2 + 2'
              : 'Masked CE',
        unit:
          view.method === 'grpo'
            ? 'completions'
            : view.method === 'dpo'
              ? 'log-probs'
              : '',
        formula:
          view.method === 'grpo'
            ? `${p.rolloutPrompts} prompts × ${p.group} completions`
            : view.method === 'dpo'
              ? 'Chosen + rejected under policy and frozen reference'
              : 'Cross-entropy on selected response token positions',
        note:
          view.method === 'grpo'
            ? `${number(m.rolloutTokens)} new token positions if every completion has ${p.completion} tokens; prefill is additional.`
            : view.method === 'dpo'
              ? 'Logical evaluations; implementations batch/fuse them. Fixed reference log-probabilities may be precomputed.'
              : 'Teacher forcing uses known targets, with a verified assistant/completion loss mask.',
      },
      bytes(
        'Naive weight publication payload',
        p.tuning === 'lora' ? m.publishAdapters : m.publishFull,
        `${p.rolloutReplicas} destinations × ${p.tuning === 'lora' ? 'BF16 adapters' : 'BF16 policy weights'}`,
        view.method === 'grpo'
          ? 'A logical per-round rollout sync budget, not collective wire volume. Adapter-only sync assumes a compatible resident base.'
          : 'A possible release to evaluation/serving replicas. SFT and DPO do not require online rollout workers.',
      ),
    ]
  return [
    {
      label: 'Independent model replicas',
      value: number(m.replicas),
      unit: 'groups',
      formula: `floor(${number(p.fleet)} GPUs ÷ (TP ${p.tp} × PP ${p.pp}))`,
      note: `${m.remainder} GPUs left over. Replica count is not throughput; placement, availability and SLO constraints reduce usable capacity.`,
    },
    bytes(
      'Reserved KV / model group',
      m.reservedKV,
      `${number(p.batch)} sequences × (${number(p.prompt)} + ${number(p.output)}) positions × ${number(kvPerToken(p.shape))} B`,
      'Conservative full-length reservation at BF16, before paging or prefix sharing. Weights and workspace are additional.',
    ),
    {
      label: p.disaggregated
        ? 'Prompt KV handoff wire floor'
        : 'Cross-stage KV handoff',
      value: p.disaggregated ? number(m.handoffMs, 2) : '0',
      unit: p.disaggregated ? 'ms' : 'bytes',
      formula: p.disaggregated
        ? `${byteSize(m.promptKV)} ÷ (${p.network} Gb/s ÷ 8 × 70%)`
        : 'Colocated prefill + decode keep request KV local',
      note: p.disaggregated
        ? 'One full prompt, one assumed endpoint, 70% link efficiency; serialization, contention, sharding and coordination add latency.'
        : 'No prefill→decode network copy in this layout. TP/PP communication and client streaming still exist.',
    },
  ]
}
