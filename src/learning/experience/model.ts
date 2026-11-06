import { stateBytes, shapes } from '../../lifecycle/model.ts'
import type { Layer, Traffic } from '../../content'
import type {
  OperationMetrics,
  OperationState,
} from '../../game/campaign/model'
import { DECISIONS, LEVEL_NAMES } from '../../game/campaign/catalog.ts'
import type { ProviderState } from '../../game/provider/model.ts'
import {
  advanceProvider,
  createProvider,
  providerMetrics,
  providerReducer,
  POLICIES,
} from '../../game/provider/model.ts'
import { PROVIDER_DECISIONS } from '../../game/provider/catalog.ts'
import type { GameState } from '../../game/model'
import {
  createGame,
  prefillRate,
  decodeRate,
  missionById,
  getGameMetrics,
  MODULES,
} from '../../game/model.ts'

export type LessonKind = 'request' | 'training' | 'cloud'
export interface LessonIntent {
  kind: LessonKind
  request: number
}
export const INTRO_KEY = 'strata-learning-intro-v1'
export const lessons = [
  {
    id: 'request',
    title: 'Follow one API request',
    detail: 'From a prompt to tokens, GPU work, cached state and an answer.',
    question: 'What has to happen before the first token reaches you?',
  },
  {
    id: 'training',
    title: 'Fix a training memory problem',
    detail: 'Compare replicated and sharded state on the same GPU budget.',
    question: 'How can the same training job use less memory per worker?',
  },
  {
    id: 'cloud',
    title: 'Run a cloud for model providers',
    detail: 'Turn fragmented capacity into useful work for three customers.',
    question: 'Why can free GPUs still leave a training job queued?',
  },
] as const
export function parseLesson(value: string | null): LessonKind | null {
  return lessons.some((l) => l.id === value) ? (value as LessonKind) : null
}
export function shouldWelcome(href: string, seen: boolean) {
  const q = new URL(href).searchParams
  return (
    !seen &&
    ![
      'view',
      'campaign',
      'operation',
      'scenario',
      'ui',
      'provider',
      'lifecycle',
      'example',
      'issue',
      'gpus',
      'lesson',
    ].some((k) => q.has(k))
  )
}
export const glossary: Record<
  string,
  { title: string; definition: string; why: string }
> = {
  HBM: {
    title: 'High-bandwidth memory',
    definition: 'The fast, limited memory next to a GPU’s compute units.',
    why: 'Weights, intermediate results and cached state must fit on the devices that own them.',
  },
  KV: {
    title: 'Key/value cache',
    definition:
      'Saved attention keys and values for tokens the model has already processed.',
    why: 'Decode reuses and extends this state. Longer context and more simultaneous sequences consume more memory.',
  },
  prefill: {
    title: 'Prefill',
    definition:
      'The model processes the prompt and builds attention state before producing the answer.',
    why: 'Long prompts add work before the first output token.',
  },
  decode: {
    title: 'Decode',
    definition:
      'The model repeatedly computes the next token while reading and extending the request’s cached state.',
    why: 'Time per token, memory bandwidth and the active batch affect the streaming experience.',
  },
  embedding: {
    title: 'Embedding',
    definition:
      'A numerical vector representing a token, query or other input.',
    why: 'Token embeddings enter model computation; retrieval embeddings support similarity search. They have different jobs.',
  },
  ZeRO: {
    title: 'Zero Redundancy Optimizer',
    definition:
      'A family of strategies that distributes training state across data-parallel workers instead of storing every copy everywhere.',
    why: 'Sharding saves memory per worker and introduces communication. The exact trade-off depends on the ZeRO stage.',
  },
  gang: {
    title: 'A group scheduled together',
    definition:
      'A job that needs a compatible set of devices at the same time.',
    why: 'Eight scattered free GPUs may not form an eight-GPU group on the required local interconnect.',
  },
  checkpoint: {
    title: 'A durable recovery point',
    definition:
      'Saved model and training progress that can be used to resume work.',
    why: 'Saving takes time and storage bandwidth. Releasing a worker before acknowledgment can lose unfinished work.',
  },
  tensor: {
    title: 'A multidimensional array',
    definition:
      'The numerical representation used for embeddings, weights, activations and other model state.',
    why: 'Its shape, precision and placement determine memory use and the bytes exchanged.',
  },
  collective: {
    title: 'A coordinated exchange',
    definition:
      'A communication operation involving a group of workers, such as all-reduce or all-gather.',
    why: 'Distributed training and parallel model execution need workers to exchange the right state at the right time.',
  },
  tenant: {
    title: 'A customer or isolated workload owner',
    definition:
      'A distinct customer whose resource rights and state must stay separate from others.',
    why: 'Quotas, caches and device leases must respect the customer boundary.',
  },
}
export const requestTeaching = [
  {
    title: 'An API request enters the service',
    what: 'Prompt text and request identity → API edge → request router.',
    why: 'The service authenticates the caller and decides which compatible capacity can serve this independent request.',
    terms: ['tenant', 'tensor'],
  },
  {
    title: 'Retrieval adds useful context',
    what: 'Query → retrieval embedding → relevant context chunks.',
    why: 'Retrieval is optional. Its context joins the prompt; it does not update the model’s weights.',
    terms: ['embedding', 'tensor'],
  },
  {
    title: 'Tokens reach a model replica',
    what: 'Prompt text → token IDs and positions → a compatible replica.',
    why: 'A replica is a group of devices serving one model copy, rather than one GPU for every user.',
    terms: ['embedding', 'tenant'],
  },
  {
    title: 'Prefill builds attention state',
    what: 'Token embeddings + weights → transformer computation → prompt K/V.',
    why: 'The GPU transforms the full prompt into state that subsequent token steps can reuse.',
    terms: ['prefill', 'embedding', 'KV', 'HBM'],
  },
  {
    title: 'Retain or transfer the cached state',
    what: 'Prompt K/V → the devices responsible for decode.',
    why: 'Split serving transfers state to the decode pool. Colocated serving keeps it local; a network handoff is not required there.',
    terms: ['KV', 'decode', 'HBM'],
  },
  {
    title: 'Decode extends the answer',
    what: 'Cached K/V + latest token → logits → one next token per sequence.',
    why: 'Batching shares work across sequences. Higher aggregate throughput does not necessarily mean a faster response for one user.',
    terms: ['decode', 'KV', 'HBM'],
  },
  {
    title: 'The response reaches the caller',
    what: 'Generated tokens → streamed response chunks → the caller.',
    why: 'Request state can be released when work finishes. Compatible prefix state is reusable only within its declared ownership rules.',
    terms: ['decode', 'KV', 'tenant'],
  },
] as const
export function trafficTerms(traffic: Traffic) {
  return traffic === 'kv'
    ? ['KV', 'HBM', 'decode']
    : traffic === 'tensors'
      ? ['tensor', 'embedding', 'prefill']
      : traffic === 'collectives'
        ? ['collective', 'ZeRO', 'checkpoint']
        : ['tenant', 'prefill', 'decode']
}
export interface Delta {
  label: string
  before: string
  after: string
}
const n = (v: number, digits = 1) =>
  v.toLocaleString('en-US', { maximumFractionDigits: digits })
