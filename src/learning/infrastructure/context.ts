import type { Layer, Traffic } from '../../content'
import { hotIssues } from '../../issues/catalog.ts'
import { issueResults, parseIssueLocation } from '../../issues/model.ts'
import type { IssueView } from '../../issues/model'
import { findExample } from '../../examples/catalog.ts'
import type { ExampleId } from '../../examples/catalog'
import {
  exampleBudgets,
  defaultExampleInputs,
  parseExampleLocation,
} from '../../examples/model.ts'
import type { ExampleView } from '../../examples/model'
import { lifecycleStages, phaseInfo } from '../../lifecycle/catalog.ts'
import type { LifecyclePhase } from '../../lifecycle/catalog'
import {
  lifecycleBudgets,
  pipelineSchedule,
  lifecycleMetrics,
  parseLifecycleLocation,
} from '../../lifecycle/model.ts'
import type { LifecycleView } from '../../lifecycle/model'
import {
  parseProviderLesson,
  providerLessonFrame,
  PROVIDER_STEPS,
} from '../provider/model.ts'
import type { ProviderLesson } from '../provider/model'

export const levels: Layer[] = ['fleet', 'pod', 'rack', 'gpu']
export const levelNames: Record<Layer, string> = {
  fleet: 'Fleet',
  pod: 'Pod',
  rack: 'Server',
  gpu: 'GPU',
}
export type ContextSelection =
  | { kind: 'issue'; view: IssueView }
  | { kind: 'lifecycle'; view: LifecycleView }
  | { kind: 'model'; view: ExampleView }
  | { kind: 'provider'; view: ProviderLesson }
export type Pattern =
  | 'power'
  | 'pages'
  | 'transfer'
  | 'experts'
  | 'tokens'
  | 'weights'
  | 'rollouts'
  | 'placement'
  | 'checkpoint'
  | 'isolation'
  | 'gradients'
  | 'media'
  | 'audio'
export interface ContextStep {
  title: string
  layer: Layer
}
export interface ContextFrame {
  deviceBinding?: {
    server: number
    viewServer: number
    gpu: number
    phase?: 'queued' | 'staging' | 'running' | 'checkpoint' | 'done'
  }
  key: string
  kind: ContextSelection['kind']
  id: string
  layer: Layer
  title: string
  color: string
  stage: number
  steps: ContextStep[]
  playing: boolean
  duration: number
  node: string
  traffic: Traffic
  heading: string
  explanation: string
  payload: string
  scope: string
  boundary: string
  pattern: Pattern
  count: number
  applied: boolean
  pressure: number
  probability: number
  values?: number[]
  slots?: boolean[]
  supplementCount?: number
  supplementRole?: string
  supplementScale?: number
  schedule?: number[][]
  scheduleSlot?: number
  metrics: { label: string; value: string }[]
  workload: 'training' | 'text' | 'media' | 'audio' | 'issue'
}
const modelLevels: Record<ExampleId, Layer[]> = {
  'kimi-k3': ['fleet', 'pod', 'rack', 'pod', 'gpu', 'fleet'],
  'qwen-image-21': ['fleet', 'rack', 'gpu', 'pod', 'gpu', 'fleet'],
  'minimax-h3': ['fleet', 'rack', 'gpu', 'pod', 'gpu', 'fleet'],
  'minimax-music-3': ['fleet', 'pod', 'rack', 'rack', 'gpu', 'gpu'],
  personaplex: ['fleet', 'gpu', 'rack', 'rack', 'gpu', 'pod'],
  'cosyvoice-2': ['fleet', 'rack', 'pod', 'gpu', 'gpu', 'fleet'],
}
export function contextSteps(selection: ContextSelection): ContextStep[] {
  if (selection.kind === 'provider') return PROVIDER_STEPS
  if (selection.kind === 'issue')
    return levels.map((layer) => ({ title: levelNames[layer], layer }))
  if (selection.kind === 'model')
    return findExample(selection.view.id)!.stages.map((s, i) => ({
      title: s.short,
      layer: modelLevels[selection.view.id][i],
    }))
  const v = selection.view
  const mapping: Layer[] =
    v.phase === 'pretrain'
      ? ['fleet', 'pod', 'gpu', 'rack', 'pod', 'fleet']
      : v.phase === 'inference'
        ? ['rack', 'fleet', 'gpu', 'gpu', 'pod', 'fleet']
        : v.method === 'grpo'
          ? ['fleet', 'pod', 'gpu', 'pod', 'rack', 'fleet']
          : v.method === 'dpo'
            ? ['fleet', 'pod', 'rack', 'gpu', 'rack', 'fleet']
            : ['fleet', 'pod', 'gpu', 'gpu', 'rack', 'fleet']
  return lifecycleStages(v.phase, v.method).map((s, i) => ({
    title: s.short,
    layer: mapping[i],
  }))
}
export function stageAtLevel(
  selection: ContextSelection,
  layer: Layer,
): number {
  if (selection.kind === 'issue') return selection.view.stage
  const steps = contextSteps(selection)
  if (steps[selection.view.stage]?.layer === layer) return selection.view.stage
  return steps.findIndex((s) => s.layer === layer)
}
export function nativeLevel(selection: ContextSelection, stage: number): Layer {
  return contextSteps(selection)[
    Math.max(0, Math.min(contextSteps(selection).length - 1, stage))
  ].layer
}
export function readLevel(href: string): Layer | null {
  const raw = new URL(href).searchParams.get('level')
  return raw === 'server'
    ? 'rack'
    : levels.includes(raw as Layer)
      ? (raw as Layer)
      : null
}
export function withContextLocation(
  href: string,
  page: string,
  layer: Layer,
): string {
  const url = new URL(href)
  url.searchParams.set('view', page)
  url.searchParams.set('level', layer === 'rack' ? 'server' : layer)
  return url.toString()
}

