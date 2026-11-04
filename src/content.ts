export type Layer = 'fleet' | 'pod' | 'rack' | 'gpu'
export type Traffic = 'requests' | 'kv' | 'collectives' | 'tensors'
export type Page = 'explore' | 'journey' | 'lab' | 'guide'

export const layers: {
  id: Layer
  name: string
  title: string
  subtitle: string
  scale: string
  question: string
}[] = [
  {
    id: 'fleet',
    name: 'Fleet',
    title: 'A fleet is a system of systems.',
    subtitle: '20 logical pods · 100,000 GPUs · one coordinated service',
    scale: '100,000 GPUs',
    question: 'How do you make 100,000 GPUs act like one service?',
  },
  {
    id: 'pod',
    name: 'Pod',
    title: 'Keep the expensive conversations local.',
    subtitle: 'A logical 5,000-GPU serving pool · independent replicas',
    scale: '5,000 GPUs',
    question: 'Where should a request land, and where should its cache live?',
  },
  {
    id: 'rack',
    name: 'Server',
    title: 'Eight GPUs. One model replica.',
    subtitle: 'An illustrative 8× H100 SXM server · tensor parallelism = 8',
    scale: '8 GPUs',
    question: 'How do eight accelerators execute one model together?',
  },
  {
    id: 'gpu',
    name: 'GPU',
    title: 'The real bottleneck is often movement.',
    subtitle: 'One H100-class accelerator · memory, compute & interconnect',
    scale: '1 GPU',
    question: 'Why does a faster chip still spend time waiting?',
  },
]

export interface Detail {
  id: string
  tag: string
  title: string
  description: string
  metric: string
  metricLabel: string
  color: string
  facts: { label: string; value: string }[]
  problem: string
  solution: string
  tradeoff: string
}

