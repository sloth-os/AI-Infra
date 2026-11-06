# Lifecycle Command

Game mode now opens **Lifecycle Command**, a playable Fleet → Pod → Server → GPU campaign. **Pre-training**, **post-training**, and **inference** each have four performance contracts. The 16-sector serving district is available through **Serving district** / the brand’s back control, or `?campaign=serving`; existing `?ui=tactical` links retain that district.

The campaign uses the same physical architecture and instanced annotations as Learning mode. Changing scale, phase or objective never creates a separate stage-island world. A persistent canvas keeps the hardware, picking and camera. Numerical readouts are scoped to the selected operation, not to every GPU drawn in the reference fleet.

Fleet data tiles distinguish useful positions from padding. GPU training tiles represent resident bytes relative to an 80 GiB budget: 32 tiles is one budget, with a 64-tile display cap and full bytes in the label. Purple and green pod markers show rollout and learner allocations; objective bars show computed advantages or the SFT loss mask. Offline SFT/DPO disable the inapplicable rollout-allocation controls.

## Play

1. Choose a phase and inspect a physical level. Each workshop explains the transformation, limiting resource, baseline and available interventions.
2. Spend engineering credits to configure a change. An operation begins with 180 credits. Valid completed work earns 35; invalid objectives and blocked admission earn none. Unlocking a configuration is a one-time cost per run; returning to it is free.
3. Run actual work. The live stage, progress bar, payload, committed-work count and animation share simulation progress. **Ride the work** follows its native physical level. Stage buttons only inspect hardware; they do not complete or skip work.
4. Earn a contract with two completed valid cycles under a qualifying configuration, after visiting that level. A camera visit or option toggle cannot win. All four contracts complete the phase.

Reconfiguration pauses and discards unfinished work, retaining committed work and earned credits. Each phase has its own retained run. Switching phase, opening help/sources, leaving for the serving district or Learning mode pauses work. Reloading starts fresh runs; validated contract medals remain in browser-local storage. There is no remote leaderboard.

One to three medals reflect the completed contract’s component improvement under this model. They are learning achievements, not model-quality scores. Phases are immediately available; there is no artificial campaign lock.

## The twelve contracts

| Phase         | Level  | Work and bottleneck                                                                             | Interventions and counterexamples                                                                                                                                                          |
| ------------- | ------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pre-training  | Fleet  | Dataset → packed token positions → scheduled gang → durable checkpoint                          | Packing increases useful positions at a fixed global batch. Saving every second update reduces average blocking I/O but exposes one unsaved update to the recovery drill.                  |
| Pre-training  | Pod    | Different DP examples → gradients → synchronization                                             | Increase useful fabric bandwidth or overlap ready gradient buckets. Parameter all-gathers can make ZeRO-3 slower even though it saves residency.                                           |
| Pre-training  | Server | TP/PP model partitions, DP state ownership and microbatch schedule                              | ZeRO-2/3 can fix HBM admission. Eight microbatches reduce the GPipe bubble while preserving the same global token positions; sixteen small microbatches incur a kernel-efficiency penalty. |
| Pre-training  | GPU    | Forward activations → loss → backward gradients                                                 | Fused attention changes memory passes. Recomputation reduces activation residency while adding FLOPs; it is not an unconditional speedup.                                                  |
| Post-training | Fleet  | Demonstrations, preference pairs or versioned online samples → admitted work → published policy | Validate data/reference provenance, pack examples and refresh GRPO rollout versions. Stale online samples are rejected; offline SFT/DPO do not inherit an on-policy version constraint.    |
| Post-training | Pod    | Data/reference preparation or rollout/reward workers → learner                                  | Allocate online generation versus learner workers; overlap bounded preparation. More samplers reduce learner capacity and can increase learner residency under sharding.                   |
| Post-training | Server | Frozen base, trainable parameters, optimizer/gradient state and accumulated updates             | Full tuning may exceed HBM. Sharding adds communication; LoRA retains the frozen base and changes the adaptation family. Accumulation preserves sixteen policy sequences per update.       |
| Post-training | GPU    | Assistant-only SFT loss, paired DPO policy/reference scoring, or GRPO advantages → gradients    | Validate the chosen objective. Equal GRPO rewards give zero advantages in this no-KL toy; faster kernels cannot produce an accepted update from an invalid signal.                         |
| Inference     | Fleet  | Independent authenticated request cohorts → compatible model replicas → client streams          | Tenant-aware prefix routing requires a previously completed compatible prefill. Replicas consume GPU quota and share the pod link.                                                         |
| Inference     | Pod    | Prefill builds K/V; decode repeatedly uses it                                                   | Colocation/chunking sends zero inter-pool K/V. Split pools transmit the full declared prompt state, even after a prefix hit; all split replicas share the chosen fabric.                   |
| Inference     | Server | Admit sequences, reserve K/V and refill decode slots                                            | Continuous batching changes actual work rate. Larger batches improve aggregate throughput but increase iteration time and retained memory.                                                 |
| Inference     | GPU    | Read retained K/V, append positions, sample output tokens and release reservations              | Enforce the KV-only allowance. Assumed 8-bit K/V changes bytes, including 1% metadata; tiled attention changes memory time. Precision quality is not simulated.                            |

## Executable paths