export function operationDeltas(
  phase: OperationState['phase'],
  before: OperationMetrics,
  after: OperationMetrics,
): Delta[] {
  return [
    {
      label:
        phase === 'inference' ? 'K/V per rank' : 'Resident state per worker',
      before: `${n(phase === 'inference' ? before.kvGiB : before.residentGiB)} GiB`,
      after: `${n(phase === 'inference' ? after.kvGiB : after.residentGiB)} GiB`,
    },
    {
      label: 'Estimated work interval',
      before: `${n(before.physicalSeconds, 2)} s`,
      after: `${n(after.physicalSeconds, 2)} s`,
    },
    {
      label: 'Admissible configuration',
      before: before.blocked || !before.valid ? 'No' : 'Yes',
      after: after.blocked || !after.valid ? 'No' : 'Yes',
    },
  ]
}
export interface Recap {
  title: string
  scope: string
  outcome: string
  changes: string[]
  changesLabel?: string
  deltas: Delta[]
  comparisonLabel?: string
  tradeoff: string
  question: string
  answers: string[]
  correct: number
  explanation: string
}
export function operationRecap(
  s: OperationState,
  current: OperationMetrics,
  baseline: OperationMetrics,
): Recap {
  return {
    title:
      s.status === 'won'
        ? 'Why this configuration worked'
        : 'Find the remaining limiting resource',
    scope: `${s.phase === 'pretrain' ? 'Pre-training' : s.phase === 'posttrain' ? s.method.toUpperCase() : 'Inference'} · ${current.allocatedGPUs} allocated GPUs · modeled timing`,
    outcome: `${s.produced} ${s.phase === 'inference' ? 'requests delivered' : 'updates committed'} in ${n(s.time)} game seconds. Camera visits and purchases do not count as completed work.`,
    changes: (['fleet', 'pod', 'rack', 'gpu'] as Layer[]).map(
      (level) =>
        `${LEVEL_NAMES[level]}: ${DECISIONS[s.phase]
          .filter((d) => d.level === level)
          .map((d) => d.options.find((o) => o.id === s.config[d.id])?.title)
          .join('; ')}`,
    ),
    deltas: operationDeltas(s.phase, baseline, current),
    comparisonLabel: 'Baseline → selected · configuration estimates',
    tradeoff:
      s.phase === 'pretrain'
        ? 'State sharding reduces residency but exchanges more state; microbatching changes the pipeline bubble, and recomputation trades compute for memory.'
        : s.phase === 'posttrain'
          ? 'A valid objective and fitting state make an update executable. More sampling can starve the learner; correct mechanics do not prove improved model quality.'
          : 'Larger batches can improve aggregate throughput while increasing retained K/V and per-token work. Split serving also adds a state handoff.',
    question:
      s.phase === 'pretrain'
        ? 'Does fitting training state into HBM guarantee the fastest training run?'
        : s.phase === 'posttrain'
          ? 'Does a mathematically valid training objective prove that the model’s answers improved?'
          : 'If prompt length doubles with the same model, precision and batch, what happens to K/V memory?',
    answers:
      s.phase === 'inference'
        ? ['It roughly doubles.', 'It is always unchanged.', 'It halves.']
        : [
            'No; another resource or quality evaluation still matters.',
            'Yes; that one metric proves success.',
          ],
    correct: 0,
    explanation:
      s.phase === 'inference'
        ? 'K/V retains entries per token. Longer context increases retained state, even when prefix reuse reduces prefill computation.'
        : s.phase === 'pretrain'
          ? 'Memory admission is necessary, but compute, collectives, pipeline bubbles and checkpoint overhead still determine useful progress.'
          : 'This simulation verifies objective mechanics, state and work. Held-out quality evaluation is a separate requirement.',
  }
}
export function providerRecap(
  s: ProviderState,
  baselineAtTime?: ProviderState,
): Recap {
  let baseline =
    baselineAtTime || providerReducer(createProvider(), { type: 'run' })
  while (baseline.time < s.time - 1e-8 && baseline.status === 'running')
    baseline = advanceProvider(baseline, Math.min(4, s.time - baseline.time))
  const m = providerMetrics(s)
  return {
    title:
      s.status === 'won'
        ? 'Capacity became useful customer work'
        : 'Replan the missing capacity contract',
    scope: 'Cloud provider · 64 physical GPU slots · same elapsed game time',
    outcome: `${s.completed.train} training jobs, ${s.completed.tune} tuning jobs and ${s.served} API requests completed. ${m.contracts}/4 contracts verified.`,
    changes: (['fleet', 'pod', 'rack', 'gpu'] as Layer[]).map(
      (level) =>
        `${LEVEL_NAMES[level]}: ${
          PROVIDER_DECISIONS.filter((d) => d.level === level && s.config[d.id])
            .map((d) => d.option)
            .join('; ') || 'baseline policies'
        }`,
    ),
    deltas: [
      {
        label: 'Training / tuning jobs committed',
        before: `${baseline.completed.train} / ${baseline.completed.tune}`,
        after: `${s.completed.train} / ${s.completed.tune}`,
      },
      {
        label: 'API requests delivered',
        before: String(baseline.served),
        after: String(s.served),
      },
      {
        label: 'Runtime OOM events',
        before: String(baseline.oom),
        after: String(s.oom),
      },
    ],
    comparisonLabel: 'Baseline → plan · observed work at the same elapsed time',
    tradeoff:
      'Burst headroom leaves some capacity unleased. Safe rolling placement waits for a cohort, and durable recovery consumes transfer time. High occupancy alone does not prove useful work.',
    question:
      'Why can eight free GPUs still leave an eight-GPU training gang queued?',
    answers: [
      'The slots may be fragmented across incompatible local domains.',
      'GPU count alone guarantees a compatible gang.',
      'A cloud quota creates additional physical memory.',
    ],
    correct: 0,
    explanation:
      'The scheduler must satisfy count, topology, per-device memory and tenant rights together. Placement can improve the shape of capacity without inventing devices.',
  }
}
export function requestRecap(visited: number, total: number): Recap {
  return {
    title: 'One request, several representations',
    scope:
      'Request walkthrough · split prefill/decode reference model · teaching time',
    outcome: `${visited} of ${total} request stages visited. This is a walkthrough, not an executed model response.`,
    changes: [
      'Fleet: authenticate and route independent requests.',
      'Pod: choose compatible capacity and exchange state when required.',
      'Server: coordinate the devices of a replica.',
      'GPU: compute prompt state, retain K/V and decode tokens.',
    ],
    deltas: [],
    tradeoff:
      'Prefill and decode use resources differently. More batching can improve total throughput while increasing the latency or memory demand of one request.',
    question:
      'Does every decode token require sending the full prompt K/V across the network?',
    answers: [
      'No; colocated serving can reuse local state.',
      'Yes; every deployment must resend the full cache.',
    ],
    correct: 0,
    explanation:
      'The ownership and serving architecture determine the boundary. Split serving may hand off prompt state; colocated decode reads and appends local state.',
  }
}
export function servingRecap(s: GameState): Recap {
  const mission = missionById(s.mission),
    m = getGameMetrics(s),
    start = createGame(s.mission),
    initial = getGameMetrics(start)
  const capacity = (state: GameState, type: 'prefill' | 'decode') =>
    state.units
      .filter((u) => u.type === type)
      .reduce(
        (sum, u) => sum + (type === 'prefill' ? prefillRate(u) : decodeRate(u)),
        0,
      )
  return {
    title:
      s.phase === 'victory'
        ? 'A complete path delivered answers'
        : 'Locate the missing stage or capacity',
    scope: `${mission.name} · illustrative serving district · modules represent capacity, not literal GPU counts`,
    outcome: `${s.served} requests delivered and ${s.lost} lost in ${n(s.time)} game seconds. ${s.served ? `${n(m.averageLatency)} s mean latency for delivered requests.` : 'No delivered-request latency has been observed.'}`,
    changesLabel: 'Capacity and scheduling choices',
    changes: [
      ...(['prefill', 'decode', 'cache', 'fabric'] as const).map(
        (type) =>
          `${MODULES[type].name}: ${s.units.filter((u) => u.type === type).length} modules, ${s.units.filter((u) => u.type === type).reduce((sum, u) => sum + u.level, 0)} total levels.`,
      ),
      `Dispatch: ${s.dispatchPolicy}; batching ${s.batching ? 'enabled' : 'disabled'}; prefix reuse ${s.prefixReuse ? 'enabled' : 'disabled'}; memory backfill ${s.memoryBackfill ? 'enabled' : 'disabled'}.`,
    ],
    comparisonLabel: 'Initial → final resource capacity · game units',
    deltas: [
      {
        label: 'Base prefill capacity',
        before: `${n(capacity(start, 'prefill'))} input tok/s`,
        after: `${n(capacity(s, 'prefill'))} input tok/s`,
      },
      {
        label: 'Base decode capacity',
        before: `${n(capacity(start, 'decode'))} output tok/s`,
        after: `${n(capacity(s, 'decode'))} output tok/s`,
      },
      {
        label: 'K/V capacity',
        before: `${initial.memory} MiB`,
        after: `${m.memory} MiB`,
      },
      {
        label: 'Shared fabric',
        before: `${initial.bandwidth} Gb/s`,
        after: `${m.bandwidth} Gb/s`,
      },
    ],
    tradeoff: `${mission.lesson} Capacity consumes credits and power; batching and admission determine how that capacity is shared.`,
    question: 'Does higher fabric bandwidth guarantee faster answers?',
    answers: [
      'No; compute, memory admission and queueing can still limit service.',
      'Yes; bandwidth alone determines response time.',
    ],
    correct: 0,
    explanation:
      'An answer needs prompt processing, retained state, any required transfer and decode. Improve the limiting stage, then check completed work and latency together.',
  }
}
export const activePolicyCount = (s: ProviderState) =>
  POLICIES.filter((p) => s.config[p]).length