export const details: Record<string, Detail> = {
  scheduler: {
    id: 'scheduler',
    tag: 'CONTROL PLANE',
    title: 'The fleet scheduler',
    description:
      'The control plane places model replicas. A request router then assigns each arriving request to an eligible, healthy replica.',
    metric: '12,500',
    metricLabel: '8-GPU replicas in the reference fleet',
    color: '#b5ce7a',
    facts: [
      { label: 'Routing signals', value: 'Queue · cache · health' },
      { label: 'Isolation', value: 'Tenant + model pools' },
      { label: 'Placement', value: 'Topology-aware' },
    ],
    problem:
      'Random routing can send a long prompt to a full queue while a nearby replica is idle.',
    solution:
      'Combine admission control, queue-aware routing, prefix-cache locality, and per-tenant token budgets.',
    tradeoff:
      'Cache affinity saves work, but too much affinity creates hotspots. Locality needs a load escape hatch.',
  },
  gateway: {
    id: 'gateway',
    tag: 'NORTH–SOUTH TRAFFIC',
    title: 'API gateway',
    description:
      'Many users and applications enter through HTTPS. Authentication, model selection, token limits, and streaming begin here.',
    metric: 'HTTPS → SSE',
    metricLabel: 'a request in; generated tokens streamed out',
    color: '#c9a0ec',
    facts: [
      { label: 'Transport', value: 'HTTP / TLS' },
      { label: 'Protection', value: 'Quotas + admission' },
      { label: 'Cancellation', value: 'Reclaim KV blocks' },
    ],
    problem:
      'A burst of valid requests can exhaust memory and push every user beyond the latency target.',
    solution:
      'Apply bounded queues and token-aware quotas. Reject or defer work before GPUs are overloaded.',
    tradeoff:
      'Backpressure protects admitted requests but creates visible rejections. Fairness needs explicit policy.',
  },
  prefill: {
    id: 'prefill',
    tag: 'COMPUTE-HEAVY PHASE',
    title: 'Prefill workers',
    description:
      'Process the prompt tokens in parallel, layer by layer. Produce the first next-token logits and materialize the prompt’s keys and values.',
    metric: '2,048',
    metricLabel: 'input tokens in the default experiment',
    color: '#b4a0f5',
    facts: [
      { label: 'Dominant work', value: 'Matrix multiplications' },
      { label: 'Primary metric', value: 'Time to first token' },
      { label: 'Output state', value: 'KV cache + logits' },
    ],
    problem:
      'A very long prompt monopolizes a batch and delays already-streaming users.',
    solution:
      'Use chunked prefill, reuse exact cached prefixes, or separate prefill and decode into independently sized pools.',
    tradeoff:
      'Splitting pools adds a large KV transfer. Chunking adds scheduling overhead and tuning complexity.',
  },
  decode: {
    id: 'decode',
    tag: 'MEMORY-SENSITIVE PHASE',
    title: 'Decode workers',
    description:
      'Generate one token per active sequence per iteration. Read prior KV state, update it, sample a token, and repeat until a stop condition.',
    metric: '1 token',
    metricLabel: 'per sequence, per autoregressive step',
    color: '#d6ec9c',
    facts: [
      { label: 'Batch policy', value: 'Continuous admission' },
      { label: 'Primary metric', value: 'Time per output token' },
      { label: 'State', value: 'Sequence-specific KV' },
    ],
    problem:
      'Small batches repeatedly read model weights for very few output tokens, wasting memory bandwidth.',
    solution:
      'Batch active sequences continuously and page their KV cache so completed requests free space immediately.',
    tradeoff:
      'Bigger batches improve aggregate throughput but can increase each user’s inter-token latency.',
  },
  fabric: {
    id: 'fabric',
    tag: 'EAST–WEST TRAFFIC',
    title: 'The scale-out fabric',
    description:
      'A leaf–spine network links servers. It carries cross-node collectives, expert dispatch, KV transfers, and model loading—not just API packets.',
    metric: '400 Gb/s',
    metricLabel: 'illustrative per-endpoint network line rate',
    color: '#76c8c2',
    facts: [
      { label: 'Transport options', value: 'InfiniBand / RoCE' },
      { label: 'Layout', value: 'Leaf–spine / Clos' },
      { label: 'Watch', value: 'Tail latency + incast' },
    ],
    problem:
      'A slow link or congestion hotspot holds up every rank in a synchronous collective.',
    solution:
      'Place tightly coupled ranks together, provision bisection bandwidth, and use RDMA with appropriate congestion control.',
    tradeoff:
      'RDMA reduces host overhead; it does not remove link limits, oversubscription, or synchronization stalls.',
  },
  storage: {
    id: 'storage',
    tag: 'MODEL & DATA PLANE',
    title: 'Model and retrieval storage',
    description:
      'Durable object storage holds checkpoints; local NVMe stages hot weights. An optional vector index supplies retrieved context before generation.',
    metric: '140 GB',
    metricLabel: '70B BF16 weights before runtime overhead',
    color: '#eab58b',
    facts: [
      { label: 'Cold start', value: 'Load → shard → warm' },
      { label: 'RAG', value: 'Embed → search → fetch' },
      { label: 'Hot path', value: 'Keep weights in HBM' },
    ],
    problem:
      'Starting many replicas together can create a storage thundering herd and leave expensive GPUs idle.',
    solution:
      'Stage checkpoints near compute, cache shards locally, stagger warm-up, and keep a warm capacity reserve.',
    tradeoff:
      'Warm replicas cost money even when idle. Retrieval also adds latency and freshness constraints.',
  },
  nvlink: {
    id: 'nvlink',
    tag: 'SCALE-UP INTERCONNECT',
    title: 'NVLink & NVSwitch',
    description:
      'Tensor-parallel ranks exchange partial results between layers. An all-reduce sums values and makes the result available to every rank.',
    metric: '900 GB/s',
    metricLabel: 'H100 SXM aggregate bidirectional NVLink spec',
    color: '#7dd1ce',
    facts: [
      { label: 'Scope', value: 'Inside this 8-GPU node' },
      { label: 'Collectives', value: 'All-reduce / all-gather' },
      { label: 'Not equivalent to', value: 'One-way NIC goodput' },
    ],
    problem:
      'Splitting a model over more GPUs adds synchronization and communication at every layer.',
    solution:
      'Keep tensor parallelism within the fast local fabric where possible; use independent replicas to scale total QPS.',
    tradeoff:
      'More tensor parallelism lowers per-GPU weight memory, but more communication can erase the compute gain.',
  },
  hbm: {
    id: 'hbm',
    tag: 'GPU MEMORY',
    title: 'High-bandwidth memory',
    description:
      'HBM holds weight shards, activations, and KV cache. Decode repeatedly moves data between HBM and the GPU’s on-chip working memory.',
    metric: '80 GB',
    metricLabel: 'HBM capacity per H100 SXM in this model',
    color: '#b4a0f5',
    facts: [
      { label: 'Peak bandwidth', value: '3.35 TB/s (vendor spec)' },
      { label: 'Weight shard', value: '17.5 GB at TP=8' },
      { label: 'Runtime reserve', value: '6 GB assumed / GPU' },
    ],
    problem:
      'Long contexts expand KV state until there is no room for another sequence, even when compute is available.',
    solution:
      'Use paged allocation, smaller KV representations where supported, cache eviction, and context-aware admission.',
    tradeoff:
      'Offloading saves GPU memory but adds transfer latency. Quantization needs accuracy and kernel validation.',
  },
  tensor: {
    id: 'tensor',
    tag: 'GPU EXECUTION',
    title: 'Tensor cores & attention',
    description:
      'Token IDs index learned embedding rows. Transformer layers mix context using attention and transform features with feed-forward matrix operations.',
    metric: '80 layers',
    metricLabel: 'illustrative dense 70B transformer configuration',
    color: '#d6ec9c',
    facts: [
      { label: 'Hidden width', value: '8,192 features' },
      { label: 'Attention', value: 'Grouped-query, 8 KV heads' },
      { label: 'Final output', value: 'Logits → sampling' },
    ],
    problem:
      'Materializing full attention score matrices makes long prompts costly in memory traffic.',
    solution:
      'FlashAttention tiles exact attention to reuse on-chip data and avoid storing the full score matrix in HBM.',
    tradeoff:
      'It improves IO efficiency; it does not make dense full-attention compute independent of context length.',
  },
}