type Perspective = [heading: string, explanation: string]
const issuePerspectives: Record<string, Record<Layer, Perspective>> = {
  power: {
    fleet: [
      'Energize the fleet before allocating it',
      'Electrical supply and cooling constrain which installed GPU capacity can run. The bus and cooling glyphs connect to these same fleet pods; the MW readout belongs to the fleet experiment.',
    ],
    pod: [
      'Distribute a real power envelope',
      'Rack density, distribution and cooling loops limit a pod independently of its available GPU count. Lower facility overhead does not remove accelerator heat.',
    ],
    rack: [
      'Pack an eight-slot server within its envelope',
      'GPUs, CPUs, NICs and fans share a chassis power and thermal budget. The experiment excludes non-GPU IT; its fleet MW must not be read as this server’s measured power.',
    ],
    gpu: [
      'Convert electrical input into work and heat',
      'The accelerator’s assumed watts feed the fleet power floor. Heat removal, sustained clocks and useful work are connected; a PUE change does not reduce this chip’s IT heat.',
    ],
  },
  'kv-memory': {
    fleet: [
      'Admission is also a memory decision',
      'Aggregate free GPUs do not guarantee space for a particular model and its concurrent sequences. Route into compatible groups with enough request-state budget.',
    ],
    pod: [
      'Place state near the workers that read it',
      'Paged HBM, host memory and remote cache tiers exchange state at different costs. Pooling capacity does not make remote reads free.',
    ],
    rack: [
      'Partition the model-group KV budget',
      'The experiment counts all model-group KV, not bytes per physical card. TP layout, weights and workspace determine what each accelerator can actually reserve.',
    ],
    gpu: [
      'Read and append retained K/V in HBM',
      'Pages attach to the existing HBM stacks. Thirty-two glyphs denotes one selected budget; display caps at 64. Assumed 8-bit halves requested payload; admission and full requested bytes remain explicit.',
    ],
  },
  disaggregation: {
    fleet: [
      'Choose colocated or split serving pools',
      'Independent scaling can reduce prefill/decode interference, but admission must account for state ownership, compatible placement and two queues.',
    ],
    pod: [
      'Transfer prompt state across this fabric',
      'Prefill and decode workers exchange full-prompt KV through the visible leaf–spine fabric. Concurrent copies share the assumed endpoint, so this is a wire floor rather than an SLO prediction.',
    ],
    rack: [
      'Match the parallel layouts at both ends',
      'NIC bandwidth, TP shards, staging buffers and redistribution constrain handoff. Intra-server NVLink traffic and inter-pool network transfer are separate paths.',
    ],
    gpu: [
      'Produce state before handing it off',
      'Prefill writes K/V into HBM; transfer reads that state and decode retains it. API text and one streamed token are much smaller than this full-prompt payload.',
    ],
  },
  moe: {
    fleet: [
      'Place complete expert-capable groups',
      'A large expert model needs a compatible placement, weight memory and routing domain. Independent replicas do not share one universal expert queue.',
    ],
    pod: [
      'Dispatch and combine over the fabric',
      'Logical router choices fan hidden vectors into expert workers. A hot expert can set the critical path even when average traffic looks healthy. Replica routing preserves logical expert identity.',
    ],
    rack: [
      'Keep suitable expert exchanges local',
      'NVLink-local placement and scale-out expert communication have different costs. Redundant expert state consumes memory and needs consistent updates during training.',
    ],
    gpu: [
      'Gather tokens, run expert GEMMs, combine',
      'Expert glyphs sit on the compute die. Their heights represent expected assignments to workers in the toy, not measured kernel time. Routing, memory reads and GEMMs all consume GPU resources.',
    ],
  },
  reasoning: {
    fleet: [
      'Admit long jobs without starving short ones',
      'Completion length retains scheduling slots and state. Judge fleet goodput and completion tails as well as first-token latency.',
    ],
    pod: [
      'Schedule drafting and verification capacity',
      'A draft model adds work and memory. Replica placement, concurrency and acceptance determine whether a supported speculative method helps.',
    ],
    rack: [
      'Account for every verification cycle',
      'Draft/target residency and TP communication compete with useful decode. The serial-cost exercise excludes real batching and kernel overhead.',
    ],
    gpu: [
      'Verify proposals before advancing the sequence',
      'The verifier runs at the compute die. Green/red tint weights encode p, p², p³ and p⁴ plus one guaranteed correction/bonus token. At poor acceptance, drafting can lose.',
    ],
  },
  precision: {
    fleet: [
      'Compare useful work at validated quality',
      'Smaller representations can change capacity and cost. Hardware support, model quality and end-to-end throughput must be evaluated together.',
    ],
    pod: [
      'Move the representation actually stored',
      'Packed values, scales and other state travel between workers. Nominal bit width alone does not determine network bytes or distributed-training stability.',
    ],
    rack: [
      'Budget replicated and sharded state',
      'Weight copies, activation buffers, workspace and collective peaks compete across the server. The exercise counts only its declared flat weight representation.',
    ],
    gpu: [
      'Load packed weights and their scales',
      'Payload glyphs and gold metadata attach to HBM/compute. This generic FP32-scale-per-block exercise is deliberately separate from NVFP4’s documented hierarchical layout.',
    ],
  },
  rl: {
    fleet: [
      'Coordinate rollout, reward and learner pools',
      'An online policy update spans generation, verification, optimization and policy publication. Fleet utilization can hide idle learners or stale samples.',
    ],
    pod: [
      'Exchange samples and publish compatible policies',
      'Rollout tokens and scores reach learners; updated weights or supported adapters reach generation workers. These flows have different sizes and ownership.',
    ],
    rack: [
      'Fit the base, adapters and learner state',
      'LoRA reduces selected trainable state and compatible publication bytes. Frozen base weights, activations and rollout work remain.',
    ],
    gpu: [
      'Generate samples and differentiate the objective',
      'Generation and training use different graphs and memory lifetimes. The rollout glyphs show a group; the calculated token work includes every declared prompt and completion.',
    ],
  },
  placement: {
    fleet: [
      'Reserve a topology-compatible gang',
      'Sixteen free GPUs scattered across nodes may admit no eight-GPU local group. Allocation is constrained by locality and compatible resources, not just a fleet total.',
    ],
    pod: [
      'Choose an eligible topology domain',
      'A model’s locality requirement can bind a node, rack or network domain. Queueing and admission need that topology information.',
    ],
    rack: [
      'Expose contiguous local capacity',
      'Green slots are free and muted slots are occupied in the existing eight-GPU server. Ideal workload compaction frees whole local groups without creating GPU slots.',
    ],
    gpu: [
      'Match the actual device to its claim',
      'Memory capacity, device features and sharing rules can make a free slot unsuitable. The simple gang exercise assumes homogeneous devices and excludes migration cost.',
    ],
  },
  reliability: {
    fleet: [
      'Restore a complete training job',
      'Durable checkpoints bind weights, optimizer state, RNG and data progress. The assumed MTBF belongs to the whole job, not an individual GPU.',
    ],
    pod: [
      'Coordinate ranks and checkpoint traffic',
      'One failed or slow rank can stall a synchronous group. Checkpoint/storage bandwidth and recovery coordination determine useful training progress.',
    ],
    rack: [
      'Respect local failure domains',
      'Local saves can be fast but may share the failed node’s fate. The recovery cue is teaching time, not a simulation of the selected failure rate.',
    ],
    gpu: [
      'Save the state needed to resume optimization',
      'Serving weights alone cannot restore optimizer moments or training progress. More frequent saves reduce rework but consume bandwidth and time.',
    ],
  },
  isolation: {
    fleet: [
      'Enforce authenticated tenant boundaries',
      'Admission, model versions, distributed endpoints and resource budgets belong to an enforced trust boundary. A client-chosen cache salt is not authorization.',
    ],
    pod: [
      'Route within compatible cache scopes',
      'State reuse must match authorized tenant/context and model version. Shared network/cache services need their own isolation controls.',
    ],
    rack: [
      'Separate ownership while sharing hardware',
      'Tenants may use the same physical server while retaining distinct state ownership. Partitioned caches can use more memory than unsafe global reuse.',
    ],
    gpu: [
      'Partition reusable KV by enforced scope',
      'Colored tiles denote distinct tenant scopes on HBM. Block-equivalent readouts show storage cost; no attack, breach probability or security proof is simulated.',
    ],
  },
}
const relevance: Record<Layer, number[]> = {
  fleet: [0, 7, 8, 9, 6, 4],
  pod: [2, 3, 6, 8, 7, 1, 9],
  rack: [7, 5, 1, 3, 8, 2],
  gpu: [1, 5, 4, 3, 9, 0],
}
export function issuesAtLevel(layer: Layer) {
  return relevance[layer].map((i) => ({ index: i, issue: hotIssues[i] }))
}
const lifecyclePerspective: Record<
  LifecyclePhase,
  Record<Layer, Perspective>
