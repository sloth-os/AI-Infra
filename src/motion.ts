import type { Layer, Traffic } from './content'
import { defaults, kvBytes, simulate } from './model.ts'
import type { Parameters, Strategy } from './model'
import { ringAllReduce } from './collective.ts'

export const ANIMATION_DURATION = 48
// Immutable exchange snapshots are shared by every frame; the animation only
// reads them and does not allocate/recompute a ring algorithm on each GPU frame.
const collectiveSnapshots = Array.from({ length: 15 }, (_, step) =>
  ringAllReduce(step),
)
for (const snapshot of collectiveSnapshots) {
  snapshot.buffers.forEach((row) => Object.freeze(row))
  snapshot.counts.forEach((row) => Object.freeze(row))
  Object.freeze(snapshot.buffers)
  Object.freeze(snapshot.counts)
  Object.freeze(snapshot)
}

export function collectiveTransfer(completedSteps: number, sender: number) {
  const step = Math.max(0, Math.min(14, Math.floor(completedSteps)))
  const rank = ((sender % 8) + 8) % 8
  const chunk =
    step < 7 ? (rank - step + 16) % 8 : (rank + 1 - (step - 7) + 16) % 8
  return {
    sender: rank,
    receiver: (rank + 1) % 8,
    chunk,
    value: collectiveSnapshots[step].buffers[rank][chunk],
    contributions: collectiveSnapshots[step].counts[rank][chunk],
    complete: step === 14,
  }
}
export type CameraView = 'isometric' | 'top' | 'front'
export interface MotionChapter {
  title: string
  short: string
  node: string
  layer: Layer
  payload: string
  explanation: string
  constraint: string
  color: string
}

const requestChapters: MotionChapter[] = [
  {
    title: 'Many users enter one service',
    short: 'Ingress',
    node: 'gateway',
    layer: 'fleet',
    payload: 'HTTPS · JSON text + tenant identity',
    explanation:
      'Three colored tenants share the API edge. Each request has its own ID, deadline, quota, and eventual output stream.',
    constraint: 'Bound the queue before GPUs run out of memory.',
    color: '#d0a7ef',
  },
  {
    title: 'Retrieve context, when needed',
    short: 'Retrieval',
    node: 'storage',
    layer: 'fleet',
    payload: 'Query text → semantic vector → top-k passages',
    explanation:
      'The orange path stages model weights and retrieves context. Retrieval embeddings are separate from the generator’s token embeddings.',
    constraint:
      'Retrieval adds latency; document freshness and tenant isolation matter.',
    color: '#e5b180',
  },
  {
    title: 'Route by work, not request count',
    short: 'Routing',
    node: 'scheduler',
    layer: 'fleet',
    payload: 'Token IDs + prefix key + estimated KV demand',
    explanation:
      'The router balances queue pressure against exact prefix-cache locality. The highlighted route selects one replica, not all 100,000 GPUs.',
    constraint: 'A long prompt costs more than a short request.',
    color: '#d5ed9e',
  },
  {
    title: 'Prefill computes the prompt together',
    short: 'Prefill',
    node: 'tensor',
    layer: 'rack',
    payload: '[S] token IDs → [S, 8192] hidden states',
    explanation:
      'Prompt positions execute in parallel through each of 80 layers. Eight tensor-parallel ranks exchange partial results; K and V are retained.',
    constraint:
      'Long prefill batches can interrupt already-streaming requests.',
    color: '#b59af5',
  },
  {
    title: 'Handoff the prompt’s KV state',
    short: 'KV handoff',
    node: 'fabric',
    layer: 'pod',
    payload: 'K / V blocks → 8 sharded transfers',
    explanation:
      'In split serving, prefill sends compatible per-layer KV blocks to decode. Purple parcels are tensor state, much larger than the original API text.',
    constraint:
      'Colocated workers skip this transfer. Split pools need bandwidth.',
    color: '#83d4d1',
  },
  {
    title: 'Decode one token per sequence',
    short: 'Decode',
    node: 'hbm',
    layer: 'gpu',
    payload: '[1, 8192] logical hidden state + cached K/V → logits → one token',
    explanation:
      'Memory feeds the compute die. A continuous batch advances each active sequence once; every generated token appends another K/V entry.',
    constraint: 'At small batches, memory bandwidth often limits decode.',
    color: '#d4ee9c',
  },
  {
    title: 'Stream the answer and release state',
    short: 'Stream',
    node: 'gateway',
    layer: 'fleet',
    payload: 'Token IDs → UTF-8 deltas → SSE',
    explanation:
      'The return path streams output to the right tenant. End-of-sequence or cancellation releases request-owned cache blocks.',
    constraint:
      'Propagate cancellation so abandoned requests stop consuming GPUs.',
    color: '#a1dbbb',
  },
]