**Pre-training:** pack/place → forward → pipeline activations → backward → synchronize → optimizer update → checkpoint when due. The job starts with an actual HBM admission failure. A working strategy is ZeRO-2 plus eight microbatches, packed data and fused attention. Complete work to fund the fabric upgrade. A periodic recovery drill restores the last completed checkpoint and loses unsaved updates and the unfinished cycle.

**SFT:** admitted demonstrations → prepare masked labels → validate the assistant-only objective → policy forward/backward → accumulate/synchronize → publish. This contract intentionally selects assistant-only training; full-token SFT is a different objective, not universally invalid.

**DPO:** admitted chosen/rejected pairs → frozen-reference forward scoring → paired DPO loss → policy forward/backward → accumulate/synchronize → publish. The reference passes are additional work. The displayed softplus example uses fixed illustrative policy/reference gaps; it is not a measured preference score.

**GRPO:** versioned prompts → sixteen sampled completions and rewards → group-normalized advantages → learner forward/backward → synchronize → publish. Rewards `[0, 1, 0.5, 2]` produce computed nonzero advantages; `[1, 1, 1, 1]` produces zeros. An unchecked collector remains at policy version zero and becomes stale after the first accepted update. This toy has no KL term or critic and makes no model-quality prediction.

**Inference:** route → admit/reserve → prefill → optional inter-pool K/V handoff → autoregressive decode/append → stream/release. A work item is a cohort of independent requests, not one HTTP request. Completed requests equal the per-replica batch times replica count. Two fixed tenant-scoped templates model compatible prefix ownership. Disabling retention clears warm state; a cold round-robin cohort cannot fabricate reusable state for a later routing change.

## Numerical scope

Training uses a 70B reference with DP 8 × TP 4 × PP 2 = 64 GPUs. There are always 262,144 global token positions: `DP × sequence × microbatch × accumulation = 8 × 2048 × 16`. The three pipeline choices use microbatch/accumulation 8/2, 2/8 and 1/16. They change activation residency and bubbles, not the update’s token-position count.

Post-training uses 7B and eight GPU workers. SFT uses eight learners; DPO assigns two workers to reference scoring and six to learners. GRPO chooses 2/6, 4/4 or 6/2 rollout/learner workers. The update has sixteen policy sequences: sixteen demonstrations/completions or eight chosen/rejected DPO pairs. Peak activation residency uses the largest local microbatch, ceil(16 / (accumulation × learner workers)); modeled compute assumes ideally shared global work. Frozen LoRA base weights remain resident; gradient communication accounts for trainable parameter count.

Inference uses the 70B GQA shape, TP 8 per replica, prompt 16,384 and response 256. The operation has a 64-GPU quota. Split serving needs both prefill and decode groups. K/V admission has a separately declared **24 GiB per-rank allowance** after other allocations/reserves; it is not the GPU’s full HBM capacity. BF16 cohort K/V at 32 sequences is 20.3125 GiB/rank before retained prefixes; at 64 sequences it exceeds the allowance. The 8-bit assumption multiplies BF16 payload by 0.505, including metadata. It changes capacity and wire bytes, not compute speed by itself.

The existing lifecycle model supplies shape dimensions, mixed-precision Adam bytes, LoRA parameter counts, the DP ring convention, K/V bytes, group advantages, DPO loss and the GPipe schedule. Six saved BF16 tensors per layer plus 2 GiB workspace approximate activation/workspace residency. These are declared model assumptions, not framework allocator peaks.

Timing inputs are deliberately hypothetical: training 250 TFLOP/s × 35% per GPU; learner 200 TFLOP/s × 35%; prefill 350 TFLOP/s × 50%; wire efficiency 70%; checkpoint storage 80 GB/s. Kernel factors, packing fractions and per-iteration serving curves are game coefficients. A game stage takes **0.35 + 0.18 × modeled seconds**. The baseline readout distinguishes modeled component performance from observed committed work per game second. Baselines that do not fit memory are explicitly marked as unconstrained timing estimates.

The simulation does not run a transformer, produce real completions, predict training convergence, measure reward quality, model full queuing/packet routing, or infer production capacity. The original serving district continues to provide per-request arrivals, deadlines, queue policies, outages and construction. The campaign instead isolates lifecycle work and the cross-scale performance consequences of operator decisions.

## Interface and accessibility

Keys 1–4 select level; Space runs/pauses; F follows work; H toggles the workshop. Hardware, stage and camera controls have labeled buttons. An object click opens its workshop. A camera visit does not alter the work stage. The same four-level topology and all decisions remain playable without WebGL. Reduced motion disables ambient effects; essential simulation progress remains pausable. Native help/source dialogs trap focus and support Escape. Controls fit narrow and short screens, including a horizontal camera rail in compact layouts.

## Verification

`tests/campaign.test.ts` checks all twelve contracts, complete strategies, distinct SFT/DPO/GRPO execution, rejected objectives, online version freshness, sharding/communication and microbatch trade-offs, shared transfer conservation, precision admission, pause, replan/economy invariants, durable recovery, retained prefix ownership, validated progress storage and the eight real pod worker allocations.

`tests/campaign.spec.ts` plays each phase through actual UI decisions and completed work, verifies persistent hardware/canvas identity across all twelve contexts, animation progress, earned local medals, mode/phase continuity, primary sources, mobile bounds, reduced motion and fallback gameplay. Existing serving-district tests use `campaign=serving` to keep their original mechanics explicit.
