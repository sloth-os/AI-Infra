# How to read the interactive 3D motion

The four animation lenses share a deterministic 48-second **teaching timeline**. It is intentionally slowed down and is not an estimate of a request's wall-clock latency. Pausing freezes the simulation clock; scrubbing recomputes the displayed state directly. The camera remains independently controllable.

## Request serving

Three differently colored tenants enter the API edge. Gateway authentication and admission precede request routing. The highlighted data parcel changes representation as the request moves through retrieval, tokenization/routing, prefill, an optional disaggregated KV handoff, decode, and streaming.

The fleet is the existing 100,000-GPU reference layout: 20 logical pods and 12,500 independent TP=8 replicas. A single traced sequence does not fan out over all 100,000 GPUs. Guided flight changes scale to the relevant pod, server, or accelerator; manual layer selection lets the reader inspect a fixed scale.

The queue tiles illustrate admission pressure. Increasing offered traffic changes the analytical utilization and the illustrative heatmap. Neither the tile count nor the heat colors are measured telemetry.

## KV state

The cache lens has five phases: allocation, prompt writes, transfer, decode append, and release. The timeline computes retained context rather than displaying a fixed memory number:

```
KV bytes/token across the TP group = 2 × 80 × 8 × 128 × 2 = 327,680
2,048-token prompt = 640 MiB across the group = 80 MiB per rank
one appended token = 320 KiB across the group = 40 KiB per rank
```

The physical single-GPU view labels **per-rank** memory; the pod and logical transformer views label the **TP-group** total. K and V fill together in separate banks. Rendered tiles group entries for legibility and do not depict a particular allocator's page size.

The fabric view draws parallel sharded transfers. In this model, a full prompt handoff is approximately 19.2 ms at 400 Gb/s with 70% useful throughput, or 306.8 ms at 25 Gb/s. The visual parcels also slow on a constrained link, but their screen speed is normalized to remain readable. No physical packet rate, congestion, or overlap is simulated. Colocated prefill/decode does not need this handoff.

## Collective exchanges

The eight-GPU server depicts a **logical ring** over a physical local fabric. For the teaching input, GPU `r` begins with eight copies of `r+1`:

1. Seven reduce-scatter exchanges send one chunk per rank clockwise and add the incoming partial sum. Each rank finishes with one completely reduced chunk.
2. Seven all-gather exchanges circulate completed chunks without adding them again. Every rank finishes with `[36, 36, 36, 36, 36, 36, 36, 36]`.

The data parcels share an exchange clock, so all eight sends complete at a state boundary. Their colors identify the chunk being sent. Each GPU's colored tiles and projected label read the same algorithmic contribution counts as `src/collective.ts`; the 3D ring does not use random progress values. Learning Fusion's floating ring playground scrubs this same clock and inspects its exact rank buffers. The classic reading layout also retains an independent algorithm scratchpad below the scene.

Actual NCCL algorithms depend on topology, message size, and implementation. The diagram does not claim that every collective uses a direct physical ring or that fleet-wide inference replicas all synchronize together.

## Transformer tensors

The logical tensor view illustrates one block and its output path for the declared dense 70B family of model assumptions. Dimensions describe the whole tensor-parallel group:

| Stage             | Representation or operation                                                             |
| ----------------- | --------------------------------------------------------------------------------------- |
| Embedding         | `[S]` token IDs index learned rows, producing `[S, 8192]` hidden features               |
| Q/K/V projection  | Queries `[S, 64, 128]`; keys and values `[S, 8, 128]` for grouped-query attention       |
| Position/cache    | Rotary position transforms on Q/K; retain K/V in sequence-specific banks                |
| Causal attention  | `softmax(QKᵀ/√128 + mask)V`; upper-triangular future positions remain masked            |
| TP combination    | Combine local partials over the fast local fabric                                       |
| Gated MLP         | Norm, gated feature expansion, projection and residual; repeat blocks through 80 layers |
| Vocabulary logits | Project the final hidden state into candidate scores                                    |
| Sampling/output   | Select one token, send it to the host output path, and use it as the next decode input  |

The model assumes RoPE and a gated feed-forward structure for this conceptual view. Rendered columns, candidate bars, attention tiles, and vector parcels are schematic, not actual learned values or literal feature counts. Candidate bar heights are illustrative scores, not measured model probabilities. The full block diagram includes logical operations and the host output boundary; it is not a physical die floorplan.

## Motion and accessibility

- Isometric, top-down, and front presets interpolate camera position, target, and zoom. Manual orbit cancels an in-flight camera move.
- Exploding the hardware separates cache banks, compute layers, and interconnect interfaces without changing the tensor-size arithmetic.
- Labels project from 3D world coordinates and avoid obvious overlap. Off-screen/colliding labels leave the tab order; the component picker remains available.
- Moving parcels can be selected through ray casting or the **Inspect data** button. The panel records a representation snapshot at the selected teaching time.
- With reduced motion, autonomous packet motion and orbit stop; layer and camera changes become immediate. Chapter selection and scrubbing remain available.
- Without WebGL, the timeline and component topology retain the explanations and analytical values.

`src/motion.ts` is the pure state model; `src/scene/engine.ts` drives rendering; `src/scene/architecture.ts` and `src/scene/tensors.ts` define the instanced geometry. Algorithms and dimensions have unit tests; browser tests cover the actual controls, persistent canvas, bandwidth changes, pause, guided flight, mobile layout, and reduced motion.