const kvChapters: MotionChapter[] = [
  {
    title: 'Allocate pages, not a giant contiguous buffer',
    short: 'Allocate',
    node: 'hbm',
    layer: 'gpu',
    payload: 'Logical token blocks → physical KV pages',
    explanation:
      'The empty page banks reserve sequence state independently of model weights. Colored tiles represent groups of token entries, not literal memory addresses.',
    constraint:
      'Paging reduces fragmentation; metadata and available HBM still matter.',
    color: '#b89af3',
  },
  {
    title: 'Prefill writes keys and values',
    short: 'Write KV',
    node: 'hbm',
    layer: 'gpu',
    payload: 'K + V × 80 layers × 8 KV heads',
    explanation:
      'Each prompt position creates keys and values at every layer. The two banks fill together; the cache stores attention state, not the original text.',
    constraint: 'Cache bytes grow linearly with retained context.',
    color: '#b89af3',
  },
  {
    title: 'Move eight shards to the decode worker',
    short: 'Transfer',
    node: 'fabric',
    layer: 'pod',
    payload: 'Prompt KV / 8 → parallel rank-local transfers',
    explanation:
      'Watch sharded parcels cross the fabric between disaggregated workers. Use the network slider to see why the same state moves more slowly on a constrained link.',
    constraint:
      'The time estimate assumes 70% useful endpoint bandwidth and no contention.',
    color: '#7cd2d2',
  },
  {
    title: 'Read the past, append the present',
    short: 'Append',
    node: 'hbm',
    layer: 'gpu',
    payload: 'Existing cache + 320 KiB per new token / TP group',
    explanation:
      'Every decode step reads prior context and appends one new position. Each tensor-parallel rank owns one eighth of this illustrative GQA cache.',
    constraint: 'Long contexts reduce the number of sequences that fit.',
    color: '#d6ed9e',
  },
  {
    title: 'Return pages to the allocator',
    short: 'Release',
    node: 'hbm',
    layer: 'gpu',
    payload: 'EOS / cancellation → reclaim request-owned pages',
    explanation:
      'The banks empty as the request finishes. Compatible shared prefixes can be retained under an explicit cache policy; this animation releases the traced request.',
    constraint:
      'Reference counting and tenant isolation are part of correctness.',
    color: '#e3b783',
  },
]

