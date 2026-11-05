export type IssueId =
  | 'power'
  | 'kv-memory'
  | 'disaggregation'
  | 'moe'
  | 'reasoning'
  | 'precision'
  | 'rl'
  | 'placement'
  | 'reliability'
  | 'isolation'
export interface IssueSource {
  title: string
  org: string
  date: string
  url: string
  supports: string
}
export const issuesReviewed = '2026-11-05'
const vllm =
  'https://github.com/vllm-project/vllm/blob/463e23b1dee08a874033763963d077086d376b56/'
export const issueSources: Record<string, IssueSource> = {
  iea: {
    title: 'Energy and AI · energy demand',
    org: 'International Energy Agency',
    date: '2025 report · reviewed 2026-11-05',
    url: 'https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai',
    supports:
      'The IEA estimates all data centres used about 415 TWh in 2024 and projects about 945 TWh in 2030 in its Base Case. These are all-data-centre figures, not AI-only consumption or a measured 2030 outcome.',
  },
  electricity: {
    title: 'Electricity 2026',
    org: 'International Energy Agency',
    date: '2026 report',
    url: 'https://www.iea.org/reports/electricity-2026',
    supports:
      'Current electricity demand, supply, grid and flexibility context. Facility access depends on local power-system conditions.',
  },
  dynamo: {
    title: 'Dynamo datacentre inference architecture',
    org: 'NVIDIA · pinned code snapshot',
    date: 'Snapshot 2026-11-05',
    url: 'https://github.com/ai-dynamo/dynamo/blob/945f7850591b72b2c5c648729e981490205bdb28/README.md',
    supports:
      'Disaggregated serving, KV-aware routing, multi-tier caching and autoscaling are coordinated above inference engines; published example results are not universal speed factors.',
  },
  mooncake: {
    title: 'Mooncake · KV cache infrastructure',
    org: 'Mooncake project · pinned snapshot',
    date: 'Snapshot 2026-11-05; integration updates Sep–Oct 2026',
    url: 'https://github.com/kvcache-ai/Mooncake/blob/552697f3e53aaf2711e2774bdb60e006a4b74fd3/README.md',
    supports:
      'KV storage/transfer and contemporary serving integrations, including multi-tier cache pooling. Offloaded bytes still require storage, bandwidth and ownership management.',
  },
  optimization: {
    title: 'vLLM optimization and tuning',
    org: 'vLLM · pinned documentation',
    date: 'Snapshot 2026-11-05',
    url: `${vllm}docs/configuration/optimization.md`,
    supports:
      'KV capacity, preemption/recomputation, chunked prefill, batching and serving trade-offs. Knobs do not have workload-independent speedups.',
  },
  distserve: {
    title: 'DistServe: prefill/decode disaggregation',
    org: 'Zhong et al., OSDI 2024',
    date: '2024 paper · v1',
    url: 'https://arxiv.org/html/2401.09670v1',
    supports:
      'Phase interference, independent capacity allocation, KV transfer and goodput constrained by TTFT/TPOT targets.',
  },
  deepep: {
    title: 'DeepEP V2 · expert communication and balancing',
    org: 'DeepSeek · pinned code snapshot',
    date: 'Snapshot 2026-10-21',
    url: 'https://github.com/deepseek-ai/DeepEP/blob/f6aa38fe06cd4a0489e7730365d4e0114970a2f3/README.md',
    supports:
      'Unified EPBuffer dispatch/combine, communication/compute overlap, SM use and redundant-expert support. The current V2 API differs from older V1/NVSHMEM recipes.',
  },
  spec: {
    title: 'Speculative decoding',
    org: 'vLLM · pinned documentation',
    date: 'Snapshot 2026-11-05',
    url: `${vllm}docs/features/speculative_decoding/README.md`,
    supports:
      'Drafting and verification methods, acceptance-dependent acceleration, extra work and compatibility limitations. The toy is not a measured serving implementation.',
  },
  fp4: {
    title: 'NVFP4 low-precision training recipe',
    org: 'NVIDIA Transformer Engine · pinned documentation',
    date: 'Snapshot 2026-11-05',
    url: 'https://github.com/NVIDIA/TransformerEngine/blob/eb10c80d9f3b5c06ed8d792af7a0e99947ab9af8/docs/features/low_precision_training/nvfp4/nvfp4.rst',
    supports:
      'E2M1 values, hierarchical scaling, 1D blocks of 16 and optional 2D blocks, stochastic rounding and training stability. The generic lab below does not reproduce NVFP4 storage layouts or its full training peak.',
  },
  verl: {
    title: 'verl distributed post-training',
    org: 'verl project · pinned snapshot',
    date: 'Snapshot 2026-11-05; 2026 agent/rollout/observability updates',
    url: 'https://github.com/verl-project/verl/blob/e41dd697abd7d5a583c0b46b1cedb821ba402db3/README.md',
    supports:
      'Generation/training orchestration, agent and multimodal post-training, observability and evolving recipes. Recipe-specific quality and throughput results are not copied into this model.',
  },
  lora: {
    title: 'LoRA: Low-Rank Adaptation',
    org: 'Hu et al.',
    date: '2021 paper · v2',
    url: 'https://arxiv.org/html/2106.09685v2',
    supports:
      'Frozen base weights plus low-rank trainable updates. Adapter publication assumes a compatible base and runtime; activation and rollout costs remain.',
  },
  kueue: {
    title: 'Topology-aware scheduling',
    org: 'Kubernetes SIG Scheduling · Kueue',
    date: 'Documentation reviewed 2026-11-05',
    url: 'https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/',
    supports:
      'Placement within topology domains, node/rack locality and resource availability. Compaction is a separate operational choice, not an automatic guarantee of Kueue.',
  },
  dra: {
    title: 'Dynamic Resource Allocation',
    org: 'Kubernetes',
    date: 'Documentation reviewed 2026-11-05',
    url: 'https://kubernetes.io/docs/concepts/resource-management/dynamic-resource-allocation/',
    supports:
      'Device/resource claims and scheduling integration; driver and cluster feature support must match the workload.',
  },
  resilience: {
    title: 'NVIDIA Resiliency Extension',
    org: 'NVIDIA · pinned code snapshot',
    date: 'Snapshot 2026-10-30 · experimental project',
    url: 'https://github.com/NVIDIA/nvidia-resiliency-ext/blob/86cf39c70d2fa007201e9de2145a184af2ec28fd/README.md',
    supports:
      'Hang detection, coordinated restarts, asynchronous/local checkpointing and straggler detection. The project explicitly remains experimental.',
  },
  checkpoint: {
    title: 'Distributed checkpoint recipe',
    org: 'PyTorch',
    date: 'Documentation reviewed 2026-11-05',
    url: 'https://docs.pytorch.org/tutorials/recipes/distributed_checkpoint_recipe.html',
    supports:
      'Saving and restoring distributed model/optimizer states. A durable, verified training checkpoint differs from serving weights and transient KV.',
  },
  llama: {
    title: 'The Llama 3 Herd of Models',
    org: 'Meta',
    date: '2024 report · v3',
    url: 'https://arxiv.org/html/2407.21783v3',
    supports:
      'A documented large training deployment with reliability, interruption and recovery experience; its observations are not an industry-wide failure rate.',
  },
  cache: {
    title: 'Prefix caching and cache salting',
    org: 'vLLM · pinned documentation',
    date: 'Snapshot 2026-11-05',
    url: `${vllm}docs/design/prefix_caching.md`,
    supports:
      'Block hashes include parent, exact tokens, LoRA IDs, multimodal input hashes and optional cache salts; salting partitions reuse and addresses cache-timing exposure.',
  },
  security: {
    title: 'Serving security guidance',
    org: 'vLLM · pinned documentation',
    date: 'Snapshot 2026-11-05',
    url: `${vllm}docs/usage/security.md`,
    supports:
      'API authentication alone is insufficient; distributed endpoints, network exposure, model/runtime inputs and isolation require additional controls.',
  },
}
export interface IssueControl {
  key: string
  label: string
  min: number
  max: number
  step: number
  value: number
  unit: string
}
export interface HotIssue {
  id: IssueId
  title: string
  short: string
  category: string
  color: string
  thesis: string
  animation: string
  whyHot: string
  bottleneck: string
  movement: string
  response: string
  tradeoff: string
  measure: string
  openQuestion: string
  experiment: string
  assumptions: string
  solution: string
  sources: string[]
  controls: IssueControl[]
}
const control = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  value: number,
  unit: string,
): IssueControl => ({ key, label, min, max, step, value, unit })
export const hotIssues: HotIssue[] = [
  {
    id: 'power',
    animation:
      'Amber busbars feed aggregated GPU loads; blue blocks represent heat removal. A warmer, taller load bank means the requested fleet exceeds an assumed facility or cooling budget.',
    title: 'Power, grid access and cooling',
    short: 'Power & cooling',
    category: 'PHYSICAL CAPACITY',
    color: '#efbc83',
    thesis:
      'Installed GPUs are not deployable capacity until the facility can power and cool them.',
    whyHot:
      'IEA electricity analysis and the 2026 power outlook make datacentre growth a system constraint. Its 2025 Base Case projects all-data-centre demand of about 945 TWh in 2030, from about 415 TWh in 2024. Local grid connections, peak loads and cooling remain site-specific.',
    bottleneck:
      'Nameplate GPU counts hide upstream electrical limits, power distribution, heat rejection and time to connect a site.',
    movement:
      'Electrical supply → power distribution → GPU IT work → waste heat → cooling loop. Bits cannot bypass the watts and heat required to execute them.',
    response:
      'Plan facility and grid capacity alongside compute procurement. Use measured power envelopes, appropriate cooling, staged deployment and power-aware scheduling. The lab explores an assumed PUE improvement, not a guaranteed benefit from a particular cooling technology.',
    tradeoff:
      'A lower PUE reduces facility overhead, not the GPU IT heat itself. Higher rack density can raise infrastructure and retrofitting requirements; curtailment can trade utilization for available power.',
    measure:
      'Facility MW, GPU/IT MW, cooling capacity, actual PUE, queueing for energization, and useful work per energy unit at a declared workload.',
    openQuestion:
      'Is the capacity plan constrained by silicon, electrical supply, cooling, or the date the site can be energized?',
    experiment: 'GPU-only power floor and an ideal capacity cap',
    assumptions:
      'GPU wattage and facility budgets are assumptions. CPU, NIC, storage and other IT power are excluded, so this is a lower-bound exercise. Cooling is an IT heat-removal budget; PUE is facility/IT power.',
    solution: 'Assume PUE improves by 0.10',
    sources: ['iea', 'electricity'],
    controls: [
      control('gpus', 'Requested GPUs', 1000, 100000, 1000, 100000, 'GPUs'),
      control('watts', 'Assumed GPU power', 500, 1500, 50, 1000, 'W/GPU'),
      control('pue', 'Facility PUE', 110, 160, 1, 120, ''),
      control('supply', 'Available facility power', 20, 200, 5, 100, 'MW'),
      control('cooling', 'Available GPU heat removal', 20, 200, 5, 110, 'MW'),
    ],
  },
  {
    id: 'kv-memory',
    animation:
      'Page glyphs show requested payload relative to the KV-only budget: 32 glyphs represents one budget; the display caps at 64 glyphs. The readout shows full bytes. Assumed 8-bit halves payload at unchanged requested positions.',
    title: 'Long context meets the HBM wall',
    short: 'KV & HBM',
    category: 'MEMORY CAPACITY / BANDWIDTH',
    color: '#8fcfc7',
    thesis:
      'Context, concurrency and retained KV can fill memory before compute is fully utilized.',
    whyHot:
      'Current serving stacks document preemption/recomputation, multi-tier KV storage and cache-aware routing. Mooncake’s September–October 2026 integrations show that memory hierarchy and cache movement remain active infrastructure work.',
    bottleneck:
      'Weights, request KV, temporary workspaces and allocator overhead compete for HBM. Long reasoning and agent histories grow retained state; offloading moves the bottleneck to a slower tier.',
    movement:
      'Prompt tokens → per-layer K/V → paged HBM blocks → optional host/storage tiers → append during decode → release or bounded prefix retention.',
    response:
      'Budget prompt plus reserved output positions, use bounded admission, paging, compatible prefix reuse, and supported KV quantization/offload. Profile bandwidth and preemption rather than counting only model parameters.',
    tradeoff:
      'Quantized KV needs scale metadata, supported kernels and quality checks. Offload adds PCIe/network/storage delay; sharing requires exact compatibility and isolation. More context can reduce admitted concurrency.',
    measure:
      'Peak KV bytes, admitted sequences, preemption/recompute counts, memory bandwidth, TTFT/TPOT percentiles and quality at matched context lengths.',
    openQuestion:
      'Does the service need longer context, more concurrent requests, or lower latency—and which memory tier can sustain that choice?',
    experiment: 'BF16 versus assumed 8-bit KV payload',
    assumptions:
      'Illustrative dense GQA decoder: 80 layers, 8 KV heads, head dimension 128. The budget is KV-only for the whole model group, excluding weights, scales, padding and workspace. Quantization quality and kernel overhead are not predicted.',
    solution: 'Use an assumed 8-bit KV representation',
    sources: ['optimization', 'mooncake', 'dynamo'],
    controls: [
      control(
        'context',
        'Reserved positions per sequence',
        2048,
        32768,
        2048,
        8192,
        'positions',
      ),
      control(
        'concurrency',
        'Requested concurrent sequences',
        8,
        256,
        8,
        64,
        'sequences',
      ),
      control('budget', 'Model-group KV budget', 40, 640, 20, 80, 'GiB'),
    ],
  },
  {
    id: 'disaggregation',
    animation:
      'Signals travel from the blue prefill pool to the green decode pool. Small copies count concurrent handoffs. The wire-time readout changes with shared bytes and endpoint bandwidth.',
    title: 'Disaggregation shifts the bottleneck to the fabric',
    short: 'P/D fabric',
    category: 'NETWORK / SERVING TOPOLOGY',
    color: '#9abde8',
    thesis:
      'Separating prefill and decode can isolate interference, but request state must get to the decode pool.',
    whyHot:
      'Dynamo’s current architecture and Mooncake’s 2026 integrations make routing, cache ownership and inter-pool transfer concrete engineering concerns. DistServe supplies the foundational goodput/SLO framing.',
    bottleneck:
      'A full prompt’s KV is much larger than its API text. Endpoint bandwidth, concurrent handoffs, topology and incompatible parallel layouts can dominate the benefit of split pools.',
    movement:
      'Prefill computes K/V → ownership/metadata handoff → fabric transfer or remote access → decode reads retained state. Client output streaming is a separate, much smaller flow.',
    response:
      'Compare colocated/chunked-prefill baselines with split serving. Co-design TP/PP placement, transfer engine, KV ownership, admission and endpoint bandwidth. The lab compares an assumed endpoint upgrade.',
    tradeoff:
      'Independent scaling and less phase interference add buffers, transfer and coordination. Colocated serving avoids a cross-stage KV handoff but can have compute interference. No architecture always wins.',
    measure:
      'End-to-end goodput under TTFT/TPOT SLOs, both queue tails, handoff bytes, effective endpoint bandwidth and state-redistribution overhead.',
    openQuestion:
      'Does the reduction in phase interference exceed the full state-transfer and coordination cost for this workload?',
    experiment: 'Concurrent full-prompt handoffs on one shared endpoint',
    assumptions:
      'Same dense BF16 GQA shape as the KV exercise. All handoffs share one endpoint equally at an assumed 70% efficiency. Reported time is a wire floor; software, contention elsewhere and redistribution are additional.',
    solution: 'Assume a 2× faster endpoint',
    sources: ['dynamo', 'mooncake', 'distserve'],
    controls: [
      control(
        'context',
        'Prompt positions',
        2048,
        32768,
        2048,
        8192,
        'positions',
      ),
      control('streams', 'Simultaneous handoffs', 1, 16, 1, 4, 'copies'),
      control(
        'bandwidth',
        'Baseline endpoint bandwidth',
        25,
        800,
        25,
        100,
        'Gb/s',
      ),
    ],
  },
  {
    id: 'moe',
    animation:
      'Sixteen tiles represent logical experts. Heights show expected visits to physical workers; the gold replica splits the hot expert’s work without changing the top-2 assignment count. Signals illustrate dispatch and combine.',
    title: 'MoE routing makes all-to-all and imbalance visible',
    short: 'Expert routing',
    category: 'MODEL PARALLELISM / FABRIC',
    color: '#c5a3e6',
    thesis:
      'Sparse activation reduces some model work while introducing dispatch, combine and hot-expert queues.',
    whyHot:
      'DeepEP V2 documents unified expert dispatch/combine, compute overlap, SM consumption and redundant-expert balancing support. Older recipes can target a different API and communication backend.',
    bottleneck:
      'Average assignments per expert can look healthy while one expert or link determines step latency. Communication also consumes GPU resources and interacts with grouped GEMMs.',
    movement:
      'Token hidden states → router-selected expert assignments → all-to-all dispatch → expert GEMMs → combine. DP gradient averaging and TP activation collectives are different traffic.',
    response:
      'Profile expert-load distributions and dispatch/combine tails. Use topology-aware expert placement, overlap and supported redundant-expert routing when it preserves model semantics.',
    tradeoff:
      'Expert replicas require weights/state and synchronization; changing routes arbitrarily can alter the model. Faster communication kernels may still contend for SMs, memory bandwidth and network resources.',
    measure:
      'Peak/mean expert assignments, dispatch/combine critical path, per-rank skew, SM contention and end-to-end tokens/s at unchanged quality.',
    openQuestion:
      'Is the slow step caused by aggregate all-to-all bytes, a hot expert, or communication/compute resource contention?',
    experiment: 'Hotspot assignments and a redundant hot expert',
    assumptions:
      'Illustrative 16-expert, distinct top-2 router; one 8,192-element BF16 hidden vector per assignment. A specified fraction of tokens chooses the hot logical expert once. All remaining assignments are uniform over the other 15 experts. The intervention splits hot-expert assignments across two compatible physical replicas. This is not a full all-to-all wire or latency model.',
    solution: 'Split hot-expert traffic across two replicas',
    sources: ['deepep'],
    controls: [
      control(
        'tokens',
        'Token positions per step',
        256,
        4096,
        256,
        1024,
        'positions',
      ),
      control('skew', 'Tokens choosing the hot expert', 0, 100, 5, 80, '%'),
    ],
  },
  {
    id: 'reasoning',
    animation:
      'Blue proposals pass the gold target verifier. Green/red tint weights show prefix-survival probabilities p, p², p³ and p⁴, plus one guaranteed correction/bonus token. Their sum is expected advance, not a sampled trace. Low acceptance can lose.',
    title: 'Reasoning latency scales with generated work',
    short: 'Reasoning SLOs',
    category: 'INFERENCE-TIME COMPUTE',
    color: '#dec78d',
    thesis:
      'A responsive first token does not make a long reasoning trace cheap or fast to finish.',
    whyHot:
      'Serving systems now explicitly target reasoning workloads and latency-aware scaling. Draft/verify methods and chunked scheduling must be judged against output length, acceptance and tail-latency targets.',
    bottleneck:
      'Autoregressive sequences have serial dependencies. Long outputs retain KV and decoding slots; more tokens increase latency even when TTFT remains good.',
    movement:
      'Prompt prefill → draft token proposals → target verification/correction → accepted output tokens → repeated decode cycles. Other users need admission and fairness while long jobs continue.',
    response:
      'Measure completion latency, TPOT and SLO goodput together. Compare continuous batching, chunked prefill and supported speculative decoding. Use output budgets appropriate to the task and evaluate quality.',
    tradeoff:
      'A draft adds compute and memory. Low acceptance can make the toy slower. Correct verification, sampler compatibility and real batch/kernel behavior matter; a theoretical gain is not a production speedup.',
    measure:
      'TTFT, TPOT, completion latency distribution, accepted draft tokens, draft/verify costs, concurrency, quality and goodput.',
    openQuestion:
      'Are extra generated tokens valuable for the task, and does speculation help at the observed acceptance rate and batch size?',
    experiment: 'An explicit draft-and-verify expectation',
    assumptions:
      'Assume independent conditional acceptance p, a four-token draft, 1ms per draft token and one target verification costing the baseline decode step. Expected advance is Σ p^i for i=0…4, including one correction/bonus token. Extra overhead, prefill changes and quality are outside this toy.',
    solution: 'Apply the four-token draft/verify toy',
    sources: ['spec', 'optimization', 'dynamo'],
    controls: [
      control(
        'output',
        'Generated output positions',
        256,
        8192,
        256,
        4096,
        'tokens',
      ),
      control('step', 'Assumed target decode step', 10, 50, 1, 25, 'ms'),
      control('acceptance', 'Conditional draft acceptance', 0, 100, 5, 70, '%'),
    ],
  },
  {
    id: 'precision',
    animation:
      'Sixteen initial glyphs stand for BF16 bits per value. Four or eight payload glyphs plus gold scale metadata show the candidate representation. The real weight count is in the calculated readout.',
    title: 'FP8/FP4 savings depend on scales, kernels and quality',
    short: 'Precision',
    category: 'NUMERICS / KERNELS',
    color: '#a6d492',
    thesis:
      'Fewer payload bits are a memory opportunity, not a complete peak-VRAM or throughput result.',
    whyHot:
      'Current Transformer Engine documentation includes an NVFP4 recipe with hierarchical scaling, stochastic rounding and stability techniques. Hardware support and the exact recipe are part of the deployment choice.',
    bottleneck:
      'Weights and activations need suitable formats, scaling, accumulation and kernels. Nominal 4-bit values hide metadata, padding, extra representations and dequantization costs.',
    movement:
      'High-precision tensor → block/global statistics → quantized payload + scales → supported GEMM/attention kernels → accumulation and validation.',
    response:
      'Match precision recipes to the hardware/runtime and workload. Measure actual resident memory, kernel speed and held-out quality. Quantize weights and KV as separate decisions.',
    tradeoff:
      'Outliers, calibration, scaling granularity and unsupported kernels can erode savings or quality. Training may retain higher-precision states and additional tensor representations.',
    measure:
      'Payload plus metadata, real peak VRAM, kernel/end-to-end time and task quality at declared precision and hardware.',
    openQuestion:
      'Which tensors and kernels actually use low precision, and is the measured memory/quality trade-off acceptable?',
    experiment: 'Generic block-quantized weight storage',
    assumptions:
      'A declared generic exercise, not NVFP4’s layout: selected bits per value plus one 4-byte scale per chosen block, versus BF16 weights. It excludes zero points, padding, other metadata, activations, optimizer state and runtime workspace. No quality or speed estimate is made.',
    solution: 'Use the selected generic packed format',
    sources: ['fp4', 'optimization'],
    controls: [
      control(
        'parameters',
        'Illustrative parameter count',
        7,
        140,
        7,
        70,
        'billion',
      ),
      control('bits', 'Packed payload precision', 4, 8, 4, 4, 'bits'),
      control(
        'block',
        'Values per assumed FP32 scale',
        16,
        128,
        16,
        32,
        'values',
      ),
    ],
  },
  {
    id: 'rl',
    animation:
      'Blue rollout groups feed a gold reward/verifier block and stacked learner layers. Publication bars shrink with the adapter assumption; rollout generation and optimization still remain.',
    title: 'Online RL is a distributed generation-and-learning system',
    short: 'RL pipelines',
    category: 'POST-TRAINING / ORCHESTRATION',
    color: '#b5a6e8',
    thesis:
      'Fast learner kernels can sit idle behind rollouts, verifiers, sample tails or policy publication.',
    whyHot:
      'verl’s 2026 updates span agent workflows, multimodal post-training, rollout/model alignment and online observability. Infrastructure must coordinate these roles as well as the policy optimizer.',
    bottleneck:
      'Variable-length generation, reward/verifier services and policy versions create different queues. Repeated full-weight synchronization can be much larger than sample-score traffic.',
    movement:
      'Versioned policy → rollout prefill/decode → tokens/old log-probs → verifier/reward → learner update → new weights or compatible adapters → next round.',
    response:
      'Profile generation, evaluation and learner idle time separately. Balance colocated/separate pools, keep sample/old-policy versions aligned, and use runtime-supported efficient publication when appropriate.',
    tradeoff:
      'Asynchrony can introduce stale samples; colocation competes for memory; adapters alter the optimization choice and need a compatible base/runtime. Smaller sync payload does not remove rollout or verifier work.',
    measure:
      'Rollout token count and tails, verifier latency, learner duty cycle, policy-sync critical path, staleness, held-out reward/task success and cost.',
    openQuestion:
      'Which pool limits useful policy updates, and are sample versions and reward definitions consistent?',
    experiment: 'Online samples and logical policy publication',
    assumptions:
      'Count fixed-length completions and BF16 publication to each destination. Full policy is an illustrative 70B parameters. LoRA assumes 80 layers, H=8192, rank 16 and square Q/O targets (41,943,040 adapter parameters), with a compatible base already resident. No RL quality or round-time prediction.',
    solution: 'Publish compatible adapters instead of full weights',
    sources: ['verl', 'lora', 'dynamo'],
    controls: [
      control(
        'prompts',
        'Prompts in a rollout round',
        8,
        128,
        8,
        16,
        'prompts',
      ),
      control('group', 'Completions per prompt', 2, 16, 2, 8, 'samples'),
      control(
        'length',
        'New positions per completion',
        128,
        2048,
        128,
        1024,
        'tokens',
      ),
      control(
        'destinations',
        'Policy publication destinations',
        1,
        16,
        1,
        4,
        'replicas',
      ),
    ],
  },
  {
    id: 'placement',
    animation:
      'Each chassis has eight physical slots; green slots are free and muted slots are busy. Ideal compaction rearranges movable workloads to free complete local groups. The total free-slot count stays fixed.',
    title: 'Free GPUs can still be unusable capacity',
    short: 'Fleet placement',
    category: 'SCHEDULING / TOPOLOGY',
    color: '#90c9dc',
    thesis:
      'A sum of idle devices does not tell you whether a topology-constrained job can start.',
    whyHot:
      'Kueue topology-aware scheduling and Kubernetes device/resource claims expose placement as a first-class concern. Multi-stage inference, training gangs and heterogeneous devices need more than a GPU counter.',
    bottleneck:
      'Free slots can be fragmented across nodes, racks, device types or administrative quotas. A local TP group or gang may not fit even when total free capacity looks sufficient.',
    movement:
      'Resource claims + job topology → queue/admission → compatible locality domain → gang launch → resource release and optional repacking.',
    response:
      'Express device/topology constraints, reserve compatible gangs, and evaluate queueing, backfill and carefully planned compaction. Separate scheduling policy from the cost of moving running work.',
    tradeoff:
      'Compaction may require draining, checkpoint/restart or warmup. Relaxing locality can add communication cost. Heterogeneous devices and reservations can make the simple upper bound unattainable.',
    measure:
      'Feasible gangs, queue age, fragmentation by topology/device class, useful utilization and migration/restart cost.',
    openQuestion:
      'How much idle capacity is actually allocatable to the next job under its locality and device constraints?',
    experiment: 'Eight-slot nodes and local model groups',
    assumptions:
      'Homogeneous eight-GPU nodes; every group must stay within one node. Gang sizes 2/4/8 are chosen divisors. Compaction assumes existing work is movable and produces an ideal upper bound, with no migration cost included.',
    solution: 'Assume ideal compaction of movable work',
    sources: ['kueue', 'dra'],
    controls: [
      control('nodes', 'Eight-GPU nodes', 2, 16, 1, 4, 'nodes'),
      control('free', 'Initially free GPUs per node', 1, 8, 1, 4, 'GPUs'),
      control('gang', 'Required local group size', 2, 8, 2, 8, 'GPUs'),
    ],
  },
  {
    id: 'reliability',
    animation:
      'Blue training ranks, gold checkpoint slabs and a red interrupted rank illustrate save, fault and recovery. The fault cycle is a teaching cue, not a simulation of the selected MTBF.',
    title: 'Goodput is lost to failures, stragglers and recovery',
    short: 'Recovery',
    category: 'DISTRIBUTED TRAINING / STORAGE',
    color: '#e5a2a2',
    thesis:
      'The fastest uninterrupted step is not the same as the most useful training progress over a week.',
    whyHot:
      'Large-model reports document real interruption/recovery experience, while current resiliency tooling targets hang detection, coordinated restart, stragglers and checkpointing. NVIDIA’s cited extension remains explicitly experimental.',
    bottleneck:
      'Synchronous jobs wait for slow ranks and may lose uncheckpointed progress. Saving too often spends time and storage bandwidth; saving too rarely increases rework.',
    movement:
      'Weights/optimizer/RNG/data progress → distributed checkpoint → verified durable manifest → failure detection → coordinated restore → resumed useful steps.',
    response:
      'Test restoration, profile checkpoint/storage costs, monitor stragglers and set a recovery policy. Use measured failure behavior; tune checkpoint intervals and asynchronous/local tiers with durability requirements in mind.',
    tradeoff:
      'Faster local checkpoints have a failure-domain boundary. Asynchronous writes consume resources and must complete safely. Correlated failures, changing topology and partial recovery violate simple independent-failure models.',
    measure:
      'Useful training goodput, checkpoint duty fraction, lost work, restore time, straggler critical path and failure domains.',
    openQuestion:
      'Does the recovery plan restore a complete, compatible training state within the intended failure domain?',
    experiment: 'A first-order periodic-checkpoint model',
    assumptions:
      'T is the interval between checkpoints, C the blocking save cost, R restore cost, and M an assumed whole-job MTBF. Expected waste ≈ C/T + (T/2 + R)/M. Independent uniform failures and small overhead are assumed; no production failure rate is inferred.',
    solution: 'Use the ideal interval √(2 × C × M)',
    sources: ['resilience', 'checkpoint', 'llama'],
    controls: [
      control('interval', 'Baseline checkpoint interval', 5, 60, 5, 5, 'min'),
      control('save', 'Assumed blocking save cost', 10, 120, 10, 30, 's'),
      control('mtbf', 'Assumed whole-job MTBF', 2, 48, 2, 12, 'hours'),
      control('restore', 'Assumed restore cost', 30, 600, 30, 120, 's'),
    ],
  },
  {
    id: 'isolation',
    animation:
      'One shared cache plate covers the unsafe baseline. Candidate mode replaces it with tenant-scoped cache tiles, colored by scope. Tile counts show tenants; readouts show the block-equivalent storage cost.',
    title: 'Shared caches need explicit tenant and version boundaries',
    short: 'Tenant isolation',
    category: 'SECURITY / CACHE CORRECTNESS',
    color: '#d9adca',
    thesis:
      'Cross-request reuse is valuable only when its compatibility and trust boundary are correct.',
    whyHot:
      'Current vLLM documentation explicitly describes cache salts, contextual block hashes and production security beyond an API key. Agent and multimodal serving add model/adapter/media/tool state to the boundary.',
    bottleneck:
      'A prefix cache keyed too broadly can mix incompatible model/adapter/context state or expose cache timing across trust domains. One noisy tenant can also consume shared queues and state.',
    movement:
      'Authenticated tenant + policy version + exact tokens + relevant adapter/media context → scoped cache key → compatible KV reuse → bounded state retention/eviction.',
    response:
      'Enforce authenticated trust-domain/version scope server-side, use appropriate hashes and supported cache partitioning, and isolate distributed endpoints and resource budgets. A client-chosen salt alone is not an authorization boundary.',
    tradeoff:
      'Stricter partitioning can reduce cross-domain reuse and increase resident blocks. Safe within-domain reuse can remain. Salting does not replace authentication, authorization, network controls or isolation.',
    measure:
      'Correctness under model/version/tenant changes, cache reuse within trust domains, timing exposure, resource fairness and audit coverage.',
    openQuestion:
      'Which authenticated identities are allowed to share state, and who enforces that scope?',
    experiment: 'Shared-prefix storage versus per-tenant partitioning',
    assumptions:
      'Every tenant has the same number of blocks and a stated common-prefix fraction. One unsafe global equivalence class is compared with one authenticated scope per tenant. Counts are storage illustrations; no attack is executed and no breach probability or latency is estimated.',
    solution: 'Partition reuse by authenticated tenant',
    sources: ['cache', 'security'],
    controls: [
      control('tenants', 'Independent tenant scopes', 2, 16, 1, 8, 'tenants'),
      control(
        'blocks',
        'Blocks per tenant before sharing',
        8,
        64,
        8,
        16,
        'blocks',
      ),
      control(
        'overlap',
        'Identical common-prefix fraction',
        0,
        100,
        5,
        50,
        '%',
      ),
    ],
  },
]
export function issueById(id: string | null | undefined) {
  return hotIssues.find((i) => i.id === id)
}
export function issueProfile() {
  return {
    id: 'hot-issues',
    kind: 'issues' as const,
    color: '#e7bd93',
    stages: hotIssues.map((i, n) => ({
      short: `${String(n + 1).padStart(2, '0')} · ${i.short}`,
      output: i.thesis,
    })),
  }
}