export const layerDefaults: Record<Layer, string> = {
  fleet: 'scheduler',
  pod: 'prefill',
  rack: 'nvlink',
  gpu: 'hbm',
}
export const layerNodes: Record<Layer, string[]> = {
  fleet: ['gateway', 'scheduler', 'fabric', 'prefill', 'decode', 'storage'],
  pod: ['scheduler', 'prefill', 'decode', 'fabric', 'storage'],
  rack: ['nvlink', 'hbm', 'tensor', 'fabric'],
  gpu: ['hbm', 'tensor', 'nvlink'],
}

export const journey = [
  {
    title: 'A request arrives',
    short: 'Ingress',
    color: '#c9a0ec',
    layer: 'fleet' as Layer,
    node: 'gateway',
    time: 'Network + policy',
    payload: 'JSON / UTF-8 text',
    input: '"Explain black holes to a curious ten-year-old."',
    output: 'Authenticated request + model ID + tenant budget',
    text: 'A browser, mobile app, or another service sends a generation request. The edge terminates TLS, checks identity, enforces quotas, and gives the request an ID. Thousands of users can enter concurrently; each retains its own sequence state.',
    detail:
      'User traffic is relatively small. Stream tokens back with server-sent events (SSE); propagate disconnects so abandoned work releases GPU memory.',
    problem: 'Sudden bursts exceed the available token budget.',
    solution:
      'Bound the queue, use tenant-aware admission, and return explicit overload responses instead of silently waiting forever.',
  },
  {
    title: 'Retrieve the right context',
    short: 'Retrieval',
    color: '#eab58b',
    layer: 'fleet' as Layer,
    node: 'storage',
    time: 'Optional RAG stage',
    payload: 'Text → vector → documents',
    input: 'Query text + retrieval filters',
    output: 'Query vector → top-k IDs → source passages',
    text: 'For a retrieval-augmented application, a separate embedding model turns the query into a fixed-size vector. Approximate nearest-neighbor search finds relevant documents; fetched passages are added to the prompt. Ordinary chat can skip this entire stage.',
    detail:
      'A retrieval embedding is a semantic search representation. It is different from the token-embedding lookup inside the generative transformer. Embedding dimensions depend on the chosen retrieval model.',
    problem:
      'Stale or irrelevant retrieval produces a confidently wrong answer.',
    solution:
      'Filter by tenant, track index freshness, rerank candidates, and retain document citations.',
  },
  {
    title: 'Tokenize & route',
    short: 'Routing',
    color: '#b5ce7a',
    layer: 'fleet' as Layer,
    node: 'scheduler',
    time: 'CPU + scheduling',
    payload: 'Text → integer token IDs',
    input: 'Prompt text + retrieved passages',
    output: '[128000, 849, 923, 5360, …] + routing metadata',
    text: 'A model-specific tokenizer converts text into integer IDs. The router chooses a model replica using health, queue length, estimated work, and prefix-cache affinity. A placement scheduler has already assigned the replica’s eight tensor-parallel ranks to GPUs.',
    detail:
      '100,000 GPUs is not one enormous tensor-parallel group. In this reference layout it is 12,500 independent 8-GPU replicas, organized into 20 logical 5,000-GPU pools. Real fleets mix models and workloads.',
    problem:
      'Counting requests ignores the difference between 100-token and 100,000-token prompts.',
    solution:
      'Schedule by estimated token work and KV demand, with fairness and a cache-locality escape hatch.',
  },
  {
    title: 'Prefill the prompt',
    short: 'Prefill',
    color: '#b4a0f5',
    layer: 'rack' as Layer,
    node: 'tensor',
    time: 'Compute-heavy',
    payload: 'IDs → embeddings → Q, K, V',
    input: '[2,048 token IDs] → [2,048 × 8,192] features',
    output: 'Per-layer KV blocks + first-token logits',
    text: 'The token IDs index learned embedding vectors. All prompt positions run through the transformer, respecting the causal attention mask. At every layer, keys and values are saved for future decoding. The last prompt position yields a distribution for the first output token.',
    detail:
      'Tensor parallelism shards matrix operations across eight GPUs. Ranks exchange partial results with collectives. Chunked prefill interleaves long prompts with ongoing decoding; prefix caching can reuse exact, compatible KV blocks.',
    problem:
      'Large prompts interfere with latency-sensitive decode iterations.',
    solution:
      'Chunk prefill or use separate pools. Measure time to first token independently from time per output token.',
  },
  {
    title: 'Move the KV state',
    short: 'KV handoff',
    color: '#76c8c2',
    layer: 'pod' as Layer,
    node: 'fabric',
    time: 'Only when disaggregated',
    payload: 'Sharded K/V tensor blocks',
    input: '2 × 80 layers × 8 KV heads × 128 × 2 bytes / token',
    output: '640 MiB of KV for a 2,048-token prompt',
    text: 'When prefill and decode use different workers, move the prompt’s KV cache to the decode replica. The cache is distributed across tensor-parallel ranks. The receiver needs matching model, layout, precision, and sequence metadata before it can continue.',
    detail:
      '640 MiB is 671 MB in decimal units. At a 400 Gb/s endpoint with assumed 70% useful throughput, the simplified non-overlapped transfer takes about 19.2 ms. Actual contention, rank sharding, and overlap change this.',
    problem: 'Network transfers can cancel the benefits of phase separation.',
    solution:
      'Co-locate compatible workers, pipeline transfers where supported, and size both fabric bandwidth and pool allocation.',
  },
  {
    title: 'Decode, batch, repeat',
    short: 'Decode',
    color: '#d6ec9c',
    layer: 'gpu' as Layer,
    node: 'hbm',
    time: 'Memory-sensitive',
    payload: 'KV + one new token → logits',
    input: 'Previous token + its sequence’s KV cache',
    output: 'One next token per active sequence',
    text: 'Each active sequence advances one token per iteration. Attention reads its previous keys and values, appends new ones, and produces logits. Sampling chooses a token. Continuous batching removes completed sequences and admits new work between iterations.',
    detail:
      'Batching shares weight reads across sequences, improving aggregate throughput. A larger batch can also make each iteration slower. Speculative decoding uses draft tokens plus target-model verification; its benefit depends on acceptance rate and workload.',
    problem:
      'More tokens per second can still mean a slower experience for one user.',
    solution:
      'Optimize within a time-per-output-token SLO, rather than maximizing aggregate throughput alone.',
  },
  {
    title: 'Stream & release',
    short: 'Response',
    color: '#c9a0ec',
    layer: 'fleet' as Layer,
    node: 'gateway',
    time: 'Until EOS or cancellation',
    payload: 'Token IDs → UTF-8 → SSE',
    input: 'Generated token IDs and stop condition',
    output: 'data: {"delta": "A black hole is…"}',
    text: 'The server detokenizes output incrementally and streams text to the caller. On end-of-sequence, a token limit, an error, or a cancellation, it releases request state. Reusable prefixes may stay cached under an explicit retention and isolation policy.',
    detail:
      'Trace the same request ID across gateway, routing, prefill, decode, and transport. Observe queue time, TTFT, inter-token latency, errors, and completed tokens—not only GPU utilization.',
    problem: 'A stuck stream can retain memory and hide a failing replica.',
    solution:
      'Use deadlines, cancellation propagation, health checks, trace correlation, and careful retry policies that avoid duplicating costly work.',
  },
]

