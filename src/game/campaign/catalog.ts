import type { Layer } from '../../content'
import type { LifecyclePhase, PostMethod } from '../../lifecycle/catalog'

export const CAMPAIGN_LEVELS: Layer[] = ['fleet', 'pod', 'rack', 'gpu']
export const CAMPAIGN_PHASES: LifecyclePhase[] = [
  'pretrain',
  'posttrain',
  'inference',
]
export const LEVEL_NAMES: Record<Layer, string> = {
  fleet: 'Fleet',
  pod: 'Pod',
  rack: 'Server',
  gpu: 'GPU',
}
export const PHASE_NAMES: Record<LifecyclePhase, string> = {
  pretrain: 'Pre-training',
  posttrain: 'Post-training',
  inference: 'Inference',
}
export interface Decision {
  id: string
  level: Layer
  title: string
  detail: string
  options: { id: string; title: string; cost: number; consequence: string }[]
}
const option = (
  id: string,
  title: string,
  cost: number,
  consequence: string,
) => ({ id, title, cost, consequence })
export const DECISIONS: Record<LifecyclePhase, Decision[]> = {
  pretrain: [
    {
      id: 'packing',
      level: 'fleet',
      title: 'Training data packing',
      detail:
        'Keep global token positions fixed. Packing replaces padding with useful training tokens; it does not change the batch size.',
      options: [
        option(
          'loose',
          'Unpacked shards',
          0,
          '55% useful positions; padding still consumes compute.',
        ),
        option(
          'packed',
          'Pack and prefetch',
          35,
          '94% useful positions; prefetch hides part of data staging.',
        ),
      ],
    },
    {
      id: 'checkpoint',
      level: 'fleet',
      title: 'Durability cadence',
      detail:
        'A restart needs model, optimizer and data progress. Less frequent saves trade blocking I/O for more lost updates on failure.',
      options: [
        option(
          'every',
          'Save every update',
          0,
          'Lowest recovery exposure, more storage traffic.',
        ),
        option(
          'periodic',
          'Save every 2 updates',
          20,
          'Amortize writes; at most one committed update is exposed.',
        ),
      ],
    },
    {
      id: 'network',
      level: 'pod',
      title: 'Collective fabric',
      detail:
        'A DP ring moves 2 × (DP−1) / DP × gradient-shard bytes per rank. This traffic differs from the original dataset.',
      options: [
        option(
          '100',
          '100 Gb/s',
          0,
          'Shared reference fabric, 70% useful line rate.',
        ),
        option(
          '400',
          '400 Gb/s',
          45,
          'More bandwidth; no change to gradient ownership.',
        ),
      ],
    },
    {
      id: 'overlap',
      level: 'pod',
      title: 'Gradient scheduling',
      detail:
        'Gradient buckets can communicate while later backward work runs. Overlap cannot hide more work than is available.',
      options: [
        option(
          'serial',
          'Wait, then synchronize',
          0,
          'Compute and communication times add.',
        ),
        option(
          'overlap',
          'Overlap ready buckets',
          40,
          'Hide at most 60% of compute time behind communication.',
        ),
      ],
    },
    {
      id: 'state',
      level: 'rack',
      title: 'Training state ownership',
      detail:
        'The job uses 64 GPUs: DP 8 × TP 4 × PP 2. The eight visible accelerators are one server in that job.',
      options: [
        option(
          'ddp',
          'Replicate Adam state',
          0,
          '16 bytes per parameter within each model partition; can exceed HBM.',
        ),
        option(
          'zero2',
          'ZeRO-2',
          45,
          'Shard optimizer state and gradients; keep model-partition weights.',
        ),
        option(
          'zero3',
          'ZeRO-3',
          60,
          'Also shard parameters; add parameter all-gathers.',
        ),
      ],
    },
    {
      id: 'microbatches',
      level: 'rack',
      title: 'Pipeline schedule',
      detail:
        'Hold 262,144 global token positions constant: microbatch × accumulation = 16, with DP 8 and sequence 2,048.',
      options: [
        option(
          '2',
          '2 large microbatches',
          0,
          'Larger activations and a 33% GPipe bubble.',
        ),
        option(
          '8',
          '8 microbatches',
          30,
          '11% bubble; balanced kernel occupancy in this game.',
        ),
        option(
          '16',
          '16 small microbatches',
          40,
          '6% bubble, but smaller kernels lose some efficiency.',
        ),
      ],
    },
    {
      id: 'recompute',
      level: 'gpu',
      title: 'Activation residency',
      detail:
        'Checkpointed activations are recomputed during backward. Memory savings have a compute cost.',
      options: [
        option(
          'store',
          'Store activations',
          0,
          'Keep layer activations; no recomputation.',
        ),
        option(
          'recompute',
          'Recompute activations',
          25,
          'Keep one quarter of the activation estimate; add 25% training FLOPs.',
        ),
      ],
    },
    {
      id: 'kernel',
      level: 'gpu',
      title: 'Attention execution',
      detail:
        'Tile and fuse work to reduce HBM passes. The timing factors here are declared gameplay coefficients, not hardware benchmarks.',
      options: [
        option(
          'unfused',
          'Separate HBM passes',
          0,
          'Materialize intermediate buffers.',
        ),
        option(
          'fused',
          'Tiled, fused attention',
          40,
          'Reduce modeled memory passes; improve the compute coefficient by 20%.',
        ),
      ],
    },
  ],
  posttrain: [
    {
      id: 'freshness',
      level: 'fleet',
      title: 'Versioned work admission',
      detail:
        'GRPO samples must belong to the learner policy version. Offline SFT/DPO instead need reproducible data, masks and a fixed reference definition.',
      options: [
        option(
          'unchecked',
          'Unchecked inputs',
          0,
          'Online collectors remain on version zero; later updates reject stale samples.',
        ),
        option(
          'gated',
          'Validate and publish versions',
          30,
          'Gate online samples; record offline data and reference provenance.',
        ),
      ],
    },
    {
      id: 'packing',
      level: 'fleet',
      title: 'Sample supply',
      detail:
        'Improve useful data density without treating more tokens per second as evidence of better model quality.',
      options: [
        option('loose', 'Padded examples', 0, '55% useful input positions.'),
        option(
          'packed',
          'Pack valid examples',
          30,
          '94% useful positions; preserve masks and preference pairs.',
        ),
      ],
    },
    {
      id: 'roles',
      level: 'pod',
      title: 'Rollout / learner allocation',
      detail:
        'Online GRPO shares eight GPU workers. More generation workers leave fewer learners. Offline methods keep their own fixed worker layouts.',
      options: [
        option(
          '2',
          '2 rollout / 6 learner',
          0,
          'Generation often stalls the online pipeline.',
        ),
        option(
          '4',
          '4 rollout / 4 learner',
          30,
          'Balance generation and updates.',
        ),
        option(
          '6',
          '6 rollout / 2 learner',
          40,
          'Faster sampling, slower updates and less state-sharding capacity.',
        ),
      ],
    },
    {
      id: 'overlap',
      level: 'pod',
      title: 'Prepare the next work group',
      detail:
        'Overlap bounded data/reward preparation with learner work. It does not remove scoring or create free samples.',
      options: [
        option(
          'serial',
          'Serial preparation',
          0,
          'Prepare and train in sequence.',
        ),
        option(
          'overlap',
          'Pipeline preparation',
          35,
          'Hide up to 70% of the smaller preparation/learner interval.',
        ),
      ],
    },
    {
      id: 'state',
      level: 'rack',
      title: 'Trainable state',
      detail:
        'The reference model is 7B. Frozen base weights still occupy HBM under LoRA; full Adam state may not fit on a worker.',
      options: [
        option(
          'full',
          'Replicated full tuning',
          0,
          '16 bytes per parameter before activations.',
        ),
        option(
          'sharded',
          'Shard full-tuning state',
          40,
          'ZeRO-2 across learner workers; add synchronization.',
        ),
        option(
          'lora',
          'LoRA rank 16',
          45,
          'Keep BF16 base weights plus adapter training state; this changes the adaptation family.',
        ),
      ],
    },
    {
      id: 'accumulation',
      level: 'rack',
      title: 'Gradient accumulation',
      detail:
        'Keep 16 policy sequences per update. Smaller microbatches reduce peak activation residency and synchronize once per update.',
      options: [
        option('1', 'One large microbatch', 0, 'High activation residency.'),
        option(
          '4',
          'Accumulate 4 microbatches',
          25,
          'Smaller activations; modest scheduling overhead.',
        ),
      ],
    },
    {
      id: 'objective',
      level: 'gpu',
      title: 'Validate the learning signal',
      detail:
        'Our assistant-only SFT contract needs its intended loss mask; DPO needs paired policy/reference log probabilities; GRPO needs nonzero within-group advantages.',
      options: [
        option(
          'invalid',
          'Unvalidated signal',
          0,
          'Work executes, but the update is rejected; a fast invalid objective earns no progress.',
        ),
        option(
          'valid',
          'Validate objective inputs',
          25,
          'Use the method-specific mask, reference or diverse reward group.',
        ),
      ],
    },
    {
      id: 'kernel',
      level: 'gpu',
      title: 'Learner execution',
      detail:
        'Reduce HBM traffic in policy forward/backward work. No speed setting implies improved reward, accuracy or alignment.',
      options: [
        option(
          'unfused',
          'Materialize intermediates',
          0,
          'Reference execution path.',
        ),
        option(
          'fused',
          'Fuse learner kernels',
          35,
          '20% improvement to the declared compute coefficient.',
        ),
      ],
    },
  ],
  inference: [
    {
      id: 'routing',
      level: 'fleet',
      title: 'Tenant-aware prefix routing',
      detail:
        'Each cohort contains two tenant-scoped repeated prefixes. A prefix becomes warm only after successful prefill; other tenants cannot reuse it.',
      options: [
        option('round', 'Round-robin placement', 0, 'Miss reference prefixes.'),
        option(
          'prefix',
          'Route to warm ownership',
          35,
          'After warming, reuse 75% of prompt prefill; retained KV and transfer bytes still exist.',
        ),
      ],
    },
    {
      id: 'replicas',
      level: 'fleet',
      title: 'Replica placement',
      detail:
        'Each model replica uses TP 8. Split serving needs both a prefill and a decode group. This operation has a 64-GPU quota inside the reference fleet.',
      options: [
        option(
          '1',
          '1 serving replica',
          0,
          'One independent stream of cohorts.',
        ),
        option(
          '2',
          '2 serving replicas',
          55,
          'More delivered requests; also more GPU and shared network demand.',
        ),
        option(
          '4',
          '4 serving replicas',
          100,
          'Uses the full quota when split; memory is still checked per rank.',
        ),
      ],
    },
    {
      id: 'serving',
      level: 'pod',
      title: 'Prefill / decode scheduling',
      detail:
        'Colocation keeps KV local. Chunking reduces interference. Disaggregation adds a full-prompt KV transfer; the model does not assume it is always faster.',
      options: [
        option(
          'colocated',
          'Colocated, long prefill',
          0,
          'Local KV; prompt work can interrupt token service.',
        ),
        option(
          'chunked',
          'Chunked prefill',
          35,
          'Reduce modeled head-of-line delay, with 5% prompt compute overhead.',
        ),
        option(
          'split',
          'Disaggregated pools',
          50,
          'Independent phase workers; move KV over the pod fabric.',
        ),
      ],
    },
    {
      id: 'network',
      level: 'pod',
      title: 'Shared state-transfer fabric',
      detail:
        'For split pools, all replicas share the same link. Client text and prompt KV have different sizes and paths.',
      options: [
        option(
          '100',
          '100 Gb/s',
          0,
          '70% useful line rate shared by handoffs.',
        ),
        option(
          '400',
          '400 Gb/s',
          45,
          'More transfer capacity; colocated serving still sends zero inter-pool KV bytes.',
        ),
      ],
    },
    {
      id: 'batching',
      level: 'rack',
      title: 'Decode slot scheduling',
      detail:
        'Independent sequences share model execution. Larger batches improve aggregate work but increase iteration time.',
      options: [
        option(
          'static',
          'Static batch barriers',
          0,
          'Wait between cohorts; lower aggregate utilization.',
        ),
        option(
          'continuous',
          'Continuous batching',
          40,
          'Refill available slots; change the actual decode work rate.',
        ),
      ],
    },
    {
      id: 'batch',
      level: 'rack',
      title: 'Sequences per replica',
      detail:
        'The prompt is 16,384 tokens and each response has 256 tokens. Increasing concurrency retains more K/V on every TP rank.',
      options: [
        option('8', '8 sequences', 0, 'Less KV and shorter token iterations.'),
        option(
          '32',
          '32 sequences',
          25,
          'More aggregate throughput and more state.',
        ),
        option(
          '64',
          '64 sequences',
          40,
          'Can exceed the per-rank KV allowance; fast admission cannot create HBM.',
        ),
      ],
    },
    {
      id: 'precision',
      level: 'gpu',
      title: 'K/V representation',
      detail:
        'A declared 24 GiB KV-only allowance remains after other residency. The 8-bit option assumes half payload plus 1% metadata; quality is outside this toy.',
      options: [
        option('16', 'BF16 K/V', 0, 'Two bytes per K or V element.'),
        option(
          '8',
          'Assumed 8-bit K/V',
          30,
          'Halve payload, retain scale metadata; verify precision quality in a real deployment.',
        ),
      ],
    },
    {
      id: 'kernel',
      level: 'gpu',
      title: 'Attention memory path',
      detail:
        'Decode repeatedly reads retained state. Tiling avoids some materialized intermediate traffic; read bytes still scale with context.',
      options: [
        option(
          'unfused',
          'Separate attention passes',
          0,
          'Reference HBM pass coefficient.',
        ),
        option(
          'fused',
          'Tiled attention',
          35,
          'Reduce the modeled memory-bound interval by 30%.',
        ),
      ],
    },
  ],
}