> = {
  pretrain: {
    fleet: [
      'Datasets, placement and durable progress',
      'Storage supplies packed examples; a gang scheduler places a complete DP × TP × PP job. Checkpoints preserve optimizer and data progress. The reference fleet is not one compulsory training collective.',
    ],
    pod: [
      'Exchange partitions and synchronize peers',
      'Pipeline activations, TP collectives and DP gradient synchronization have different participants. The fabric glyphs distinguish work movement from checkpoint publication.',
    ],
    rack: [
      'Map parallel ranks onto eight physical slots',
      'TP partitions a layer, PP partitions layers, and DP handles distinct examples. The eight-card server is one reference building block; the calculated job may span many servers.',
    ],
    gpu: [
      'Forward, loss, backward, optimizer state',
      'The existing compute die reads weights/activations from HBM. Backward produces gradients; optimizer updates consume additional state. The declared state budget excludes activation and runtime peaks.',
    ],
  },
  posttrain: {
    fleet: [
      'Curate feedback and coordinate policy versions',
      'Demonstrations, preference pairs or rollout prompts enter versioned jobs. Evaluations and compatible serving bundles leave the training workflow.',
    ],
    pod: [
      'Balance generation, evaluation and learning',
      'GRPO has online rollouts and rewards; SFT/DPO consume different datasets and objectives. Role separation and publication need explicit versions and measured queue tails.',
    ],
    rack: [
      'Fit policy, reference and learner roles',
      'Policy/reference evaluations, low-rank updates and gradient synchronization share finite device memory. Logical evaluations do not imply a fixed number of physical GPUs.',
    ],
    gpu: [
      'Different objectives, different work',
      'SFT masks response targets; DPO compares policy/reference preference gaps; GRPO uses sampled completions and relative rewards. Smaller trainable state does not remove activation or generation costs.',
    ],
  },
  inference: {
    fleet: [
      'Many APIs, independent compatible replicas',
      'Authenticate and admit requests, choose warm model/version groups, and preserve fairness. One hundred thousand GPUs normally form many replicas rather than one global gradient collective.',
    ],
    pod: [
      'Route state and schedule serving pools',
      'Keep KV local when prefill/decode are colocated. Draw the full-prompt inter-pool handoff only when the disaggregated option is selected; client output streaming is a separate flow.',
    ],
    rack: [
      'Warm and execute a model-parallel group',
      'Eight reference accelerators communicate through NVSwitch; supported layouts partition model work. Inference keeps weights and request state, without Adam training moments.',
    ],
    gpu: [
      'Embed, prefill, decode and release state',
      'Prompt positions create K/V in HBM. Sequential decoding reads retained state, appends new entries and emits tokens; completion frees request-owned pages while compatible weights stay warm.',
    ],
  },
}
const modelPerspective: Record<Layer, Perspective> = {
  fleet: [
    'Admission, routing and artifacts',
    'Route this model’s request format to compatible warm workers, then return its documented stream or media artifact. These are conceptual roles in the reference fleet, not a claim about the vendor’s private inventory.',
  ],
  pod: [
    'Worker placement and the right traffic',
    'Place compatible workers and expose their real state, activation or media handoff. Independent replica/job routing is distinct from model-parallel collectives; a multi-node deployment is not assumed.',
  ],
  rack: [
    'Residency and local model execution',
    'Use the model-specific source recipe to decide which components share or split devices. The eight visible slots are reference hardware, not a requirement that this model consumes eight GPUs.',
  ],
  gpu: [
    'Model-specific data transformations',
    'The selected operation is attached to the physical chip and HBM. Text, image latents, audiovisual tokens and speech/audio states keep their published representations; the generic dense-KV formula is not substituted.',
  ],
}
export function contextAtLevel(
  selection: ContextSelection,
  layer: Layer,
): ContextFrame {
  if (selection.kind === 'provider')
    return providerLessonFrame(selection.view, layer)
  const steps = contextSteps(selection),
    ordinal = levels.indexOf(layer)
  const base = {
    key: '',
    kind: selection.kind,
    id: '',
    layer,
    title: '',
    color: '#c6dea0',
    stage: 0,
    steps,
    playing: selection.view.playing,
    duration: 4,
    node: 'tensor',
    traffic: 'requests' as Traffic,
    heading: '',
    explanation: '',
    payload: '',
    scope: '',
    boundary: '',
    pattern: 'tokens' as Pattern,
    count: 16,
    applied: false,
    pressure: 0.5,
    probability: 0.7,
    metrics: [] as ContextFrame['metrics'],
    workload: 'issue' as ContextFrame['workload'],
  }
  if (selection.kind === 'issue') {
    const v = selection.view,
      topic = hotIssues[v.stage],
      r = issueResults(v),
      perspective = issuePerspectives[topic.id][layer]
    const patterns: Pattern[] = [
      'power',
      'pages',
      'transfer',
      'experts',
      'tokens',
      'weights',
      'rollouts',
      'placement',
      'checkpoint',
      'isolation',
    ]
    const scopes = [
      'Fleet power floor',
      'Model-group KV',
      'Shared endpoint',
      'Logical MoE layer',
      'One serial sequence',
      'Weight representation',
      'One RL round',
      'Local placement',
      'Whole training job',
      'Tenant cache scopes',
    ]
    const node =
      layer === 'fleet'
        ? v.stage === 8
          ? 'storage'
          : v.stage === 9
            ? 'gateway'
            : [1, 5, 6].includes(v.stage)
              ? 'prefill'
              : 'scheduler'
        : layer === 'pod'
          ? [2, 3, 8].includes(v.stage)
            ? 'fabric'
            : 'prefill'
          : layer === 'rack'
            ? [2, 3, 8].includes(v.stage)
              ? 'nvlink'
              : [1, 5, 9].includes(v.stage)
                ? 'hbm'
                : 'tensor'
            : [1, 5, 9].includes(v.stage)
              ? 'hbm'
              : 'tensor'
    return {
      ...base,
      id: topic.id,
      stage: ordinal,
      duration: 5,
      title: topic.title,
      color: topic.color,
      node,
      traffic: [1, 2, 9].includes(v.stage)
        ? 'kv'
        : v.stage === 3
          ? 'collectives'
          : 'requests',
      heading: perspective[0],
      explanation: perspective[1],
      payload: topic.movement,
      scope: scopes[v.stage],
      boundary: topic.assumptions,
      pattern: patterns[v.stage],
      count: topic.id === 'moe' && v.applied ? 17 : r.visualCount,
      values:
        topic.id === 'moe'
          ? [
              v.inputs.skew / 100 / (v.applied ? 2 : 1),
              ...Array(15).fill((2 - v.inputs.skew / 100) / 15),
              ...(v.applied ? [v.inputs.skew / 200] : []),
            ]
          : undefined,
      slots:
        topic.id === 'placement'
          ? Array.from({ length: v.inputs.nodes * 8 }, (_, i) =>
              v.applied
                ? i < v.inputs.nodes * v.inputs.free
                : i % 8 < v.inputs.free,
            )
          : undefined,
      supplementCount:
        topic.id === 'precision' && v.applied
          ? 8
          : topic.id === 'rl'
            ? v.inputs.destinations
            : topic.id === 'power'
              ? 2
              : 0,
      supplementRole:
        topic.id === 'rl'
          ? 'policy-publication'
          : topic.id === 'power'
            ? 'power-and-cooling'
            : 'scale-metadata',
      supplementScale:
        topic.id === 'rl' && v.applied
          ? Math.max(0.04, Math.sqrt(r.candidate / r.baseline))
          : 1,
      applied: v.applied,
      pressure: r.pressure,
      probability:
        v.inputs.acceptance === undefined ? 0.7 : v.inputs.acceptance / 100,
      metrics: r.metrics.map((m) => ({ label: m.label, value: m.value })),
      key: `issue:${topic.id}:${layer}`,
    }
  }
  if (selection.kind === 'lifecycle') {
    const v = selection.view,
      info = phaseInfo(v.phase),
      s = lifecycleStages(v.phase, v.method)[v.stage],
      perspective = lifecyclePerspective[v.phase][layer],
      m = lifecycleMetrics(v.inputs)
    let pattern: Pattern =
      v.phase === 'pretrain'
        ? v.stage === 5
          ? 'checkpoint'
          : v.stage >= 3
            ? 'gradients'
            : v.stage === 0
              ? 'tokens'
              : 'weights'
        : v.phase === 'posttrain'
          ? v.method === 'grpo' && v.stage <= 3
            ? 'rollouts'
            : v.stage === 5
              ? 'weights'
              : 'gradients'
          : v.stage === 0
            ? 'weights'
            : v.stage === 4 && v.inputs.disaggregated
              ? 'transfer'
              : v.stage === 3
                ? 'pages'
                : 'tokens'
    // There is no inter-pool KV handoff in colocated inference.
    if (v.phase === 'inference' && layer === 'pod')
      pattern = v.inputs.disaggregated ? 'transfer' : 'tokens'
    const node =
      layer === 'fleet'
        ? v.stage === 5 || (v.phase === 'pretrain' && v.stage === 0)
          ? 'storage'
          : 'scheduler'
        : layer === 'pod'
          ? pattern === 'transfer' || pattern === 'gradients'
            ? 'fabric'
            : 'prefill'
          : layer === 'rack'
            ? pattern === 'gradients' || pattern === 'transfer'
              ? 'nvlink'
              : 'tensor'
            : pattern === 'pages' || pattern === 'weights'
              ? 'hbm'
              : 'tensor'
    return {
      ...base,
      id: `${v.phase}:${v.method}`,
      title: `${info.title}${v.phase === 'posttrain' ? ` · ${v.method.toUpperCase()}` : ''}`,
      color: info.color,
      stage: v.stage,
      node,
      heading: perspective[0],
      explanation: perspective[1],
      payload: `${s.input} → ${s.output}`,
      boundary: s.performance,
      scope: 'Declared lifecycle sizing model',
      schedule:
        v.phase === 'pretrain' && v.stage === 3
          ? (() => {
              const schedule = pipelineSchedule(
                v.inputs.pp,
                v.inputs.accumulation,
              )
              return Array.from({ length: 8 }, (_, rank) =>
                schedule[Math.floor(rank / v.inputs.tp) % v.inputs.pp].map(
                  (cell) =>
                    rank >= m.gpus
                      ? 0
                      : cell.kind === 'forward'
                        ? 1
                        : cell.kind === 'backward'
                          ? -1
                          : 0,
                ),
              )
            })()
          : undefined,
      scheduleSlot: v.inputs.scheduleSlot,
      pattern,
      workload: v.phase === 'inference' ? 'text' : 'training',
      count:
        pattern === 'rollouts'
          ? v.inputs.group
          : pattern === 'pages'
            ? Math.min(64, Math.ceil((v.inputs.prompt + v.inputs.output) / 128))
            : pattern === 'weights'
              ? Math.min(32, Math.max(4, m.gpus))
              : 24,
      traffic:
        pattern === 'gradients'
          ? 'collectives'
          : pattern === 'transfer' || pattern === 'pages'
            ? 'kv'
            : 'requests',
      metrics: lifecycleBudgets(v).map((b) => ({
        label: b.label,
        value: `${b.value}${b.unit ? ' ' + b.unit : ''}`,
      })),
      key: `lifecycle:${v.phase}:${v.method}:${v.stage}:${layer}`,
    }
  }
  const v = selection.view,
    model = findExample(v.id)!,
    s = model.stages[v.stage],
    perspective = modelPerspective[layer]
  const audio = ['music', 'duplex', 'tts'].includes(model.kind),
    media = ['image', 'video'].includes(model.kind)
  const pattern: Pattern =
    model.kind === 'moe'
      ? v.stage === 3
        ? 'experts'
        : v.stage === 2
          ? 'weights'
          : 'tokens'
      : media
        ? 'media'
        : audio && v.stage >= 2
          ? 'audio'
          : 'tokens'
  const node =
    layer === 'fleet'
      ? v.stage === 5 && media
        ? 'storage'
        : 'gateway'
      : layer === 'pod'
        ? pattern === 'experts'
          ? 'fabric'
          : 'prefill'
        : layer === 'rack'
          ? pattern === 'weights' || pattern === 'experts'
            ? 'nvlink'
            : 'tensor'
          : pattern === 'weights'
            ? 'hbm'
            : 'tensor'
  return {
    ...base,
    id: model.id,
    stage: v.stage,
    title: model.name,
    color: model.color,
    node,
    heading: perspective[0],
    explanation: perspective[1],
    payload: `${s.input} → ${s.output}`,
    scope: 'Model-specific source and payload budget',
    supplementCount:
      model.kind === 'moe' && v.stage === 3 ? 2 : model.kind === 'tts' ? 3 : 0,
    supplementRole: model.kind === 'moe' ? 'shared-expert' : 'lookahead',
    boundary: model.boundary,
    pattern,
    workload: audio ? 'audio' : media ? 'media' : 'text',
    count:
      model.kind === 'moe' && v.stage === 3
        ? 896
        : model.kind === 'tts'
          ? Math.min(100, v.inputs.hop)
          : media
            ? Math.min(64, 16 * (v.inputs.resolution / 512))
            : 24,
    metrics: exampleBudgets(v.id, v.inputs).map((b) => ({
      label: b.label,
      value: `${b.value}${b.unit ? ' ' + b.unit : ''}`,
    })),
    traffic: pattern === 'experts' ? 'collectives' : 'requests',
    key: `model:${model.id}:${v.stage}:${layer}`,
  }
}