export const sources = [
  {
    title: 'Efficient Memory Management for LLM Serving with PagedAttention',
    org: 'Kwon et al. · SOSP 2023',
    url: 'https://arxiv.org/abs/2309.06180',
    note: 'Paged KV allocation, sharing, and serving throughput.',
  },
  {
    title: 'DistServe: Disaggregating Prefill and Decoding',
    org: 'Zhong et al. · OSDI 2024',
    url: 'https://arxiv.org/abs/2401.09670',
    note: 'Independent phase allocation, goodput, and communication-aware placement.',
  },
  {
    title: 'KV cache strategies',
    org: 'Hugging Face · Transformers documentation',
    url: 'https://huggingface.co/docs/transformers/en/kv_cache',
    note: 'Dynamic, static, offloaded, and quantized caches.',
  },
  {
    title: 'Collective operations',
    org: 'NVIDIA · NCCL documentation',
    url: 'https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html',
    note: 'All-reduce, all-gather, reduce-scatter, and all-to-all semantics.',
  },
  {
    title: 'H100 Tensor Core GPU specifications',
    org: 'NVIDIA · Hardware reference',
    url: 'https://www.nvidia.com/en-us/data-center/h100/',
    note: 'H100 SXM: 80 GB HBM, 3.35 TB/s memory bandwidth, up to 900 GB/s aggregate NVLink.',
  },
  {
    title: 'FlashAttention: Fast and Memory-Efficient Exact Attention',
    org: 'Dao et al. · NeurIPS 2022',
    url: 'https://arxiv.org/abs/2205.14135',
    note: 'IO-aware attention tiling and reduced HBM traffic.',
  },
]