export const tensorChapters: MotionChapter[] = [
  {
    title: 'Token IDs index embedding rows',
    short: 'Embed',
    node: 'tensor',
    layer: 'gpu',
    payload: '[S] integers → [S, 8192] BF16 features',
    explanation:
      'Each integer selects a learned embedding row. The colored columns stand for feature vectors; the full hidden width is 8,192.',
    constraint:
      'This lookup differs from a retrieval model’s sentence embedding.',
    color: '#d7ec9b',
  },
  {
    title: 'Project hidden states into Q, K, and V',
    short: 'Q · K · V',
    node: 'tensor',
    layer: 'gpu',
    payload: 'Q: [S,64,128] · K,V: [S,8,128]',
    explanation:
      'Grouped-query attention uses 64 query heads and 8 key/value heads in this model. Three differently colored streams carry distinct tensors.',
    constraint:
      'Shapes shown are across the TP group; each rank holds a shard.',
    color: '#b8a0f1',
  },
  {
    title: 'Encode position and retain K/V',
    short: 'Position',
    node: 'hbm',
    layer: 'gpu',
    payload: 'RoPE(Q,K) · K,V → paged cache',
    explanation:
      'Rotary position transforms apply to queries and keys. Keys and values go to their persistent banks; queries are transient for this pass.',
    constraint:
      'A cache hit must match the model and compatible execution settings.',
    color: '#7dd4cb',
  },
  {
    title: 'Attend only to allowed past positions',
    short: 'Attention',
    node: 'tensor',
    layer: 'gpu',
    payload: 'softmax(QKᵀ / √128 + causal mask) · V',
    explanation:
      'The triangular tile shows the causal mask. Lit cells represent allowed attention; the upper triangle stays dark. Tiling reuses on-chip memory.',
    constraint:
      'FlashAttention reduces HBM IO; dense attention still has context-dependent work.',
    color: '#e6bf87',
  },
  {
    title: 'Combine heads and synchronize ranks',
    short: 'Reduce',
    node: 'nvlink',
    layer: 'gpu',
    payload: 'Local partials → collective → hidden state',
    explanation:
      'The head outputs are projected back into the hidden width. Tensor-parallel partial results are combined across the fast local fabric.',
    constraint:
      'Frequent synchronization makes TP sensitive to interconnect latency.',
    color: '#7bd3d4',
  },
  {
    title: 'Transform features with a gated MLP',
    short: 'MLP',
    node: 'tensor',
    layer: 'gpu',
    payload: 'Norm → gated expansion → projection + residual',
    explanation:
      'The feature columns expand and contract to illustrate a gated feed-forward network. Residual paths preserve the layer input. Repeat the block across 80 layers.',
    constraint:
      'The diagram is a conceptual block; tile counts are not model dimensions.',
    color: '#bd9feb',
  },
  {
    title: 'Turn the final state into a vocabulary distribution',
    short: 'Logits',
    node: 'tensor',
    layer: 'gpu',
    payload: 'Final hidden state → vocabulary logits',
    explanation:
      'Each bar represents an illustrative candidate’s logit, not a measured probability. Temperature and the sampling policy influence token selection.',
    constraint:
      'Logits are scores. A normalization/sampling policy is needed to choose a token.',
    color: '#e6b28a',
  },
  {
    title: 'Sample, emit, and feed the next iteration',
    short: 'Next token',
    node: 'gateway',
    layer: 'gpu',
    payload: 'One selected token → stream + next decode input',
    explanation:
      'The chosen token leaves on the green return path. Decode runs the next iteration with this token and the retained KV state; prefill does not repeat.',
    constraint:
      'Autoregressive dependence means a sequence advances one verified token at a time here.',
    color: '#d5ed9d',
  },
]

const collectiveChapters: MotionChapter[] = Array.from(
  { length: 14 },
  (_, i) => ({
    title:
      i < 7
        ? `Reduce-scatter · exchange ${i + 1} of 7`
        : `All-gather · exchange ${i - 6} of 7`,
    short: i < 7 ? `R${i + 1}` : `G${i - 6}`,
    node: 'nvlink',
    layer: 'rack' as Layer,
    payload:
      i < 7
        ? 'Send one chunk → add the incoming partial sum'
        : 'Send one reduced chunk → copy the incoming result',
    explanation:
      i < 7
        ? 'All eight ranks send clockwise simultaneously. Incoming chunks accumulate contributions. After seven exchanges, every rank owns one completely reduced chunk.'
        : 'Completed chunks circulate without being added again. After seven more exchanges, every rank has all eight reduced chunks, each equal to 36.',
    constraint:
      'This is a logical ring. The physical transport can traverse NVSwitch; NCCL can choose other algorithms.',
    color: i < 7 ? '#92d8cf' : '#d5ec9d',
  }),
)

export const motionChapters: Record<Traffic, MotionChapter[]> = {
  requests: requestChapters,
  kv: kvChapters,
  collectives: collectiveChapters,
  tensors: tensorChapters,
}