export const LEVEL_LESSONS: Record<
  LifecyclePhase,
  Record<
    Layer,
    { title: string; process: string; goal: string; sources: string[] }
  >
> = {
  pretrain: {
    fleet: {
      title: 'Keep useful tokens flowing',
      process:
        'Tokenize and pack data, place a complete training gang, and persist model, optimizer and data progress. More allocated GPUs do not fix padding or missing checkpoints.',
      goal: 'Pack data, complete a durable checkpoint and deliver 2 improved updates.',
      sources: ['causal', 'checkpoint', 'compute'],
    },
    pod: {
      title: 'Move gradients with purpose',
      process:
        'DP workers handle different examples; gradients synchronize across replicas. TP and PP exchanges have different ownership. Topology and overlap determine exposed communication.',
      goal: 'Reduce exposed communication by at least 30% and complete 2 updates.',
      sources: ['megatron', 'nccl', 'fsdp'],
    },
    rack: {
      title: 'Fit state and fill the pipeline',
      process:
        'TP splits tensors, PP splits layers, DP splits examples. ZeRO changes state ownership. More microbatches reduce bubbles at a fixed global batch, but small kernels have costs.',
      goal: 'Fit within 80 GiB per GPU, keep the GPipe bubble at or below 12%, and complete 2 updates.',
      sources: ['zero', 'gpipe', 'megatron'],
    },
    gpu: {
      title: 'Trade residency for execution',
      process:
        'Forward saves activations, backward computes gradients, and Adam updates parameters. Fused attention reduces memory passes; recomputation buys HBM by doing more FLOPs.',
      goal: 'Fit HBM, reduce modeled memory passes by at least 20%, and complete 2 updates.',
      sources: ['compute', 'gpipe'],
    },
  },
  posttrain: {
    fleet: {
      title: 'Admit reproducible, versioned work',
      process:
        'SFT uses demonstrations; DPO compares chosen/rejected pairs against a frozen reference; GRPO generates samples under a versioned policy. Throughput alone cannot validate an objective.',
      goal: 'Validate provenance, pack samples and complete 2 valid policy updates.',
      sources: ['sft', 'dpo', 'grpo'],
    },
    pod: {
      title: 'Balance sampling and learning',
      process:
        'Online RL coordinates rollout, reward and learner roles. More samplers can starve learners. Offline SFT/DPO have different preparation and reference-scoring paths.',
      goal: 'Reduce the method-specific preparation/learner interval by at least 10% and complete 2 valid updates.',
      sources: ['grpo', 'grpoPaper', 'rollout'],
    },
    rack: {
      title: 'Place the trainable state',
      process:
        'Full tuning keeps weights, gradients and optimizer state. LoRA changes only selected trainable matrices while retaining frozen base weights. Accumulation changes peak activations, not the declared update batch.',
      goal: 'Fit 80 GiB per worker with sharded state or LoRA and complete 2 valid updates.',
      sources: ['lora', 'zero', 'rollout'],
    },
    gpu: {
      title: 'Compute a valid learning signal',
      process:
        'Assistant masks define SFT loss positions. DPO needs policy and reference log probabilities. Equal GRPO rewards have zero group-relative advantage; faster kernels cannot repair that signal.',
      goal: 'Validate the selected objective and execute 2 accepted gradient updates.',
      sources: ['sft', 'dpo', 'grpo'],
    },
  },
  inference: {
    fleet: {
      title: 'Route users to compatible capacity',
      process:
        'Authenticate and route independent user requests. Prefix locality helps only after matching tenant state is warm. Replication consumes GPUs and can increase shared fabric traffic.',
      goal: 'Improve modeled delivered request rate by at least 20% and finish 2 cohorts.',
      sources: ['cache', 'paged'],
    },
    pod: {
      title: 'Protect the token stream',
      process:
        'Prefill builds K/V; decode reuses and appends it. Colocation keeps state local, chunking changes interference, and split pools must transport their actual prompt KV.',
      goal: 'Reduce the modeled inter-token service interval by at least 20% and finish 2 cohorts.',
      sources: ['disagg', 'rollout', 'nccl'],
    },
    rack: {
      title: 'Schedule independent sequences',
      process:
        'Continuous batching refills decode slots. Aggregate request throughput and the time between tokens are different metrics. More slots still require retained state on every TP rank.',
      goal: 'Use continuous batching, improve aggregate rate by at least 15%, and finish 2 cohorts.',
      sources: ['paged', 'cache'],
    },
    gpu: {
      title: 'Read, append and retain K/V',
      process:
        'Weights, persistent K/V and temporary workspace compete for HBM. Precision changes bytes; tiled attention changes memory passes. Neither creates unlimited admission capacity.',
      goal: 'Stay within the 24 GiB KV allowance, reduce memory time by at least 20%, and finish 2 cohorts.',
      sources: ['paged', 'cache'],
    },
  },
}
export const METHOD_NOTES: Record<PostMethod, string> = {
  sft: 'Teacher-forced demonstrations → assistant-only loss → backward → optimizer. No rollout generation is required.',
  dpo: 'Eight chosen/rejected pairs → policy and frozen-reference log probabilities → DPO loss → backward. No live reward model is required.',
  grpo: 'Versioned prompts → grouped completions → rewards → normalized advantages → learner update → policy publication.',
}
