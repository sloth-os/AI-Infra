> **Integrated physical context:** open these topics through **Connections** on Fleet, Pod, Server or GPU. Existing links now target that shared hardware world; separate stage/issue platform scenes have been removed. [CONNECTED-INFRASTRUCTURE.md](CONNECTED-INFRASTRUCTURE.md) describes the current UI and animations. The original source records and numerical assumptions below remain applicable.

# Pre-training, post-training and inference

Research reviewed **November 5, 2026**. Open **Learning mode → AI lifecycle**, or use:

- [Pre-training](https://sloth-os.github.io/AI-Infra/?view=guide&learn=fusion&lifecycle=pretrain)
- [Post-training](https://sloth-os.github.io/AI-Infra/?view=guide&learn=fusion&lifecycle=posttrain)
- [Inference](https://sloth-os.github.io/AI-Infra/?view=guide&learn=fusion&lifecycle=inference)

These are three workflows in the existing persistent 3D renderer. Each has six logical operations mapped to the existing physical levels, contextual hardware labels, animated data flows, stage explanations, a sizing lab, network/solution comparisons, primary sources and a full comparison reader. Post-training switches between **SFT**, **DPO** and **GRPO**, with method-specific stages, losses and infrastructure roles. No model is trained or executed and no external API is called.

## What the workflows explain

| Phase        | Six stages                                                                                                            | Distinctive state and scheduling                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-training | Data factory → job placement → forward → backward → synchronization/optimizer → checkpoint                            | Gang-scheduled DP × TP × PP job; weights, activations, gradients and optimizer/master states; durable restart checkpoint                     |
| SFT          | Demonstrations → policy/adapters → teacher forcing → response-token loss → learner step → evaluation/release          | Offline examples and verified masks; no required rollout, reference or reward service                                                        |
| DPO          | Preferences → policy/reference → pair scores → preference objective → learner step → evaluation/release               | Offline chosen/rejected pairs; frozen reference log-probabilities may be precomputed                                                         |
| GRPO         | Prompt queue → learner/rollout pools → sampled completions → rewards/group advantages → policy update → sync/evaluate | Inference inside a training loop; variable-length generation, reward evaluation and versioned weight publication; no required learned critic |
| Inference    | Load/warm → admit/route → prefill → decode → stream/optional KV handoff → retire/reuse                                | Fixed weights, transient request KV and independent model groups; bounded queues and TTFT/TPOT/goodput objectives                            |

Pre-training and post-training both update weights through backward/optimizer steps. Conventional serving changes request state, not weights. Online RL uses inference to generate training data, followed by a separate learner update. Feedback collection is not automatic online weight learning.

Traffic explanations distinguish storage/host transfers, TP layer collectives, PP activations and reverse gradients, DP reductions/sharded-state exchange, optional MoE all-to-all, rollout weight publication, verifier/sample traffic, client streams and prefill/decode KV transfer. State sharding is within data parallelism, not a fourth GPU-count axis.

## Research and evidence

The application exposes claim-level citations on every stage and an Evidence tab with source scopes. `src/lifecycle/catalog.ts` is the citation/content registry. Paper versions and code revisions used for library-dependent claims are pinned.

| Primary source                                                                                                                                                                      | Supports                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| [Transformers causal language modeling](https://github.com/huggingface/transformers/blob/58d05ca5724a434979a9fb26d4ed65dce856b854/docs/source/en/tasks/language_modeling.md)        | Tokenization, packing, shifted next-token targets, autoregressive generation                                                |
| [DeepSpeed ZeRO tutorial](https://www.deepspeed.ai/tutorials/zero/)                                                                                                                 | Stage 1 optimizer, stage 2 gradients, stage 3 parameters                                                                    |
| [Megatron-LM, v5](https://arxiv.org/html/2104.04473v5)                                                                                                                              | Composing tensor/pipeline/data parallelism, topology, microbatches and schedules; no universal use of paper benchmark gains |
| [NCCL collectives](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html)                                                                                | Distinct all-reduce, all-gather, reduce-scatter and all-to-all semantics                                                    |
| [PyTorch FSDP tutorial](https://docs.pytorch.org/tutorials/intermediate/FSDP_tutorial.html)                                                                                         | Parameter all-gather, gradient reduce-scatter, sharded optimizer                                                            |
| [GPipe, v5](https://arxiv.org/html/1811.06965v5)                                                                                                                                    | Microbatch accumulation, pipeline bubbles and recomputation                                                                 |
| [Chinchilla, v1](https://arxiv.org/html/2203.15556v1)                                                                                                                               | Compute/data trade-offs and the approximate dense 6ND FLOP convention                                                       |
| [PyTorch distributed checkpoint recipe](https://docs.pytorch.org/tutorials/recipes/distributed_checkpoint_recipe.html)                                                              | Distributed model/optimizer save and restore                                                                                |
| [TRL SFT](https://github.com/huggingface/trl/blob/bcfb115a5fcc6f367a9a77c65617e747fff8c28d/docs/source/sft_trainer.md)                                                              | Teacher forcing, completion-only/assistant-only masks, compatible template requirements                                     |
| [TRL DPO](https://github.com/huggingface/trl/blob/bcfb115a5fcc6f367a9a77c65617e747fff8c28d/docs/source/dpo_trainer.md)                                                              | Pair/reference log-probabilities, objective, reference precomputation                                                       |
| [TRL GRPO](https://github.com/huggingface/trl/blob/bcfb115a5fcc6f367a9a77c65617e747fff8c28d/docs/source/grpo_trainer.md) and [DeepSeekMath v3](https://arxiv.org/html/2402.03300v3) | Online groups, reward functions/models, normalization choices, optional reference KL, no required learned critic            |
| [InstructGPT, v1](https://arxiv.org/html/2203.02155v1)                                                                                                                              | SFT/preferences/PPO-based RLHF; actor, critic, reference and reward roles are one recipe                                    |
| [LoRA, v2](https://arxiv.org/html/2106.09685v2)                                                                                                                                     | Frozen base and trainable low-rank updates                                                                                  |
| [QLoRA implementation](https://github.com/artidoro/qlora/blob/7f4e95a68dc076bea9b3a413d2b512eca6d004e5/README.md)                                                                   | NF4 frozen base, adapters, double quantization, paged optimizers; the authors’ specific 65B/48 GB result                    |
| [TRL vLLM integration](https://github.com/huggingface/trl/blob/bcfb115a5fcc6f367a9a77c65617e747fff8c28d/docs/source/vllm_integration.md)                                            | Colocated/separate generation servers and policy synchronization                                                            |
| [Transformers KV cache](https://github.com/huggingface/transformers/blob/58d05ca5724a434979a9fb26d4ed65dce856b854/docs/source/en/kv_cache.md)                                       | Growing request state, offload and quantization trade-offs                                                                  |
| [PagedAttention](https://arxiv.org/abs/2309.06180)                                                                                                                                  | Paged allocation/sharing and continuous serving workloads                                                                   |
| [DistServe, v1](https://arxiv.org/html/2401.09670v1)                                                                                                                                | Phase interference, prefill/decode separation, state transfer and SLO-constrained goodput                                   |

The original GRPO paper includes a reference-policy KL term. The pinned TRL revision defaults `beta=0`, so this implementation explicitly treats the KL reference as optional. Its group toy uses population standard deviation plus epsilon; library normalization/loss variants differ. Equal rewards produce zero relative signal in the toy.

Official source text was retrieved directly from public repositories, documentation and full-text papers. PyTorch stable DDP/checkpoint API URLs redirected to unavailable versioned pages during this session; the accessible FSDP/checkpoint recipes and GPipe paper support the retained claims. No access controls were bypassed, weights downloaded or credentials required. Paper benchmark gains are not copied into the calculator as universal multipliers.

## Declared calculations

The lifecycle lab is separate from the original dense 70B serving simulator and the six real-model field trips. It uses two illustrative **dense decoder/GQA** shapes:

| Shape | Parameters P   | Layers L | Hidden H | KV heads | Head dimension | Weight/KV precision |
| ----- | -------------- | -------- | -------- | -------- | -------------- | ------------------- |
| 7B    | 7,000,000,000  | 32       | 4,096    | 8        | 128            | BF16, 2 bytes       |
| 70B   | 70,000,000,000 | 80       | 8,192    | 8        | 128            | BF16, 2 bytes       |

These are teaching shapes, not specifications for every model of that size. The formulas do not describe all MoE, hybrid-cache, diffusion, speech or multimodal models. TP and PP options divide the selected KV heads/layers evenly in the toy.

### Training

The chosen parameter-related mixed-precision Adam layout is **16 bytes/parameter**: BF16 weights 2, BF16 gradients 2, FP32 master weights 4, first moment 4, second moment 4. Actual framework precision/state layouts vary.

With D data-parallel replicas and M = TP × PP model partitions:

| Strategy | Persistent model-state bytes/rank |
| -------- | --------------------------------- |
| DDP      | 16P / M                           |
| ZeRO-1   | (4P + 12P/D) / M                  |
| ZeRO-2   | (2P + 14P/D) / M                  |
| ZeRO-3   | 16P / (D × M)                     |

At default P=70B, DP=8, TP=4, PP=2:

- One job has **64 GPUs**. Persistent model state is **130.39 GiB/rank** for DDP and **16.30 GiB/rank** for ideal ZeRO-3.
- A microbatch of 2 sequences, 8 accumulated microbatches, DP=8, sequence length 2,048 yields **128 sequences / 262,144 tokens per optimizer step**. TP/PP do not multiply examples.
- One `[b,S,H]` BF16 hidden tensor is **64 MiB**. It is not total activation memory. Checkpointing changes representative retained-activation glyphs and explains the compute trade; it does not apply a fabricated memory reduction factor.
- Ideal balanced GPipe bubble fraction is `(PP−1)/(microbatches+PP−1)` = **11.11%**. The schedule includes one forward and one backward per microbatch per stage, with one parameter version and a subsequent update. Communication, stage imbalance, unequal costs and other schedules are excluded.
- `6 × P × global_tokens` gives approximately **110.10 PFLOP/step** under a rough dense training convention; it is not a latency or MFU measurement and does not include every extra operation.
- Int64 global input IDs are **2 MiB/step**. Dataset/host transfer is distinct from activation/gradient traffic.
- A DDP ring all-reduce reference sends `2(D−1)/D × (2P/M)` = **30.625 GB/rank**. One ZeRO-3 full parameter-gather sweep receives `(D−1)/D × (2P/M)` = **15.3125 GB/rank**. These are different algorithmic operations, not two estimates of the same complete training-step traffic.
- Logical full parameter-related training state is **1.12 TB**, versus **140 GB** of BF16 serving weights. Training progress, metadata, activations, workspaces, communication buffers, transient all-gathers, replicated/uneven layers, filesystem overhead and redundancy are additional.

### Post-training

- LoRA targets the **square Q and O** matrices in each layer: adapter parameters = `L × 2 targets × r × (H+H)`. At rank 16 for 70B: **41,943,040** parameters and **640 MiB** of the declared unsharded adapter training state. Frozen base weights and activations are additional; the base does not acquire an Adam state merely because adapters train.
- Full-policy training state, LoRA trainable state and frozen-base storage are shown separately. Reference/reward models, rollout weights/KV, buffers and activation peaks are excluded from these policy-only numbers.
- The SFT toy compares target masks using fixed invented per-token losses. It does not evaluate a model. The DPO toy uses the stable equivalent of `−log sigmoid(beta × (policy_pair_gap − reference_pair_gap))`.
- GRPO defaults to 16 prompts × 4 completions = **64 completions**, each fixed at 256 new tokens for **16,384 new token positions**. Prompt processing, early termination, sampling/verifier overhead and policy evaluation are additional.
- Naive BF16 full-weight publication to four destinations is **560 GB** of logical payload. Compatible adapter-only publication is **320 MiB**. Actual wire volume, synchronization time, merge/reload, overlap and transport topology differ. Offline SFT/DPO do not require a rollout pool; their destination count is presented as an optional evaluation/serving release.

### Inference

- KV bytes/position = `2 × L × KV_heads × head_dim × 2`. For the 70B shape: **327,680 B/token**.
- A 2,048-token prompt has **640 MiB** of KV. Reserving 256 output tokens for 64 sequences yields **45 GiB/group** before paging/prefix sharing. With TP=4, PP=2, an ideal even split is **5.625 GiB KV/rank**, plus **16.30 GiB weights/rank** and uncounted runtime buffers.
- A fleet of 100,000 GPUs partitions into **12,500 independent 8-GPU groups** in the counting exercise. Leftover GPUs are displayed for non-divisible counts. This does not size separate prefill/decode pools, predict throughput, or create a fleet-wide inference collective.
- Colocated prefill/decode has **zero cross-stage KV handoff bytes**. Local memory, TP/PP and client traffic still exist.
- Optional disaggregation transfers the prompt state. At an assumed 400 Gb/s endpoint and 70% efficiency, `640 MiB / (400e9/8 × 0.7)` gives a **19.17 ms wire floor**, not observed end-to-end transfer latency. Contention, state redistribution, serialization and coordination are additional.

Bytes use binary KiB/MiB/GiB/TiB in the interface; network Gb/s and parameter counts are decimal. Every numeric card includes its formula and scope. No overall fit, GPU throughput, quality improvement or universal solution ranking is asserted.

## Motion, controls and accessibility

**1–4** chooses Fleet, Pod, Server or GPU. Arrows select a connected operation; **Space** controls playback; **F** focuses connected hardware; **H** enters/exits cinema. Selecting an operation visits its mapped native level. Manual zooming retains the phase, method and inputs while choosing a compatible operation at the new level. Reader tabs remain available, and World/Details frees the physical scene. Playback uses four teaching seconds per operation while the reference request clock stays frozen.

Training rank colors on the existing server use the same GPipe schedule as the sizing reader. Model-specific state, rollout counts and inference KV retain their declared analytical scopes; visible glyphs aggregate data. Inter-pool inference KV transfer is conditional on the disaggregation option. Checkpoint/release operations are periodic roles, not mandatory work after every optimizer step. Larger calculated jobs can span many physical servers.

Reduced motion disables automatic playback; a physical four-level fallback retains selection, calculations and evidence when WebGL is unavailable. Shared links include the current workspace and level, reopen paused, and retain compatible bounded inputs.

## Implementation and checks

- `src/lifecycle/catalog.ts` and `model.ts` retain the researched operations, sources, calculations, objectives and microbatch schedule.
- `Lifecycle.tsx` retains the phase/method reader, sizing controls, objectives, network comparisons and evidence.
- `src/learning/infrastructure/context.ts` maps operations and semantics to the selected hardware level.
- `src/scene/context.ts` annotates that hardware through the same persistent renderer; the separate platform world has been removed.

Tests verify the original equations and objective/schedule invariants, all phase/method mappings across four levels, live reader and hardware updates, conditional transfer, shared links, stage/scale playback, retained base time, camera/keyboard controls and reduced-motion fallback. [CONNECTED-INFRASTRUCTURE.md](CONNECTED-INFRASTRUCTURE.md) records current interaction and visual boundaries.