export type Point3 = readonly [number, number, number]
export function hardwareAnchor(layer: Layer, node: string): Point3 {
  const map: Record<Layer, Record<string, Point3>> = {
    fleet: {
      gateway: [-7.8, 1.4, 6.5],
      scheduler: [-3.8, 1.4, 6.5],
      storage: [7.1, 1.8, 6.5],
      fabric: [0, 1.3, 6.3],
      prefill: [-4.7, 2.8, -4.5],
      decode: [6.2, 2.8, -4.5],
      power: [-9.1, 0.9, -3],
      cooling: [-9.1, 0.9, 1],
    },
    pod: {
      prefill: [-5.7, 3.5, -2.75],
      decode: [5.7, 3.5, -2.75],
      fabric: [0, 1.4, 0],
      scheduler: [-8.5, 1.5, 0],
      storage: [-7, 1.5, 5],
      power: [-8, 1, 4],
      cooling: [-8, 1, -4],
    },
    rack: {
      tensor: [-1.75, 2.3, -2.75],
      hbm: [5.25, 2.5, 2.75],
      nvlink: [0, 1.6, 0],
      fabric: [-8, 1.5, 0],
      power: [-7.3, 0.8, 4.5],
      cooling: [7, 0.8, 4.5],
    },
    gpu: {
      tensor: [0, 2, 0],
      hbm: [-4.7, 2.5, 1.5],
      nvlink: [2, 1.9, 5.5],
      fabric: [2, 1.9, 5.5],
      power: [-6.4, 1.3, -4],
      cooling: [6.4, 1.3, -4],
    },
  }
  return (
    map[layer][node] ||
    map[layer][
      layer === 'fleet' ? 'scheduler' : layer === 'pod' ? 'fabric' : 'tensor'
    ]
  )
}
export function contextRole(
  id: string,
  frame: ContextFrame,
): [string, string] | null {
  if (frame.id === 'cloud-provider') {
    const labels: Record<string, [string, string]> = {
      gateway: [
        'Cloud control API',
        'Tenant resource envelopes · no customer prompts',
      ],
      scheduler: [
        'Capacity admission',
        'Quotas · device claims · topology · peak reserve',
      ],
      prefill:
        frame.layer === 'pod'
          ? [
              'Selected Pod · four servers',
              'First four bays show this Pod’s 32 device claims',
            ]
          : [
              'Tenant capacity · Pod A',
              'Model providers own the running models and APIs',
            ],
      decode:
        frame.layer === 'pod'
          ? ['Reference bays', 'Outside the selected 32-device Pod allocation']
          : [
              'Tenant capacity · Pod B',
              'Fault-domain spread · other hardware is reference',
            ],
      fabric: [
        'Shared tenant data fabric',
        'Artifacts · datasets · durable checkpoints',
      ],
      storage: [
        'Scoped artifact storage',
        'Tenant identity + digest/version + access policy',
      ],
      tensor: [
        'Leased accelerator',
        'Customer training / tuning / inference runtime',
      ],
      hbm: [
        'Per-device memory budget',
        'No cross-device or cross-tenant memory pooling',
      ],
      nvlink: [
        'Eight-device local domain',
        'Training ranks must fit within this server',
      ],
    }
    return labels[id] || null
  }
  if (frame.kind === 'issue' && frame.id === 'rl') {
    const labels: Record<string, [string, string]> = {
      prefill: ['Rollout workers', 'Generation under a versioned policy'],
      decode: [
        'Reward / learner roles',
        'Samples, evaluation and policy updates',
      ],
      scheduler: [
        'Online job coordination',
        'Versioned rollout / learner pools',
      ],
      hbm: [
        'Policy and learner state',
        'Base · adapters · activations · buffers',
      ],
      tensor: [
        'Accelerator compute',
        'Rollout / learner roles on reference hardware',
      ],
    }
    return labels[id] || null
  }
  if (frame.workload === 'training') {
    const labels: Record<string, [string, string]> = {
      gateway: ['Training data ingress', 'Packed examples / feedback jobs'],
      scheduler: ['Gang scheduler', 'DP × TP × PP placement'],
      prefill: [
        'Model partition workers',
        'Forward / backward / rollout roles',
      ],
      decode: ['Peer workers', 'Distinct DP examples / learner roles'],
      fabric: ['Training fabric', 'Activations · gradients · checkpoints'],
      tensor: [
        'Accelerator compute',
        'Model / data partitions on reference hardware',
      ],
      hbm: ['Training HBM', 'Weights · gradients · optimizer · activations'],
      nvlink: ['Local interconnect', 'Rank communication within the server'],
    }
    return labels[id] || null
  }
  if (frame.workload === 'media' || frame.workload === 'audio') {
    const labels: Record<string, [string, string]> = {
      gateway: [
        'Media request ingress',
        'Documented model input / output formats',
      ],
      prefill: [
        'Conditioning / generation workers',
        'Logical roles; placement is runtime-dependent',
      ],
      decode: [
        'Synthesis / output workers',
        'Media state · model-specific decoders',
      ],
      tensor: [
        'Accelerator compute',
        'Reference slots; not a model GPU requirement',
      ],
      hbm: [
        'Component state in HBM',
        'Weights · latents · buffers · workspace',
      ],
      fabric: [
        'Worker communication',
        'Job / activation / media flows; no generic LLM KV',
      ],
    }
    return labels[id] || null
  }
  if (frame.workload === 'text') {
    const labels: Record<string, [string, string]> = {
      prefill: [
        'Prefill-capable workers',
        'Compatible groups; layout is source-specific',
      ],
      decode: [
        'Decode-capable workers',
        'Independent requests / compatible model groups',
      ],
      tensor: [
        'Accelerator compute',
        'Reference slots; use the declared model layout',
      ],
      nvlink: ['Local interconnect', 'Model-group communication'],
      hbm: ['HBM state', 'Model-specific weights and request state'],
    }
    return labels[id] || null
  }
  const labels: Record<string, [string, string]> = {
    hbm: ['HBM resources', 'Weights · request state · workspace'],
    tensor: [
      'Accelerator compute',
      'Reference slots; selected experiments define residency',
    ],
  }
  return labels[id] || null
}

