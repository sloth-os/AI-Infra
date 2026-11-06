import type { Layer } from '../../content'
import type { LifecyclePhase, PostMethod } from '../../lifecycle/catalog'
import {
  defaultLifecycleInputs,
  dpoLoss,
  groupAdvantages,
  kvPerToken,
  lifecycleMetrics,
  stateBytes,
} from '../../lifecycle/model.ts'
import { CAMPAIGN_LEVELS, DECISIONS } from './catalog.ts'

export const GiB = 2 ** 30
export const GAME_TIME_SCALE = 0.18
export const STAGE_OVERHEAD = 0.35
export type Configuration = Record<string, string>
export type OperationStatus = 'ready' | 'running' | 'paused' | 'won' | 'lost'
export interface OperationState {
  phase: LifecyclePhase
  method: PostMethod
  status: OperationStatus
  config: Configuration
  unlocked: string[]
  credits: number
  time: number
  idle: number
  stage: number
  progress: number
  cycles: number
  produced: number
  rejected: number
  checkpoint: number
  checkpoints: number
  policyVersion: number
  warm: boolean
  visited: Layer[]
  evidence: Record<Layer, number>
  feedback: string
}
export interface WorkStage {
  id: string
  title: string
  layer: Layer
  seconds: number
  payload: string
}
export interface OperationMetrics {
  residentGiB: number
  kvGiB: number
  kvBudget: number
  allocatedGPUs: number
  usefulTokens: number
  computeSeconds: number
  communicationSeconds: number
  wireBytes: number
  checkpointBytes: number
  bubble: number
  memoryPass: number
  pipelineSeconds: number
  iterationSeconds: number
  ttftSeconds: number
  physicalSeconds: number
  gameSeconds: number
  rate: number
  work: number
  blocked: string | null
  valid: boolean
  invalidReason: string
  advantages: number[]
  dpo: number
  source: string
  stages: WorkStage[]
}
export const defaultConfiguration = (phase: LifecyclePhase): Configuration =>
  Object.fromEntries(DECISIONS[phase].map((d) => [d.id, d.options[0].id]))
