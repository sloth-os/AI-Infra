export type LifecyclePhase = 'pretrain' | 'posttrain' | 'inference'
export type PostMethod = 'sft' | 'dpo' | 'grpo'
export interface LifecycleSource {
  title: string
  org: string
  url: string
  supports: string
}
const trl =
  'https://github.com/huggingface/trl/blob/bcfb115a5fcc6f367a9a77c65617e747fff8c28d/docs/source/'
const transformers =
  'https://github.com/huggingface/transformers/blob/58d05ca5724a434979a9fb26d4ed65dce856b854/docs/source/en/'
export const lifecycleReviewed = '2026-11-05'
export const lifecycleSources: Record<string, LifecycleSource> = {
  causal: {
    title: 'Causal language modeling',
    org: 'Hugging Face Transformers',
    url: `${transformers}tasks/language_modeling.md`,
    supports:
      'Tokenization, block packing, shifted next-token training and autoregressive generation.',
  },
  zero: {
    title: 'ZeRO stages 1, 2 and 3',
    org: 'DeepSpeed',
    url: 'https://www.deepspeed.ai/tutorials/zero/',
    supports:
      'Partition optimizer state, then gradients, then parameters within data parallelism.',
  },
  megatron: {
    title: 'Efficient large-scale training with Megatron-LM',
    org: 'Narayanan et al., SC 2021',
    url: 'https://arxiv.org/html/2104.04473v5',
    supports:
      'Composing tensor, pipeline and data parallelism; topology, microbatch, communication and schedule trade-offs. Paper benchmarks are not used as universal speed factors.',
  },
  nccl: {
    title: 'Collective communication semantics',
    org: 'NVIDIA NCCL',
    url: 'https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html',
    supports:
      'All-reduce, all-gather, reduce-scatter and all-to-all describe different data movement and ownership patterns.',
  },
  fsdp: {
    title: 'Getting started with FSDP',
    org: 'PyTorch',
    url: 'https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html',
    supports:
      'Sharded parameters, all-gathers, reduce-scatter and sharded optimizer updates.',
  },
  gpipe: {
    title: 'GPipe: pipeline parallelism',
    org: 'Huang et al., 2019',
    url: 'https://arxiv.org/html/1811.06965v5',
    supports:
      'Microbatch pipeline schedule, gradient accumulation, recomputation and bubble overhead.',
  },
  compute: {
    title: 'Training Compute-Optimal Large Language Models',
    org: 'Hoffmann et al., 2022',
    url: 'https://arxiv.org/html/2203.15556v1',
    supports:
      'Training compute and data trade-offs; the approximate 6ND dense training FLOP convention.',
  },
  checkpoint: {
    title: 'Distributed checkpoint recipe',
    org: 'PyTorch',
    url: 'https://docs.pytorch.org/tutorials/recipes/distributed_checkpoint_recipe.html',
    supports:
      'Save and load distributed model and optimizer states; restart requires a training checkpoint.',
  },
  sft: {
    title: 'SFTTrainer',
    org: 'Hugging Face TRL · pinned revision',
    url: `${trl}sft_trainer.md`,
    supports:
      'Teacher forcing, cross-entropy, completion-only and assistant-only loss masks; templates must expose the assistant mask.',
  },
  dpo: {
    title: 'DPOTrainer',
    org: 'Hugging Face TRL · pinned revision',
    url: `${trl}dpo_trainer.md`,
    supports:
      'Chosen/rejected preferences, policy/reference log probabilities, DPO objective and reference precomputation.',
  },
  grpo: {
    title: 'GRPOTrainer',
    org: 'Hugging Face TRL · pinned revision',
    url: `${trl}grpo_trainer.md`,
    supports:
      'Online sampled completions, group-relative rewards, optional KL and configurable normalization. This revision defaults beta to zero.',
  },
  grpoPaper: {
    title: 'DeepSeekMath: GRPO',
    org: 'Shao et al., 2024',
    url: 'https://arxiv.org/html/2402.03300v3',
    supports:
      'Group-relative policy optimization without a separate learned critic; original formulation includes a reference-policy KL term.',
  },
  rlhf: {
    title: 'Training language models to follow instructions',
    org: 'Ouyang et al., 2022',
    url: 'https://arxiv.org/html/2203.02155v1',
    supports:
      'SFT demonstrations, preference-trained reward model, and online PPO-based RLHF. This is one post-training recipe, not a universal stack.',
  },
  lora: {
    title: 'LoRA: Low-Rank Adaptation',
    org: 'Hu et al., 2021',
    url: 'https://arxiv.org/html/2106.09685v2',
    supports:
      'Frozen pretrained weights with trainable low-rank updates; trainable state reduction does not remove activation/backpropagation costs.',
  },
  qlora: {
    title: 'QLoRA research implementation',
    org: 'Dettmers et al. · pinned revision',
    url: 'https://github.com/artidoro/qlora/blob/7f4e95a68dc076bea9b3a413d2b512eca6d004e5/README.md',
    supports:
      'NF4 frozen base, low-rank adapters, double quantization and paged optimizers. Authors report finetuning a 65B model on one 48 GB GPU for their setup.',
  },
  rollout: {
    title: 'vLLM integration for online training',
    org: 'Hugging Face TRL · pinned revision',
    url: `${trl}vllm_integration.md`,
    supports:
      'Colocated versus separate generation servers, memory sharing and policy weight synchronization.',
  },
  cache: {
    title: 'KV cache strategies',
    org: 'Hugging Face Transformers · pinned revision',
    url: `${transformers}kv_cache.md`,
    supports:
      'Autoregressive KV state, cache growth, quantized/offloaded caches and their trade-offs.',
  },
  paged: {
    title: 'Efficient Memory Management with PagedAttention',
    org: 'Kwon et al., 2023',
    url: 'https://arxiv.org/abs/2309.06180',
    supports:
      'Paged KV allocation, memory sharing and high-throughput LLM serving; paper measurements depend on workload and hardware.',
  },
  disagg: {
    title: 'DistServe: disaggregating prefill and decoding',
    org: 'Zhong et al., 2024',
    url: 'https://arxiv.org/html/2401.09670v1',
    supports:
      'Separate prefill/decode resource pools, KV transfer and serving goodput under TTFT and TPOT constraints.',
  },
}
export interface LifecycleStage {
  short: string
  title: string
  input: string
  output: string
  detail: string
  compute: string
  memory: string
  traffic: string
  problem: string
  solution: string
  performance: string
  sources: string[]
}
export interface LifecyclePhaseInfo {
  id: LifecyclePhase
  title: string
  subtitle: string
  color: string
  purpose: string
  objective: string
  artifact: string
  state: string
  stages: LifecycleStage[]
}
const pretrain: LifecycleStage[] = [
  {
    short: 'Data factory',
    title: 'Turn a corpus into reproducible token batches',
    input: 'Documents → curated shards',
    output: 'input_ids [b, S] · targets shifted by 1',
    detail:
      'CPU workers clean, deduplicate and tokenize data, then shuffle and pack token blocks. GPU input is usually integer token IDs, not a one-hot vocabulary tensor. Each data-parallel worker consumes a different batch. The loss mask and attention mask must respect padding and the chosen document-boundary policy.',
    compute:
      'CPU parsing/tokenization, asynchronous data loading, GPU embedding lookup next.',
    memory:
      'Object storage → host RAM → local SSD cache → pinned staging buffers → GPU input IDs.',
    traffic:
      'Dataset reads and host-to-device copies. At int64, an ID is 8 bytes; this is much smaller than all layer activations or gradients.',
    problem:
      'Accelerators starve while workers fetch remote shards; duplicate or contaminated data wastes expensive training compute.',
    solution:
      'Profile dataloader wait, prefetch/cache shards, version manifests and tokenizers, validate mixture weights and preserve sampler state.',
    performance:
      'More GPUs do not fix an input bottleneck. Sequence packing improves valid-token utilization but must preserve intended loss and attention boundaries.',
    sources: ['causal', 'compute'],
  },
  {
    short: 'Place the job',
    title: 'Place one job across DP × TP × PP GPUs',
    input: 'Model + job topology',
    output: 'Replica groups · layer stages · tensor shards',
    detail:
      'Data parallelism processes distinct examples; tensor parallelism partitions tensor operations inside a layer; pipeline parallelism partitions layers. A scheduler reserves compatible devices together. ZeRO/FSDP shards states within data parallelism and is not another independent axis in the device count.',
    compute:
      'TP ranks cooperate on each layer; PP stages work on different microbatches; DP replicas repeat the model on different data.',
    memory:
      'Replicated DDP states or sharded optimizer/gradient/parameter states. Temporary materialized parameters still need headroom.',
    traffic:
      'TP layer collectives need fast links; PP sends activations forward and gradients backward; DP exchanges gradients or sharded model states.',
    problem:
      'A feasible parameter allocation can still fail on temporary buffers, stragglers or poor topology.',
    solution:
      'Place chatty TP groups on fast local links, balance PP stages, choose state sharding and measure overlap on the actual fabric.',
    performance:
      'Sharding lowers persistent state per rank but adds communication. TP, PP and DP are workload and topology choices, not interchangeable speed multipliers.',
    sources: ['megatron', 'fsdp', 'zero', 'gpipe'],
  },
  {
    short: 'Forward',
    title: 'Predict the next token at every valid training position',
    input: 'Token IDs → embeddings [b, S, H]',
    output: 'Logits → masked next-token cross-entropy',
    detail:
      'Embeddings, causal attention, MLPs and normalization produce a distribution at each position. Teacher forcing supplies the known preceding tokens. Training computes many token positions in parallel, unlike the sequential generation of unknown output tokens at inference.',
    compute:
      'Dense matrix multiplications, attention and loss reduction. MoE adds routing and expert dispatch; the dense sizing exercise does not model MoE.',
    memory:
      'Weights plus saved activations for backward. One [b,S,H] hidden tensor is only one of many live tensors.',
    traffic:
      'HBM reads/writes, TP activation collectives and PP boundary activation sends. FSDP may gather layer parameters before use.',
    problem:
      'Long sequences increase activations and attention cost; a model-state-only estimate misses the peak.',
    solution:
      'Use efficient attention kernels, measure live activations and pack valid positions; do not confuse shorter padding with fewer model parameters.',
    performance:
      'The 6 × parameters × tokens estimate is a rough dense forward/backward compute convention, not a latency predictor. Attention, rematerialization and implementation details change total work.',
    sources: ['causal', 'compute', 'megatron', 'fsdp'],
  },
  {
    short: 'Backward',
    title: 'Propagate gradients and accumulate microbatches',
    input: 'Loss scalar + saved/recomputed activations',
    output: 'Accumulated gradients ∂loss / ∂weights',
    detail:
      'Automatic differentiation walks the graph backward. Accumulation combines several microbatches before one optimizer update, so a microbatch is not a parameter version. Activation checkpointing saves selected boundaries and recomputes intermediate activations during backward.',
    compute:
      'Backward matrix multiplications plus optional forward recomputation. PP stages send activation gradients in the reverse direction.',
    memory:
      'Saved activations compete with gradients and temporary workspaces; checkpointing trades recomputation for less activation storage.',
    traffic:
      'Backward PP sends, TP collectives and DP gradient buckets that can overlap computation. Accumulation/synchronization policy affects how often DP communicates.',
    problem:
      'Pipeline fill/drain bubbles and uneven stages leave GPUs idle; checkpointing may shift the bottleneck to compute.',
    solution:
      'Balance layers and tune microbatch count/size. Compare GPipe flush with 1F1B/interleaved schedules rather than treating one bubble formula as universal.',
    performance:
      'The lab shows a balanced GPipe schedule with equal-cost forward/backward slots. Ideal idle fraction is (PP−1)/(microbatches+PP−1); it excludes communication and imbalance.',
    sources: ['gpipe', 'fsdp'],
  },
  {
    short: 'Synchronize',
    title: 'Reduce gradients, then update weights and Adam state',
    input: 'Local gradients from distinct training examples',
    output: 'Consistent next policy weights · step k + 1',
    detail:
      'Synchronous DDP averages gradients across a data-parallel group. ZeRO/FSDP can instead reduce-scatter gradients to their owners and gather parameters when needed. Adam updates the first/second moments and weights once the effective batch is complete.',
    compute:
      'Gradient reduction, norm/clipping where configured, optimizer kernels and precision handling.',
    memory:
      'The exercise chooses 2-byte weights + 2-byte gradients + 4-byte master weights + 4-byte first moment + 4-byte second moment: 16 bytes per parameter before sharding.',
    traffic:
      'DP all-reduce or reduce-scatter/all-gather; TP activation collectives are a separate operation. MoE expert parallelism uses token-dispatch all-to-all, not gradient averaging.',
    problem:
      'Cross-node collective stalls, bucket tails and one slow rank can hold up the entire synchronous group.',
    solution:
      'Overlap bucket reductions with backward, choose topology-aware groups and profile effective bandwidth. Check parameter-gather peaks when using ZeRO-3.',
    performance:
      'DDP ring reference: 2(D−1)/D × local gradient bytes per rank. A ZeRO-3 parameter gather is a different operation; the lab does not label them as equal wire volume.',
    sources: ['zero', 'fsdp', 'nccl'],
  },
  {
    short: 'Checkpoint',
    title: 'Save a restartable job; export a serving artifact',
    input: 'Updated weights + optimizer + training progress',
    output: 'Resume checkpoint → validated model release',
    detail:
      'A training checkpoint includes model/optimizer state and, for faithful resumption, scheduler, RNG, data/sampler progress and configuration. Distributed checkpointing writes shards without requiring a single rank to gather everything. Exported inference weights do not need optimizer moments or gradients.',
    compute:
      'State serialization, storage I/O, held-out validation and conversion for serving.',
    memory:
      'Staging a checkpoint can add RAM/GPU pressure. A resume checkpoint and an inference artifact have different contents.',
    traffic:
      'Large persistent writes to durable storage; release distribution to post-training or serving workers. KV caches are transient request state and are not optimizer state.',
    problem:
      'A failed rank can waste uncheckpointed work; a partially written checkpoint must not become the latest valid release.',
    solution:
      'Use atomic/versioned manifests, verified restore, a measured checkpoint interval and bounded asynchronous I/O.',
    performance:
      'The chosen logical Adam layout has 16P bytes of parameter-related training state versus 2P bytes of BF16 serving weights, before metadata, redundancy or compression.',
    sources: ['checkpoint', 'zero'],
  },
]
const sft: LifecycleStage[] = [
  {
    short: 'Demonstrations',
    title: 'Prepare examples of the behavior you want',
    input: 'Prompt + expert response / conversation',
    output: 'Tokenized examples + response loss mask',
    detail:
      'SFT learns from demonstrations: instruction following, tool formatting, domain tasks or multimodal responses. Use the correct chat template and tokenizer. Completion-only and assistant-only training masks require different data/template support; verify the actual selected token positions.',
    compute:
      'CPU filtering, template application, tokenization and optional packing.',
    memory: 'Versioned dataset shards and cached token IDs/masks.',
    traffic:
      'Storage reads and host-to-device batches; no mandatory online generation service.',
    problem:
      'Training on the wrong role or a broken template teaches the wrong behavior.',
    solution:
      'Inspect rendered examples and masks, preserve evaluation splits and check for leakage.',
    performance:
      'Packing can improve token utilization. More demonstrations do not guarantee better generalization if data quality or mixture is poor.',
    sources: ['sft', 'rlhf'],
  },
  {
    short: 'Initialize',
    title: 'Choose full-weight updates or low-rank adapters',
    input: 'Base checkpoint + tokenizer + template',
    output: 'Trainable policy / frozen base + adapters',
    detail:
      'Full fine-tuning updates the policy weights. LoRA freezes the pretrained weights and trains low-rank matrices ΔW = B·A on selected projections. The experiment targets square Q and O projections in every layer; real target names and shapes depend on the architecture.',
    compute:
      'Base forward/backward path plus adapter operations. Frozen weights still take part in propagating gradients to earlier adapters.',
    memory:
      'Frozen base weights, trainable adapter/optimizer state and activations. QLoRA additionally quantizes the frozen base.',
    traffic:
      'Initial checkpoint load and ordinary training collectives; no required frozen reference or reward model for SFT.',
    problem:
      'A small trainable parameter count can still produce a large activation peak.',
    solution:
      'Budget base weights and activations separately; consider state sharding, activation checkpointing or a supported quantized-base recipe.',
    performance:
      'LoRA reduces trainable/optimizer state and update payload. It is not an automatic proportional speedup. QLoRA authors report 65B on one 48 GB GPU in their specific experiment.',
    sources: ['lora', 'qlora', 'sft'],
  },
  {
    short: 'Teacher force',
    title: 'Use known target responses during the forward pass',
    input: 'Prompt tokens + known response tokens',
    output: 'Policy logits at selected response positions',
    detail:
      'One forward pass evaluates the known sequence with causal masking. At position t the model sees preceding ground-truth tokens, not a generated replacement. Unlike online RL, the training batch does not wait for the policy to invent G completions.',
    compute: 'Embedding, transformer forward, logits and log-softmax.',
    memory:
      'Training activations and policy weights; an inference-only KV serving cache is not a substitute for the autograd graph.',
    traffic:
      'TP/PP activation exchange and data-parallel training communication.',
    problem:
      'Long prompt context consumes compute and activations even if prompt tokens have zero loss.',
    solution:
      'Measure useful response tokens, control sequence lengths and validate attention/loss masks independently.',
    performance:
      'Masking prompt loss does not make prompt processing free. Sequence length and kernel choices remain important.',
    sources: ['sft', 'causal'],
  },
  {
    short: 'Response loss',
    title: 'Minimize cross-entropy on the intended target tokens',
    input: 'Shifted target IDs + valid-token mask',
    output: 'Loss = − mean log π(target | prefix)',
    detail:
      'Compute next-token cross-entropy at the chosen response positions and ignore padding/non-target positions. Loss reduction must account for valid-token counts, especially with variable-length sequences and accumulation. The lab toy highlights selected tokens rather than running a language model.',
    compute: 'Masked token loss and differentiable reduction.',
    memory: 'Logits or fused loss workspace; mask and targets.',
    traffic:
      'Scalar/normalization coordination where required; gradient traffic happens during learner update.',
    problem:
      'A falling training loss can coexist with worse held-out behavior or memorized examples.',
    solution:
      'Track held-out task quality and template correctness; evaluate safety and domain requirements relevant to the deployment.',
    performance:
      'Training tokens per second measures efficiency; it does not measure task quality. Compare loss only under matching tokenization/masks.',
    sources: ['sft'],
  },
  {
    short: 'Learner step',
    title: 'Backpropagate through the policy and apply an update',
    input: 'Masked loss + activations',
    output: 'Policy / adapter version k + 1',
    detail:
      'Backpropagate and accumulate gradients, synchronize trainable state, then apply an optimizer step. Full tuning updates all selected policy weights; LoRA updates only adapter parameters. A reference policy or reward function is not trained by this SFT step.',
    compute:
      'Backward, optional activation recomputation, gradient reductions and optimizer kernels.',
    memory: 'Trainable gradients/optimizer state plus base and activations.',
    traffic:
      'DP reductions or sharded-state operations; model-parallel activation traffic still remains with adapters.',
    problem:
      'Optimizer and activation peaks can be mistaken for one fixed bytes-per-parameter number.',
    solution:
      'Profile full and adapter paths separately; do not add optimizer states to frozen base weights.',
    performance:
      'The memory calculator separates adapter trainable state from frozen base storage and shows the declared 16-byte layout.',
    sources: ['sft', 'lora', 'fsdp'],
  },
  {
    short: 'Evaluate & ship',
    title: 'Validate a versioned policy and compatible serving bundle',
    input: 'Updated weights/adapters + held-out tasks',
    output: 'Policy release + tokenizer/template + provenance',
    detail:
      'Evaluate held-out behavior and publish an immutable version. An adapter may be merged or loaded with its exact compatible base. Serving replicas load the release and warm up before receiving traffic; a rollout pool is only needed if the next workflow generates online training samples.',
    compute:
      'Evaluation inference, artifact conversion and optional adapter merge.',
    memory: 'Temporary evaluation replicas and versioned artifact storage.',
    traffic:
      'Weights or compatible adapter deltas sent to evaluation/serving workers.',
    problem:
      'Changing weights without updating cache/version keys can reuse incompatible request state.',
    solution:
      'Version policy, base, adapter, tokenizer and template together; invalidate or partition prefix caches on version changes.',
    performance:
      'Adapter-only publication is smaller if the correct base is already resident. Naive payload size is not actual sync latency or quality improvement.',
    sources: ['lora', 'rollout', 'checkpoint'],
  },
]
const dpo = sft.map((stage) => ({ ...stage, sources: [...stage.sources] }))
dpo[0] = {
  short: 'Preferences',
  title: 'Prepare chosen and rejected responses',
  input: 'Prompt x + chosen y⁺ + rejected y⁻',
  output: 'Offline preference pairs',
  detail:
    'DPO uses pairs of responses to the same prompt. These can come from human preference collection or a documented preference process. The optimization loop consumes a fixed preference dataset; online generation and a separately trained reward model are not required by the DPO objective.',
  compute: 'Template/tokenization and chosen/rejected sequence preparation.',
  memory:
    'Paired dataset and optional precomputed reference log-probabilities.',
  traffic: 'Dataset reads, not an obligatory rollout network round trip.',
  problem:
    'Length bias, inconsistent pair construction or low-quality preferences can distort the objective.',
  solution:
    'Audit pairs, templates and truncation; compare held-out preference and task metrics.',
  performance:
    'Both responses require policy evaluation; it is not the same work as one SFT completion.',
  sources: ['dpo'],
}
dpo[1] = {
  ...sft[1],
  title: 'Load the trainable policy and a fixed reference',
  output: 'Policy πθ + reference πref',
  detail:
    'DPO compares the policy with a reference policy. The reference is frozen, can share a compatible base/adapters in supported implementations, or can be represented by precomputed log-probabilities for a fixed dataset and fixed reference. Full versus LoRA policy updates remain an independent choice.',
  memory:
    'Policy training state plus reference weights or cached reference scores. The trainable-policy calculator excludes this extra reference budget.',
  traffic:
    'Reference checkpoint load or cached-score reads, plus policy training traffic.',
  sources: ['dpo', 'lora'],
}
dpo[2] = {
  ...sft[2],
  short: 'Score both',
  title: 'Score both responses under policy and reference',
  input: 'Chosen/rejected pair + policy/reference',
  output: 'log πθ(y±|x), log πref(y±|x)',
  detail:
    'Teacher-forced forward passes produce sequence log-probabilities for the chosen and rejected responses. Only the policy path needs training gradients. Implementations can concatenate batches and precompute a fixed reference; four logical scores do not imply four separate GPU launches.',
  memory:
    'Policy activations for both sequences; reference no-grad state or cached scores.',
  traffic:
    'Paired token batches and ordinary training communication; no required generated rollout.',
  performance:
    'Long chosen/rejected sequences and reference placement change throughput and memory. Cached reference scores trade repeated compute for storage and a fixed reference.',
  sources: ['dpo'],
}
dpo[3] = {
  short: 'Preference loss',
  title: 'Increase the chosen response’s reference-relative preference',
  input: 'Policy gap − reference gap',
  output: '−log σ(β [(log πθ⁺ − log πθ⁻) − (log πref⁺ − log πref⁻)])',
  detail:
    'The standard sigmoid DPO loss rewards a chosen-versus-rejected log-probability gap relative to the fixed reference. The interactive toy varies these gaps and β; it illustrates a scalar objective, not a complete trainer, judge or learned reward model.',
  compute:
    'Differentiable log-ratio and logistic loss; policy gradients flow through the pair scores.',
  memory:
    'Policy graph and scalar pair scores. Frozen reference scores have no policy-training gradients.',
  traffic:
    'Small score tensors locally; bulk traffic is still model execution and gradient synchronization.',
  problem:
    'A better training-pair objective does not guarantee broad task performance or calibrated preferences.',
  solution:
    'Evaluate held-out preferences and downstream behavior, tune β and inspect length/truncation effects.',
  performance:
    'DPO removes a mandatory online rollout/reward-service loop from this offline optimization path; it does not remove policy forward/backward work.',
  sources: ['dpo'],
}
dpo[4] = {
  ...sft[4],
  input: 'Preference loss + policy activations',
  detail:
    'Backpropagate the DPO loss into the policy or its adapters, accumulate and synchronize gradients, then step the optimizer. Keep the reference fixed for this standard DPO path; reference synchronization variants are separate configurations.',
  sources: ['dpo', 'lora', 'fsdp'],
}
const grpo = sft.map((stage) => ({ ...stage, sources: [...stage.sources] }))
grpo[0] = {
  short: 'Prompt queue',
  title: 'Queue prompts for online exploration',
  input: 'Prompt dataset + reward specification',
  output: 'Prompts grouped for G sampled completions',
  detail:
    'Online RL generates training samples from a policy version. A prompt can have a verifiable target, a rubric, or a reward model/function. GRPO samples a group of completions for each prompt and compares their rewards within the group.',
  compute: 'Prompt sampling/template preparation and reward setup.',
  memory: 'Prompt queue, targets/metadata and policy version identifiers.',
  traffic:
    'Prompt IDs/tokens and sampling configuration sent to rollout workers.',
  problem:
    'An easy-to-exploit reward can improve while useful behavior declines.',
  solution:
    'Version reward code and policy, inspect samples, use held-out tasks and track reward components.',
  performance:
    'Rollout count and completion length determine generation work; more samples are not a guaranteed quality improvement.',
  sources: ['grpo', 'grpoPaper'],
}
grpo[1] = {
  ...sft[1],
  short: 'Policy pools',
  title: 'Separate learner state from rollout serving state',
  output: 'Learner πθ + versioned rollout policy πold',
  detail:
    'A learner needs backward/optimizer state; rollout workers need fast inference weights and KV capacity. They may share GPUs in a colocated setup or use separate generation servers. A KL reference is optional in the selected TRL configuration (beta=0 by default). GRPO does not require a separate learned value critic.',
  memory:
    'Learner states, rollout weights and KV cache; optional frozen reference/reward model. The lab policy-state number excludes these additional pools.',
  traffic:
    'Versioned policy synchronization into rollout workers, prompt dispatch and returned samples/log-probabilities.',
  performance:
    'Colocation saves a dedicated pool but competes for VRAM and time. Separation enables independent scaling and adds policy-sync/network cost.',
  sources: ['grpo', 'grpoPaper', 'rollout'],
}
grpo[2] = {
  short: 'Roll out',
  title: 'Generate G completions per prompt with frozen rollout weights',
  input: 'Prompts + rollout policy version k',
  output: 'Tokens + old log-probs + masks + version',
  detail:
    'Generation performs prefill and autoregressive decode, exactly the sort of inference work used in serving. Here its outputs become training data. Keep the policy version and old log-probabilities aligned with the samples; bounded staleness and clipping matter if learners run multiple updates.',
  compute:
    'Inference-only policy forward passes across variable-length sequences; no optimizer step inside sampling.',
  memory:
    'Rollout weights and request KV; variable completion lengths create an uneven tail.',
  traffic:
    'Prompt/token batches and generated samples to/from generation workers; weight synchronization is a separate flow.',
  problem:
    'Long completions and stragglers idle the learner; stale policy versions can invalidate intended on-policy assumptions.',
  solution:
    'Batch generation, bound lengths, record versions and coordinate synchronization; tune asynchronous designs with an explicit staleness policy.',
  performance:
    'The calculator counts completions and new token positions, not a rollout wall time. Prefill and sampling overhead are additional.',
  sources: ['grpo', 'rollout'],
}
grpo[3] = {
  short: 'Reward & rank',
  title: 'Convert rewards into relative group advantages',
  input: 'G completions for each prompt + reward function/model',
  output: 'Aᵢ ≈ (rᵢ − mean(group)) / (std(group) + ε)',
  detail:
    'The toy uses a verifier that rewards selected completions, then normalizes within each prompt’s group. Equal rewards give zero relative signal. A learned reward model is optional. The original paper uses group-relative advantages without a learned critic; current implementations also offer different normalization and loss variants.',
  compute:
    'Reward evaluation can be CPU code, a sandboxed verifier or an additional model. Group reductions are small compared with generation.',
  memory:
    'Generated samples, scores and per-token masks/log-probabilities; optional reward-model weights.',
  traffic:
    'Completions/metadata to the reward evaluator and scores back to the learner. Tool/verifier latency can become its own bottleneck.',
  problem:
    'Reward hacking, equal-reward groups and slow verification can waste costly rollout work.',
  solution:
    'Inspect reward distributions and group variance, validate verifiers and separate evaluator capacity from learner/rollout capacity.',
  performance:
    'The toy uses population standard deviation + ε. It shows advantages only, not the complete clipped GRPO objective or every library normalization choice.',
  sources: ['grpo', 'grpoPaper'],
}
grpo[4] = {
  ...sft[4],
  short: 'Policy update',
  title: 'Optimize the policy using sampled tokens and advantages',
  input: 'Samples + old log-probs + relative advantages',
  output: 'Updated learner policy version k + 1',
  detail:
    'Re-evaluate sampled tokens under the trainable policy, apply the configured policy-ratio/clipping loss and optional KL term, backpropagate and step. Rollout workers, reward functions and frozen references are not updated by this actor optimizer. PPO-based RLHF commonly adds a learned critic; that is a different recipe.',
  memory:
    'Learner activations/optimizer, sampled sequences and old log-probabilities. Additional reference/reward weights depend on configuration.',
  performance:
    'RL training alternates generation, verification and learner updates. GPU utilization depends on balancing all three, not only learner FLOPs.',
  sources: ['grpo', 'grpoPaper', 'rlhf'],
}
grpo[5] = {
  ...sft[5],
  short: 'Sync & evaluate',
  title: 'Publish the new policy back to rollout workers',
  input: 'Learner weights/adapters k + 1',
  output: 'Rollout policy k + 1 → next prompt round',
  detail:
    'After evaluation/version checks, synchronize the policy into generation workers before the intended next sampling round. An adapter-only update assumes the compatible base is resident and the generation runtime supports that update. Keep request and prefix caches partitioned by policy version.',
  traffic:
    'Bulk weights or adapter updates to rollout pools, plus metadata/version barriers. This is different from the small reward-score traffic.',
  performance:
    'The experiment compares a naive full-weight fan-out with adapter-only payload. Actual collectives, compression, overlap and runtime reload costs determine observed sync time.',
  sources: ['rollout', 'grpo', 'lora'],
}
const inference: LifecycleStage[] = [
  {
    short: 'Load & warm',
    title: 'Load a serving bundle without training optimizer state',
    input: 'Versioned weights + tokenizer/config + optional adapter',
    output: 'Warm model-parallel replica',
    detail:
      'Serving workers load compatible weights, establish TP/PP groups, compile/capture supported kernels and reserve runtime/KV capacity. BF16 inference needs parameter storage but no Adam moments, gradient buffers or training graph. Quantization changes this layout and must be validated on the intended kernels and quality requirements.',
    compute:
      'Artifact conversion/load, initialization and warmup forward passes.',
    memory:
      'Weights + kernel workspace + KV allocator. The 2P weight floor is not peak VRAM.',
    traffic:
      'Object-store/registry downloads, local caching and model-parallel initialization.',
    problem:
      'Cold starts and simultaneous fleet downloads create long readiness tails.',
    solution:
      'Cache and prefetch artifacts, stage rollouts and mark replicas ready only after a warmup/health check.',
    performance:
      'Smaller quantized weights can improve capacity/bandwidth, but dequantization, kernel support and accuracy make speed workload-dependent.',
    sources: ['cache', 'paged'],
  },
  {
    short: 'Admit & route',
    title: 'Route many users into independent model groups',
    input: 'Concurrent API requests + tenant/model/SLO',
    output: 'Admitted request on a compatible replica',
    detail:
      'A gateway authenticates and bounds queues; a router chooses a warm replica using model/version, load and cache locality. A fleet of 100,000 GPUs usually contains many independent model-parallel groups. Independent inference replicas do not synchronize a global training gradient.',
    compute: 'CPU routing, tokenization, admission and per-replica scheduling.',
    memory: 'Request metadata, token buffers and reserved future KV capacity.',
    traffic:
      'Client request payloads and router metadata; TP/PP traffic remains inside the chosen model group.',
    problem:
      'Over-admission causes queueing, KV exhaustion and poor tail latency even with high GPU utilization.',
    solution:
      'Use bounded queues, token/KV budgets, fairness and SLO-aware load balancing. Prewarm capacity before demand arrives.',
    performance:
      'Replica count = floor(fleet GPUs / (TP × PP)) only counts logical groups. It does not predict requests/s or make 100k GPUs one collective.',
    sources: ['paged', 'disagg'],
  },
  {
    short: 'Prefill',
    title: 'Process prompt tokens and create the initial KV cache',
    input: 'Prompt IDs [b, S] + existing compatible prefix state',
    output: 'Per-layer K/V tensors + first next-token distribution',
    detail:
      'Embedding lookup and transformer forward process the known prompt positions with causal attention. The worker stores keys and values for subsequent generation. Chunked prefill can share scheduling time with decode; prefix reuse is valid only for matching model/version, tokens and relevant runtime context.',
    compute:
      'Large prompt matrix operations and attention; often more compute-intensive than a single decode step, with length-dependent attention costs.',
    memory:
      'BF16 KV toy: 2 × layers × KV heads × head dimension × tokens × 2 bytes. This dense GQA example does not describe every hybrid or multimodal model.',
    traffic:
      'Local HBM/TP/PP activation traffic. Disaggregated layouts may hand off KV after prefill.',
    problem:
      'Long prompts block short decode iterations or fill KV before output tokens are generated.',
    solution:
      'Tune chunked prefill, output reservation and, where justified, dedicated prefill capacity.',
    performance:
      'TTFT includes queueing, tokenization, prefill and delivery. The KV formula estimates state, not TTFT.',
    sources: ['cache', 'disagg', 'paged'],
  },
  {
    short: 'Decode',
    title: 'Generate sequential tokens while batching independent requests',
    input: 'Last token + request KV + sampling configuration',
    output: 'One new token / sequence / iteration + appended KV',
    detail:
      'Within a sequence, the next unknown token depends on previous sampled tokens. Across users, a scheduler continuously admits and retires sequences in a batch. KV paging manages changing sequence lengths and enables sharing/copy-on-write where supported; it does not erase the underlying K/V values.',
    compute:
      'One autoregressive forward iteration per active sequence; sampling chooses the next token.',
    memory:
      'Weights stay resident while request KV grows. Decode can be limited by weight/KV bandwidth at small batches, with the bottleneck changing by workload.',
    traffic:
      'HBM weight/KV reads and TP/PP communication at every iteration, plus small token streams to clients.',
    problem:
      'Maximizing batch size may improve throughput but violate per-token latency; long requests can monopolize state.',
    solution:
      'Continuous batching, length-aware admission and measured TTFT/TPOT percentiles; quantify paging/quantization trade-offs.',
    performance:
      'Track output tokens/s together with TPOT and goodput under SLOs. No universal GPU tokens/s is inferred from a parameter count.',
    sources: ['cache', 'paged', 'disagg'],
  },
  {
    short: 'Stream & move',
    title: 'Keep KV local or pay for an explicit prefill→decode handoff',
    input: 'Generated tokens + optional prefill KV transfer',
    output: 'Client stream · decode-owned request state',
    detail:
      'With colocated prefill/decode, KV stays on the same model group and there is no cross-stage network handoff. A disaggregated design separates the pools for independent scaling and interference control, then transfers or exposes the required KV state to decode workers.',
    compute:
      'State transfer/registration and stream serialization; full-prompt KV is far larger than one output token.',
    memory:
      'Sender/receiver buffers, state ownership and in-flight KV. Parallel layouts may require redistribution.',
    traffic:
      'Client tokens travel over the API stream. Optional inter-pool KV transfer uses the fabric and must not be confused with training gradients.',
    problem:
      'A slow fabric or mismatched layout can make disaggregation cost more than it saves.',
    solution:
      'Compare colocated/chunked-prefill baselines with measured disaggregated goodput, topology and state-transfer overhead.',
    performance:
      'The lab reports only a one-endpoint wire lower bound at an assumed 70% efficiency. Contention, software, reshaping and queueing increase time.',
    sources: ['disagg', 'cache'],
  },
  {
    short: 'Retire & reuse',
    title: 'Release request state and measure service-level goodput',
    input: 'EOS / limit / cancellation',
    output: 'Freed KV slots · warm weights · per-request metrics',
    detail:
      'Completion or cancellation frees request-owned KV/slots. Prefix caches can retain supported reusable blocks under eviction and version rules. Standard inference does not update model weights because a user made a request; logging/feedback becomes a separate, curated post-training workflow.',
    compute:
      'Cleanup, metrics aggregation, cache eviction and autoscaling decisions.',
    memory:
      'Request state retires; model weights usually remain warm. Persistent feedback is a separate storage/privacy policy.',
    traffic:
      'Final stream events and telemetry, plus optional logs to an offline data pipeline.',
    problem:
      'An average latency can hide p99 stalls; a high throughput number can include requests that miss the target SLO.',
    solution:
      'Measure queue time, TTFT, TPOT, cancellation and goodput by model/version and workload; scale with warmup delay in mind.',
    performance:
      'Compare solutions under matching prompt/output length, concurrency, precision, hardware, network and quality. The site provides calculations, not measured vendor benchmarks.',
    sources: ['disagg', 'paged', 'cache'],
  },
]
export const lifecyclePhases: LifecyclePhaseInfo[] = [
  {
    id: 'pretrain',
    title: 'Pre-training',
    subtitle: 'Turn data and compute into a base model.',
    color: '#a7cfed',
    purpose: 'Learn broad predictive representations from a large corpus.',
    objective: 'Next-token cross-entropy in this decoder-only text example.',
    artifact:
      'Base weights + tokenizer/config; a larger checkpoint is needed to resume training.',
    state:
      'Weights, gradients, optimizer moments/master weights and activations.',
    stages: pretrain,
  },
  {
    id: 'posttrain',
    title: 'Post-training',
    subtitle: 'Turn a base model into useful behavior.',
    color: '#d3b3ef',
    purpose:
      'Adapt behavior using demonstrations, preferences or online reward.',
    objective:
      'SFT token loss, DPO preference loss, or a configured GRPO policy objective.',
    artifact:
      'Updated policy weights or compatible adapters, with evaluation and provenance.',
    state:
      'Learner training state; reference, rollout, reward and KV pools depend on method.',
    stages: sft,
  },
  {
    id: 'inference',
    title: 'Inference',
    subtitle: 'Turn a model into a responsive service.',
    color: '#c6dea0',
    purpose:
      'Serve concurrent users under quality, latency and cost constraints.',
    objective:
      'No training loss/optimizer in conventional serving; sample outputs with fixed weights.',
    artifact:
      'Outputs and transient request state; weights stay unchanged during a request.',
    state:
      'Weights, workspace and per-request KV; no training gradients or Adam state.',
    stages: inference,
  },
]
export function phaseInfo(id: LifecyclePhase) {
  return lifecyclePhases.find((p) => p.id === id)!
}
export function lifecycleStages(
  phase: LifecyclePhase,
  method: PostMethod = 'sft',
) {
  return phase === 'posttrain'
    ? { sft, dpo, grpo }[method]
    : phaseInfo(phase).stages
}
export const methodNames = {
  sft: 'SFT · demonstrations',
  dpo: 'DPO · offline preferences',
  grpo: 'GRPO · online rollouts',
}
export function lifecycleProfile(view: {
  phase: LifecyclePhase
  method: PostMethod
}) {
  const info = phaseInfo(view.phase)
  return {
    id: `lifecycle:${view.phase}:${view.phase === 'posttrain' ? view.method : ''}`,
    kind: `lifecycle-${view.phase}` as const,
    color: info.color,
    stages: lifecycleStages(view.phase, view.method).map((s) => ({
      short: s.short,
      output: s.output,
    })),
  }
}
export const lifecycleChoices: Record<
  LifecyclePhase,
  { name: string; solves: string; cost: string; measure: string }[]