export function primaryIssueLevel(index: number): Layer {
  return (
    ([
      'fleet',
      'gpu',
      'pod',
      'pod',
      'gpu',
      'gpu',
      'fleet',
      'fleet',
      'fleet',
      'fleet',
    ][index] as Layer) || 'fleet'
  )
}

export function parseContextLocation(href: string): ContextSelection | null {
  const provider = parseProviderLesson(href)
  if (provider) {
    const level = readLevel(href)
    if (level) provider.stage = levels.indexOf(level)
    return { kind: 'provider', view: provider }
  }
  const issue = parseIssueLocation(href),
    life = parseLifecycleLocation(href),
    model = parseExampleLocation(href)
  let selected: ContextSelection | null = issue
    ? { kind: 'issue', view: issue }
    : life
      ? { kind: 'lifecycle', view: life }
      : model
        ? { kind: 'model', view: model }
        : new URL(href).searchParams.get('examples') === 'all'
          ? {
              kind: 'model',
              view: {
                id: 'kimi-k3',
                stage: 0,
                playing: false,
                inputs: defaultExampleInputs('kimi-k3'),
              },
            }
          : null
  const level = readLevel(href)
  if (selected && level && selected.kind !== 'issue')
    selected = {
      ...selected,
      view: { ...selected.view, stage: stageAtLevel(selected, level) },
    } as ContextSelection
  return selected
}
export function initialContextLevel(href: string): Layer {
  const selected = parseContextLocation(href)
  return (
    readLevel(href) ||
    (selected
      ? selected.kind === 'issue'
        ? primaryIssueLevel(selected.view.stage)
        : nativeLevel(selected, selected.view.stage)
      : 'fleet')
  )
}