export function createOperation(
  phase: LifecyclePhase = 'pretrain',
  method: PostMethod = 'grpo',
): OperationState {
  return {
    phase,
    method: phase === 'posttrain' ? method : 'sft',
    status: 'ready',
    config: defaultConfiguration(phase),
    unlocked: [],
    credits: 180,
    time: 0,
    idle: 0,
    stage: 0,
    progress: 0,
    cycles: 0,
    produced: 0,
    rejected: 0,
    checkpoint: 0,
    checkpoints: 0,
    policyVersion: 0,
    warm: false,
    visited: ['fleet'],
    evidence: { fleet: 0, pod: 0, rack: 0, gpu: 0 },
    feedback:
      'Inspect the four levels. Plan an intervention, then run real work through the operation.',
  }
}
const stage = (
  id: string,
  title: string,
  layer: Layer,
  seconds: number,
  payload: string,
): WorkStage => ({
  id,
  title,
  layer,
  seconds: STAGE_OVERHEAD + Math.max(0, seconds) * GAME_TIME_SCALE,
  payload,
})
const gib = (bytes: number) => `${(bytes / GiB).toFixed(2)} GiB`
export function operationMetrics(
  s: OperationState,
  config: Configuration = s.config,
): OperationMetrics {
  const c = { ...defaultConfiguration(s.phase), ...config }
  const base: OperationMetrics = {
    residentGiB: 0,
    kvGiB: 0,
    kvBudget: 0,
    allocatedGPUs: 0,
    usefulTokens: 0,
    computeSeconds: 0,
    communicationSeconds: 0,
    wireBytes: 0,
    checkpointBytes: 0,
    bubble: 0,
    memoryPass: 1,
    pipelineSeconds: 0,
    iterationSeconds: 0,
    ttftSeconds: 0,
    physicalSeconds: 0,
    gameSeconds: 0,
    rate: 0,
    work: 1,
    blocked: null,
    valid: true,
    invalidReason: '',
    advantages: [],
    dpo: 0,
    source: '',
    stages: [],
  }
  const m = base
  if (s.phase === 'pretrain') {
    const accumulation = Number(c.microbatches),
      microbatch = 16 / accumulation
    const raw = lifecycleMetrics({
      ...defaultLifecycleInputs,
      dp: 8,
      tp: 4,
      pp: 2,
      microbatch,
      accumulation,
      sharding: c.state as 'ddp' | 'zero2' | 'zero3',
    })
    const activation =
      raw.activation * (80 / 2) * 6 * (c.recompute === 'recompute' ? 0.25 : 1)
    m.residentGiB = (raw.state + activation) / GiB + 2
    m.allocatedGPUs = 64
    m.usefulTokens = raw.tokens * (c.packing === 'packed' ? 0.94 : 0.55)
    m.bubble = raw.bubble
    m.memoryPass = c.kernel === 'fused' ? 0.72 : 1
    const occupancy =
      accumulation === 16 ? 0.78 : accumulation === 8 ? 0.92 : 0.98
    m.computeSeconds =
      (raw.trainingFlops * (c.recompute === 'recompute' ? 1.25 : 1)) /
      (64 *
        250e12 *
        0.35 *
        occupancy *
        (1 - raw.bubble) *
        (c.kernel === 'fused' ? 1.2 : 1))
    m.wireBytes =
      raw.gradRing +
      (c.state === 'zero3' ? 2 * raw.parameterGather * accumulation : 0)
    const wireSeconds = m.wireBytes / (((Number(c.network) * 1e9) / 8) * 0.7)
    m.communicationSeconds = Math.max(
      0,
      wireSeconds - (c.overlap === 'overlap' ? 0.6 * m.computeSeconds : 0),
    )
    const checkpointDue = c.checkpoint === 'every' || (s.cycles + 1) % 2 === 0
    m.checkpointBytes = raw.checkpoint
    const checkpointSeconds = raw.checkpoint / 80e9
    m.physicalSeconds =
      (c.packing === 'packed' ? 0.4 : 1) +
      0.35 +
      m.computeSeconds +
      m.communicationSeconds +
      checkpointSeconds / (c.checkpoint === 'every' ? 1 : 2)
    m.rate = m.usefulTokens / m.physicalSeconds
    m.source =
      '70B · 64 GPUs · 262,144 global positions · BF16 / mixed-precision Adam'
    m.stages = [
      stage(
        'data',
        'Pack & place',
        'fleet',
        c.packing === 'packed' ? 0.4 : 1,
        'Dataset shards → packed token IDs and loss positions → complete 64-GPU gang',
      ),
      stage(
        'forward',
        'Forward',
        'gpu',
        m.computeSeconds * 0.35,
        'Token IDs → embeddings → activations; parameters remain distinct from request K/V',
      ),
      stage(
        'pipeline',
        'Pipeline activations',
        'rack',
        0.15,
        `TP 4 × PP 2 on this reference server; ${accumulation} microbatches at a fixed global batch`,
      ),
      stage(
        'backward',
        'Backward',
        'gpu',
        m.computeSeconds * 0.65,
        'Loss scalar + saved/recomputed activations → parameter gradients',
      ),
      stage(
        'gradient',
        'Synchronize',
        'pod',
        m.communicationSeconds,
        `${gib(m.wireBytes)} wire volume per rank; reduce-scatter / all-reduce and optional parameter gathers`,
      ),
      stage(
        'optimizer',
        'Optimizer update',
        'rack',
        0.2,
        'Synchronized gradients + Adam moments → next parameter version',
      ),
      ...(checkpointDue
        ? [
            stage(
              'checkpoint',
              'Checkpoint',
              'fleet',
              checkpointSeconds,
              `${gib(raw.checkpoint)} across the full job: model + optimizer + data progress`,
            ),
          ]
        : []),
    ]
  } else if (s.phase === 'posttrain') {
    const online = s.method === 'grpo',
      rolloutWorkers = online ? Number(c.roles) : s.method === 'dpo' ? 2 : 0,
      learners = 8 - rolloutWorkers
    const raw = lifecycleMetrics({
      ...defaultLifecycleInputs,
      shape: '7b',
      dp: learners,
      tp: 1,
      pp: 1,
      rank: 16,
    })
    const state =
      c.state === 'lora'
        ? raw.loraState
        : stateBytes(
            7e9,
            learners,
            1,
            1,
            c.state === 'sharded' ? 'zero2' : 'ddp',
          )
    const localMicrobatch = Math.ceil(16 / (Number(c.accumulation) * learners))
    const activation = localMicrobatch * 2048 * 4096 * 2 * 32 * 6
    m.residentGiB = (state + activation) / GiB + 2
    m.allocatedGPUs = 8
    m.usefulTokens = 16 * 2048 * (c.packing === 'packed' ? 0.94 : 0.55)
    m.memoryPass = c.kernel === 'fused' ? 0.72 : 1
    m.computeSeconds =
      ((6 * 7e9 * 16 * 2048) /
        (learners * 200e12 * 0.35 * (c.kernel === 'fused' ? 1.2 : 1))) *
      (Number(c.accumulation) === 4 ? 1.05 : 1)
    const preparation = online
      ? 4096 / (rolloutWorkers * 150) + 0.8
      : s.method === 'dpo'
        ? (2 * 7e9 * 16 * 2048) / (2 * 200e12 * 0.35)
        : 0.9
    const hidden =
      c.overlap === 'overlap'
        ? 0.7 * Math.min(preparation, m.computeSeconds)
        : 0
    m.pipelineSeconds = preparation + m.computeSeconds - hidden
    m.wireBytes =
      (c.state === 'lora' ? 2 * raw.adapterParams : 2 * 7e9) *
      (online ? rolloutWorkers : 1)
    const syncBytes =
      ((2 * (learners - 1)) / learners) *
      2 *
      (c.state === 'lora' ? raw.adapterParams : 7e9)
    const syncSeconds = syncBytes / ((400e9 / 8) * 0.7),
      publishSeconds = m.wireBytes / ((400e9 / 8) * 0.7)
    m.communicationSeconds = syncSeconds + publishSeconds
    m.physicalSeconds = m.pipelineSeconds + m.communicationSeconds + 0.3
    m.advantages = groupAdvantages(
      c.objective === 'valid' ? [0, 1, 0.5, 2] : [1, 1, 1, 1],
    )
    m.dpo = dpoLoss(0.8, 0.3, 0.1)
    const currentVersion = c.freshness === 'gated' || s.policyVersion === 0
    m.valid = c.objective === 'valid' && (!online || currentVersion)
    m.invalidReason =
      c.objective !== 'valid'
        ? s.method === 'sft'
          ? 'Rejected: prompt positions are included in the assistant-only loss objective.'
          : s.method === 'dpo'
            ? 'Rejected: the frozen-reference log probabilities are missing.'
            : 'Rejected: equal group rewards produce zero GRPO advantages.'
        : 'Rejected: rollout policy v0 is stale relative to the learner. Gate and refresh policy versions at Fleet level.'
    m.rate = m.usefulTokens / m.physicalSeconds
    m.source = `7B · 8 GPU workers · 16 policy sequences / update · ${s.method.toUpperCase()} · no quality prediction`
    m.stages = [
      stage(
        'samples',
        'Admit work',
        'fleet',
        0.2,
        online
          ? `Versioned prompts under policy v${c.freshness === 'gated' ? s.policyVersion : 0}`
          : s.method === 'sft'
            ? 'Demonstrations → chat template → assistant loss mask'
            : 'Chosen / rejected pairs + frozen reference definition',
      ),
      stage(
        'prepare',
        online
          ? 'Generate & reward'
          : s.method === 'dpo'
            ? 'Reference scoring'
            : 'Prepare demonstrations',
        'pod',
        Math.max(0, preparation - hidden),
        online
          ? '4 prompts × 4 completions × 256 tokens → 16 rewards; no invented model-quality score'
          : s.method === 'dpo'
            ? 'Chosen and rejected reference log probabilities; these are additional forward passes'
            : 'Packed token IDs + assistant labels; no rollout engine is needed',
      ),
      stage(
        'objective',
        'Validate objective',
        'gpu',
        0.1,
        s.method === 'grpo'
          ? `Group advantages: ${m.advantages.map((x) => x.toFixed(2)).join(', ')}`
          : s.method === 'dpo'
            ? `DPO softplus(−0.1 × (0.8−0.3)) = ${m.dpo.toFixed(4)}; fixed illustrative log-probability gaps`
            : c.objective === 'valid'
              ? 'Assistant label positions contribute to loss; prompt labels are masked'
              : 'Incorrect loss mask: prompt labels still contribute',
      ),
      stage(
        'learn',
        'Forward & backward',
        'gpu',
        m.computeSeconds,
        `Policy forward → method-specific loss → gradients; ${gib(state)} state per learner before activations`,
      ),
      stage(
        'sync',
        'Accumulate & update',
        'rack',
        syncSeconds,
        `${c.accumulation} microbatches; 16 policy sequences retained per update; ${gib(syncBytes)} gradient wire / rank; ${c.state} state ownership`,
      ),
      stage(
        'publish',
        'Publish policy',
        'fleet',
        publishSeconds,
        `${gib(m.wireBytes)} publication payload${c.state === 'lora' ? '; recipients must already hold the compatible frozen base' : ''}; commit only a valid update`,
      ),
    ]
  } else {
    const batch = Number(c.batch),
      replicas = Number(c.replicas),
      split = c.serving === 'split',
      precision = c.precision === '8' ? 0.5 * 1.01 : 1
    const prompt = 16384,
      output = 256,
      prefixHit = c.routing === 'prefix' && s.warm
    m.allocatedGPUs = 8 * replicas * (split ? 2 : 1)
    m.kvGiB =
      (((kvPerToken('70b') * (prompt + output) * batch) / 8) * precision) /
        GiB +
      (s.warm && c.routing === 'prefix'
        ? (((kvPerToken('70b') * prompt * 0.75 * 2) / 8) * precision) / GiB
        : 0)
    m.kvBudget = 24
    m.residentGiB = (2 * 70e9) / 8 / GiB + m.kvGiB + 2
    m.memoryPass = c.kernel === 'fused' ? 0.7 : 1
    m.work = batch * replicas
    m.usefulTokens = m.work * output
    m.wireBytes = split
      ? kvPerToken('70b') * prompt * batch * replicas * precision
      : 0
    m.communicationSeconds =
      m.wireBytes / (((Number(c.network) * 1e9) / 8) * 0.7)
    const prefill =
      ((2 * 70e9 * batch * prompt * (prefixHit ? 0.25 : 1)) /
        (8 * 350e12 * 0.5)) *
      (c.serving === 'chunked' ? 1.05 : 1)
    const iteration =
      (0.006 + 0.00024 * batch) *
      (prompt / 2048) *
      (c.batching === 'continuous' ? 1 : 1.9) *
      m.memoryPass
    m.iterationSeconds =
      iteration *
      (c.serving === 'colocated' ? 2.2 : c.serving === 'chunked' ? 1.2 : 1)
    m.computeSeconds = prefill + m.iterationSeconds * output
    m.ttftSeconds = prefill + m.communicationSeconds
    m.physicalSeconds = m.computeSeconds + m.communicationSeconds + 0.16
    m.rate = m.work / m.physicalSeconds
    m.source =
      '70B · TP 8 / replica · 16,384 prompt + 256 output · 24 GiB KV allowance / rank'
    m.stages = [
      stage(
        'route',
        'Route users',
        'fleet',
        0.08,
        `${m.work} independent requests across 2 tenant scopes; ${prefixHit ? 'matching prefixes are warm' : 'cold or unowned prefixes'}`,
      ),
      stage(
        'admit',
        'Reserve slots & KV',
        'rack',
        0.04,
        `${batch} sequences per replica; ${m.kvGiB.toFixed(2)} GiB K/V per rank, including retained prefix metadata`,
      ),
      stage(
        'prefill',
        'Prefill',
        'pod',
        prefill,
        'Token IDs → model forward → per-layer K/V; prefix hits skip only compatible prompt computation',
      ),
      ...(split
        ? [
            stage(
              'handoff',
              'Handoff K/V',
              'pod',
              m.communicationSeconds,
              `${gib(m.wireBytes)} shared inter-pool transfer; all replicas share ${c.network} Gb/s`,
            ),
          ]
        : []),
      stage(
        'decode',
        'Decode & append',
        'gpu',
        m.iterationSeconds * output,
        `${output} autoregressive token iterations; read retained K/V, append one position per sequence, sample outputs`,
      ),
      stage(
        'stream',
        'Stream & release',
        'fleet',
        0.04,
        `${m.work * output} output tokens → independent client streams; release cohort reservations`,
      ),
    ]
  }
  if (s.phase === 'inference' && m.kvGiB > m.kvBudget)
    m.blocked = `KV admission blocked: ${m.kvGiB.toFixed(1)} GiB / rank exceeds the ${m.kvBudget} GiB KV allowance. Reduce concurrency or change the declared representation.`
  else if (m.residentGiB > 80)
    m.blocked = `HBM blocked: ${m.residentGiB.toFixed(1)} GiB / worker exceeds 80 GiB. Change state ownership at Server level or activation residency at GPU level.`
  else if (m.allocatedGPUs > 64)
    m.blocked = 'The operation exceeds its 64-GPU allocation quota.'
  m.gameSeconds = m.stages.reduce((sum, item) => sum + item.seconds, 0)
  return m
}
export function contractState(
  s: OperationState,
  level: Layer,
  performed?: OperationMetrics,
) {
  const m = performed || operationMetrics(s),
    b = operationMetrics(s, defaultConfiguration(s.phase)),
    c = s.config
  let eligible = false,
    improvement = 1
  if (s.phase === 'pretrain') {
    if (level === 'fleet') {
      improvement = m.rate / b.rate
      eligible = c.packing === 'packed' && s.checkpoints > 0
    }
    if (level === 'pod') {
      improvement =
        b.communicationSeconds / Math.max(0.001, m.communicationSeconds)
      eligible = m.communicationSeconds <= b.communicationSeconds * 0.7
    }
    if (level === 'rack') {
      improvement = b.residentGiB / m.residentGiB
      eligible = m.residentGiB <= 80 && m.bubble <= 0.12
    }
    if (level === 'gpu') {
      improvement = 1 / m.memoryPass
      eligible = m.residentGiB <= 80 && m.memoryPass <= 0.8
    }
  } else if (s.phase === 'posttrain') {
    if (level === 'fleet') {
      improvement = m.rate / b.rate
      eligible = c.freshness === 'gated' && c.packing === 'packed'
    }
    if (level === 'pod') {
      improvement = b.pipelineSeconds / m.pipelineSeconds
      eligible = m.pipelineSeconds <= b.pipelineSeconds * 0.9
    }
    if (level === 'rack') {
      improvement = b.residentGiB / m.residentGiB
      eligible = m.residentGiB <= 80 && c.state !== 'full'
    }
    if (level === 'gpu') {
      improvement = c.kernel === 'fused' ? 1.4 : 1
      eligible = m.valid && c.objective === 'valid' && m.residentGiB <= 80
    }
  } else {
    if (level === 'fleet') {
      improvement = m.rate / b.rate
      eligible = improvement >= 1.2
    }
    if (level === 'pod') {
      improvement = b.iterationSeconds / m.iterationSeconds
      eligible = improvement >= 1.2 && c.serving !== 'colocated'
    }
    if (level === 'rack') {
      improvement = m.rate / b.rate
      eligible = improvement >= 1.15 && c.batching === 'continuous'
    }
    if (level === 'gpu') {
      improvement = 1 / m.memoryPass
      eligible = m.kvGiB <= 24 && m.memoryPass <= 0.8
    }
  }
  return {
    eligible: eligible && !m.blocked && m.valid,
    improvement,
    evidence: s.evidence[level],
    done: s.evidence[level] >= 2,
    visited: s.visited.includes(level),
  }
}
export type OperationAction =
  | { type: 'run' }
  | { type: 'pause' }
  | { type: 'fault' }
  | { type: 'tick'; dt: number }
  | { type: 'visit'; level: Layer }
  | { type: 'choose'; decision: string; option: string }
  | { type: 'method'; method: PostMethod }