export const glossary = [
  [
    'Prefill',
    'Process the prompt in parallel and create the initial KV state. Often compute-heavy; long contexts also stress memory and attention.',
  ],
  [
    'Decode',
    'Autoregressively generate tokens using existing KV state. Often memory-bandwidth-sensitive at small batches.',
  ],
  [
    'KV cache',
    'Per-sequence keys and values retained for every transformer layer. It avoids recomputing prior token state, but grows with context.',
  ],
  [
    'Continuous batching',
    'Rebuild the active batch between iterations so new requests can replace completed ones.',
  ],
  [
    'PagedAttention',
    'Map logical KV blocks to physical memory blocks, reducing fragmentation and enabling controlled sharing.',
  ],
  [
    'Tensor parallelism (TP)',
    'Shard the operations and weights of one layer across GPUs. Requires frequent communication between ranks.',
  ],
  [
    'Pipeline parallelism (PP)',
    'Place different transformer layers on different groups of GPUs. Microbatches fill the pipeline; bubbles reduce utilization.',
  ],
  [
    'Data parallelism (DP)',
    'Replicate the model across workers. During inference, replicas serve independent requests; training also synchronizes gradients.',
  ],
  [
    'Expert parallelism (EP)',
    'Distribute mixture-of-experts feed-forward networks across GPUs. Token dispatch and combination introduce all-to-all traffic.',
  ],
  [
    'RDMA',
    'Remote direct memory access transfers registered buffers with less CPU involvement. Performance still depends on the fabric and congestion.',
  ],
  [
    'TTFT',
    'Time to first token: includes ingress, optional retrieval, queueing, prefill, and any handoff before the first streamed token.',
  ],
  [
    'TPOT / ITL',
    'Time per output token / inter-token latency. Describes stream responsiveness after the first token.',
  ],
  [
    'Goodput',
    'Useful completed work that meets the service-level objective. High throughput alone does not guarantee high goodput.',
  ],
  [
    'Prefix caching',
    'Reuse exact compatible prompt-prefix KV state. Cache keys must include model and relevant execution settings; respect tenant boundaries.',
  ],
  [
    'Quantization',
    'Use lower-precision weights, activations, or KV entries. Saves memory and may speed execution with compatible kernels; validate quality.',
  ],
  [
    'Embedding',
    'A dense vector representation. Retrieval embeddings encode semantic similarity; LLM token embeddings are learned rows indexed by token IDs.',
  ],
  [
    'All-reduce',
    'Combine every rank’s input (for example by summing) and deliver the reduced result to every rank.',
  ],
  [
    'All-to-all',
    'Each rank sends a distinct portion of its data to every other rank. Common in expert-parallel dispatch and combination.',
  ],
]