export interface MotionFrame {
  time: number
  progress: number
  chapterIndex: number
  chapter: MotionChapter
  chapterProgress: number
  mode: Traffic
  contextTokens: number
  generatedTokens: number
  cacheMiB: number
  shardMiB: number
  transferMs: number
  load: number
  activeBatch: number
  collectiveStep: number
  buffers: number[][]
  contributions: number[][]
}

export function getMotionFrame(
  time: number,
  mode: Traffic,
  p: Parameters = defaults,
  strategy: Strategy = 'continuous',
): MotionFrame {
  const progress = Math.min(
    1,
    Math.max(0, Number.isFinite(time) ? time / ANIMATION_DURATION : 0),
  )
  const chapters = motionChapters[mode]
  const chapterIndex = Math.min(
    chapters.length - 1,
    Math.floor(progress * chapters.length),
  )
  const chapterProgress =
    progress === 1 ? 1 : progress * chapters.length - chapterIndex
  let generatedTokens = 0
  let contextTokens = p.inputTokens
  if (mode === 'requests') {
    generatedTokens =
      chapterIndex < 5
        ? 0
        : chapterIndex === 5
          ? Math.floor(chapterProgress * p.outputTokens)
          : p.outputTokens
    contextTokens =
      chapterIndex < 3
        ? 0
        : chapterIndex === 3
          ? Math.floor(p.inputTokens * chapterProgress)
          : p.inputTokens + generatedTokens
    if (progress === 1) contextTokens = 0
  } else if (mode === 'kv') {
    generatedTokens =
      chapterIndex === 3
        ? Math.floor(chapterProgress * p.outputTokens)
        : chapterIndex > 3
          ? p.outputTokens
          : 0
    contextTokens =
      chapterIndex === 0
        ? 0
        : chapterIndex === 1
          ? Math.floor(p.inputTokens * chapterProgress)
          : chapterIndex === 4
            ? Math.floor(
                (p.inputTokens + p.outputTokens) * (1 - chapterProgress),
              )
            : p.inputTokens + generatedTokens
  }
  const cacheMiB = kvBytes(contextTokens) / 2 ** 20
  const collectiveStep = Math.min(14, Math.floor(progress * 14))
  const collective = collectiveSnapshots[collectiveStep]
  const model = simulate(p, strategy)
  const transferMs =
    (kvBytes(p.inputTokens) / 1e9 / ((p.networkGbps / 8) * 0.7)) * 1000
  return {
    time: progress * ANIMATION_DURATION,
    progress,
    chapterIndex,
    chapter: chapters[chapterIndex],
    chapterProgress,
    mode,
    contextTokens,
    generatedTokens,
    cacheMiB,
    shardMiB: cacheMiB / 8,
    transferMs,
    load: model.utilization,
    activeBatch: model.batch,
    collectiveStep,
    buffers: collective.buffers,
    contributions: collective.counts,
  }
}

export function chapterTime(mode: Traffic, index: number) {
  return (
    (Math.max(0, Math.min(motionChapters[mode].length - 1, index)) /
      motionChapters[mode].length) *
      ANIMATION_DURATION +
    0.02
  )
}

export const payloadDescriptions: Record<
  Traffic,
  { title: string; transport: string; formula: string }
> = {
  requests: {
    title: 'One independently routed sequence',
    transport: 'HTTPS / server-sent events',
    formula: 'Text → token IDs → model state → streamed text',
  },
  kv: {
    title: 'A sharded prompt KV cache',
    transport: 'RDMA over InfiniBand / RoCE',
    formula: '2 × 80 layers × 8 KV heads × 128 × 2 bytes / token',
  },
  collectives: {
    title: 'A chunk in a logical ring all-reduce',
    transport: 'NVLink / NVSwitch in this server',
    formula: '2(n−1) exchanges · M/n bytes sent per exchange',
  },
  tensors: {
    title: 'An activation inside a transformer block',
    transport: 'On-chip SRAM / HBM / local fabric',
    formula: 'BF16 vectors · causal attention · eight TP ranks',
  },
}