export function trainingRecap(
  inputs: import('../../lifecycle/model').LifecycleInputs,
): Recap {
  const state = stateBytes(
    shapes[inputs.shape].parameters,
    inputs.dp,
    inputs.tp,
    inputs.pp,
    inputs.sharding,
  )
  const replicated = stateBytes(
    shapes[inputs.shape].parameters,
    inputs.dp,
    inputs.tp,
    inputs.pp,
    'ddp',
  )
  return {
    title: 'State ownership changed the memory budget',
    scope: `${inputs.dp * inputs.tp * inputs.pp}-GPU sized job · model state only · illustrative 80 GiB per GPU`,
    outcome: `${n(state / 2 ** 30)} GiB of model state per worker. Activations and runtime workspace still need additional room. No training update was executed by this sizing lesson.`,
    changes: [
      'Fleet: keep the same model and global job allocation.',
      'Pod: data-parallel workers cooperate instead of duplicating every training-state copy.',
      `Server: ${inputs.sharding.toUpperCase()} determines state ownership.`,
      'GPU: retain the local share and account for activations and workspace separately.',
    ],
    deltas: [
      {
        label: 'Model state per worker',
        before: `${n(replicated / 2 ** 30)} GiB`,
        after: `${n(state / 2 ** 30)} GiB`,
      },
    ],
    comparisonLabel: 'Replicated → selected · model-state estimate',
    tradeoff:
      'Sharding saves resident state but changes communication. A state-only fit does not prove that peak memory fits or that training is faster.',
    question:
      'Does a state-only memory fit prove that the complete training step fits and runs fastest?',
    answers: [
      'No; activations, workspace and communication also matter.',
      'Yes; the state number is the entire resource requirement.',
    ],
    correct: 0,
    explanation:
      'A useful capacity plan accounts for peak live memory, the parallel layout, compute and exposed communication, not just the saved state copies.',
  }
}