> = {
  pretrain: [
    {
      name: 'DDP → ZeRO-1/2/3 or FSDP',
      solves: 'Reduces replicated training states to fit larger models.',
      cost: 'Additional gathers/scatters, transient buffers and sensitivity to fabric/overlap.',
      measure:
        'Peak allocated/reserved VRAM, tokens/s and collective critical path under the same batch.',
    },
    {
      name: 'Activation checkpointing',
      solves:
        'Reduces retained activations for long sequences or larger microbatches.',
      cost: 'Recomputes intermediates in backward; no fixed universal memory or speed factor.',
      measure:
        'Peak VRAM and step time with the same valid tokens and precision.',
    },
    {
      name: 'TP + PP + microbatch scheduling',
      solves: 'Partitions a model and fills multiple stages.',
      cost: 'TP communication, PP bubbles and stage imbalance; smaller microbatches may use kernels less efficiently.',
      measure:
        'Useful tokens/GPU/s, MFU with a declared FLOP convention, stage idle time and convergence.',
    },
  ],
  posttrain: [
    {
      name: 'SFT',
      solves:
        'Imitates good demonstrations with a relatively direct teacher-forced training loop.',
      cost: 'Needs correct masks/templates and strong data; does not optimize an explicit pair preference or online reward.',
      measure:
        'Held-out task behavior and response-token throughput under matching sequence lengths.',
    },
    {
      name: 'DPO',
      solves:
        'Fits offline chosen/rejected preferences without mandatory online generation or a reward service.',
      cost: 'Pair policy/reference scoring and preference/length bias; cached reference scores fix the reference.',
      measure:
        'Preference/task quality, pair throughput, policy/reference memory and dataset quality.',
    },
    {
      name: 'GRPO / online RL',
      solves:
        'Uses current-policy samples and relative reward to improve a specified objective.',
      cost: 'Generation, verification, policy-sync and staleness coordination; rewards can be gamed.',
      measure:
        'Held-out verified success, rollout tokens/s, learner idle fraction and sync/verification tail.',
    },
    {
      name: 'Full → LoRA → QLoRA',
      solves:
        'Changes the amount of trainable state and, with QLoRA, frozen-base storage.',
      cost: 'Adapter target/rank choices, quantization/kernel constraints and remaining activation cost.',
      measure:
        'Quality at matched data/compute plus true peak VRAM; trainable count alone is insufficient.',
    },
  ],
  inference: [
    {
      name: 'Continuous batching + paged KV',
      solves:
        'Admits/retires independent requests and reduces KV allocation waste.',
      cost: 'Scheduler complexity and latency/throughput tension; paging does not remove KV bytes.',
      measure:
        'Goodput at TTFT/TPOT SLOs and peak KV occupancy, with matching length distribution.',
    },
    {
      name: 'Colocated → disaggregated prefill/decode',
      solves:
        'Can isolate interference and independently size compute-heavy prefill versus decode.',
      cost: 'KV transfer, buffer/ownership complexity and fabric dependence.',
      measure:
        'End-to-end goodput and tail latency including transfer and both queues.',
    },
    {
      name: 'Weight/KV quantization or offload',
      solves: 'Reduces memory capacity or local bandwidth pressure.',
      cost: 'Quality checks, dequantization, kernel support and possibly PCIe/host transfer latency.',
      measure: 'Task quality, TTFT/TPOT and cost at the same SLO and hardware.',
    },
    {
      name: 'TP/PP scale-up versus more replicas',
      solves: 'Fits a larger model or grows independent service capacity.',
      cost: 'Per-token communication versus duplicated weights; topology and admission limit scaling.',
      measure:
        'Per-replica latency plus fleet goodput and utilization, including warmup/failover.',
    },
  ],
}