export function operationReducer(
  s: OperationState,
  action: OperationAction,
): OperationState {
  if (action.type === 'tick') return advanceOperation(s, action.dt)
  if (action.type === 'visit')
    return s.visited.includes(action.level)
      ? s
      : { ...s, visited: [...s.visited, action.level] }
  if (action.type === 'pause')
    return s.status === 'running' ? { ...s, status: 'paused' } : s
  if (s.status === 'won' || s.status === 'lost') return s
  if (action.type === 'run')
    return {
      ...s,
      status: 'running',
      feedback:
        'Operation running. Stage progress comes from the simulation; zooming never manufactures completed work.',
    }
  if (action.type === 'method')
    return s.phase !== 'posttrain'
      ? s
      : {
          ...s,
          method: action.method,
          stage: 0,
          progress: 0,
          status: s.status === 'ready' ? 'ready' : 'paused',
          feedback:
            'Method changed. Restart the unfinished work group; completed updates and earned contracts remain.',
        }
  if (action.type === 'fault') {
    if (s.phase !== 'pretrain')
      return {
        ...s,
        feedback:
          'Recovery drill belongs to pre-training: it restores a complete training checkpoint.',
      }
    const lost = s.cycles - s.checkpoint
    return {
      ...s,
      status: 'paused',
      stage: 0,
      progress: 0,
      cycles: s.checkpoint,
      produced: s.checkpoint,
      feedback: `Worker fault: restored checkpoint ${s.checkpoint}. Lost ${lost} unsaved update${lost === 1 ? '' : 's'} and the unfinished cycle. Earned learning contracts remain recorded.`,
    }
  }
  const decision = DECISIONS[s.phase].find((d) => d.id === action.decision),
    option = decision?.options.find((o) => o.id === action.option)
  if (!decision || !option || s.config[decision.id] === option.id) return s
  if (s.phase === 'posttrain' && s.method !== 'grpo' && decision.id === 'roles')
    return {
      ...s,
      feedback:
        'Rollout allocation applies to online GRPO. Offline SFT uses eight learners; DPO uses two reference and six learner workers.',
    }
  const key = `${decision.id}:${option.id}`,
    cost = s.unlocked.includes(key) ? 0 : option.cost
  if (cost > s.credits)
    return {
      ...s,
      feedback: `Need ${cost} engineering credits; ${s.credits} available. Complete valid work to earn more.`,
    }
  return {
    ...s,
    config: { ...s.config, [decision.id]: option.id },
    unlocked: [...new Set([...s.unlocked, key])],
    credits: s.credits - cost,
    visited: [...new Set([...s.visited, decision.level])],
    stage: 0,
    progress: 0,
    status: s.status === 'ready' ? 'ready' : 'paused',
    warm:
      (decision.id === 'routing' && option.id === 'round') ||
      decision.id === 'replicas'
        ? false
        : s.warm,
    feedback: `${option.title} configured. Replanning restarts unfinished work; completed work stays. Run the operation to earn evidence.`,
  }
}
export function advanceOperation(
  original: OperationState,
  dt: number,
): OperationState {
  if (original.status !== 'running' || !Number.isFinite(dt) || dt <= 0)
    return original
  let s = { ...original, evidence: { ...original.evidence } },
    remaining = Math.min(2, dt, Math.max(0, 240 - original.time))
  for (let guard = 0; remaining > 1e-8 && guard < 100; guard++) {
    const m = operationMetrics(s)
    if (m.blocked) {
      s.time += remaining
      s.idle += remaining
      s.feedback = m.blocked
      remaining = 0
      break
    }
    const current = m.stages[s.stage],
      interval = Math.min(remaining, (1 - s.progress) * current.seconds)
    s.time += interval
    s.progress += interval / current.seconds
    remaining -= interval
    if (s.progress < 1 - 1e-8) continue
    s.progress = 0
    s.stage++
    if (s.stage < m.stages.length) continue
    s.stage = 0
    if (!m.valid) {
      s.rejected++
      s.feedback = m.invalidReason
      continue
    }
    s.cycles++
    s.produced += m.work
    s.credits += 35
    if (s.phase === 'pretrain' && current.id === 'checkpoint') {
      s.checkpoint = s.cycles
      s.checkpoints++
    }
    if (s.phase === 'posttrain') s.policyVersion++
    if (s.phase === 'inference' && s.config.routing === 'prefix') s.warm = true
    for (const level of CAMPAIGN_LEVELS)
      if (s.visited.includes(level) && contractState(s, level, m).eligible)
        s.evidence[level] = Math.min(2, s.evidence[level] + 1)
    s.feedback =
      s.phase === 'inference'
        ? `Delivered ${m.work} requests and ${m.usefulTokens.toLocaleString()} output tokens. Reservations released; tenant-scoped prefixes can now be warm.`
        : `Committed ${s.phase === 'pretrain' ? 'training' : 'valid policy'} update ${s.cycles}. +35 engineering credits.`
    if (CAMPAIGN_LEVELS.every((level) => s.evidence[level] >= 2)) {
      s.status = 'won'
      s.feedback =
        'Operation complete: actual work verified improvements at Fleet, Pod, Server and GPU.'
      break
    }
  }
  if (s.status === 'running' && s.time >= 240) {
    s.status = 'lost'
    s.feedback =
      'The 240-second operation window ended. Replan the bottleneck and retry; earned learning contracts are retained.'
  }
  return s
}
export type CampaignProgress = Record<string, number>
export function readCampaignProgress(raw: string | null): CampaignProgress {
  try {
    const parsed = JSON.parse(raw || '{}'),
      result: CampaignProgress = {}
    for (const phase of ['pretrain', 'posttrain', 'inference'] as const)
      for (const level of CAMPAIGN_LEVELS) {
        const key = `${phase}:${level}`,
          value = parsed?.[key]
        if (Number.isInteger(value) && value >= 1 && value <= 3)
          result[key] = value
      }
    return result
  } catch {
    return {}
  }
}
export function earnedProgress(s: OperationState): CampaignProgress {
  return Object.fromEntries(
    CAMPAIGN_LEVELS.filter((level) => s.evidence[level] >= 2).map((level) => [
      `${s.phase}:${level}`,
      Math.min(
        3,
        1 +
          (contractState(s, level).improvement >= 1.2 ? 1 : 0) +
          (contractState(s, level).improvement >= 1.4 ? 1 : 0),
      ),
    ]),
  )
}
