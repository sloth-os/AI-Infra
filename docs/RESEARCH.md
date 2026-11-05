# Research and design notes

Core serving research reviewed November 4, 2026; lifecycle research reviewed November 5, 2026. The application includes **online inference**, source-backed **pre-training**, and **post-training** workflows. Its reference architecture is deliberately homogeneous to make the relationships understandable; production fleets are heterogeneous.

The six real-model field trips have a separate evidence record in [REAL-MODELS.md](REAL-MODELS.md), including pinned model/code revisions for Kimi K3, Qwen-Image-2.1, MiniMax H3, MiniMax Music 3.0, PersonaPlex, and CosyVoice 2. Their model-specific pipelines and sizing exercises do not reuse the dense 70B lab as a universal performance predictor.

The three-phase lifecycle has a separate evidence and calculation record in [LIFECYCLE.md](LIFECYCLE.md), covering DP/TP/PP, ZeRO, forward/backward/optimizer state, checkpointing, SFT/DPO/GRPO, LoRA/QLoRA, rollout services and serving. These sizing exercises state their own assumptions and do not reuse the existing serving simulator as a training-performance predictor.

## Primary sources and their roles

1. **Kwon et al., Efficient Memory Management for Large Language Model Serving with PagedAttention, SOSP 2023.** <https://arxiv.org/abs/2309.06180>
   - Supports explanations of non-contiguous KV block allocation, fragmentation, and sharing.
   - The current vLLM repository’s historical PagedAttention design document was also inspected: <https://github.com/vllm-project/vllm/blob/main/docs/design/paged_attention.md>. It explicitly warns that it does not describe the current kernel implementation. The application explains the conceptual memory-management technique, not an assertion about current vLLM kernel internals.
   - Direct access to the vLLM hosted documentation returned HTTP 403; the official repository document was available. No access controls were bypassed.
2. **Zhong et al., DistServe: Disaggregating Prefill and Decoding for Goodput-optimized Large Language Model Serving, OSDI 2024.** <https://arxiv.org/abs/2401.09670> (full text reviewed at <https://arxiv.org/html/2401.09670v1>)
   - Distinguishes TTFT and TPOT, describes phase interference, independent allocation, and communication-aware placement.
   - Published gains depend on the evaluated workloads, hardware, and SLOs. The lab does not use them as universal multipliers or claim disaggregation always wins.
3. **Hugging Face Transformers, KV cache strategies.** <https://huggingface.co/docs/transformers/en/kv_cache>
   - Supports the explanation of retained autoregressive state and dynamic/static/offloaded/quantized cache trade-offs.
   - The KV formula uses an explicitly declared illustrative grouped-query attention configuration, not a claim that every 70B model has this shape.
4. **NVIDIA NCCL, Collective operations.** <https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html>
   - Grounds all-reduce, all-gather, reduce-scatter, and all-to-all semantics.
   - Tensor, pipeline, data, and expert parallelism are kept distinct. Independent inference replicas do not synchronize gradients.
5. **NVIDIA H100 specifications.** <https://www.nvidia.com/en-us/data-center/h100/>
   - Reference SKU is H100 SXM: 80 GB HBM, 3.35 TB/s HBM bandwidth, up to 900 GB/s aggregate bidirectional NVLink.
   - The 400 Gb/s NIC is a separate illustrative assumption. Interfaces, bits/bytes, directionality, and useful throughput are not interchangeable.
6. **Dao et al., FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness, NeurIPS 2022.** <https://arxiv.org/abs/2205.14135>
   - Explains tiling to reduce HBM traffic without materializing the full attention matrix.
   - Reduced memory IO does not imply that dense full-attention computation becomes independent of sequence length.

## Design decisions

- Begin with an explorable architecture instead of asking the reader to know the acronyms first.
- Use four scales: fleet, logical serving pod, eight-GPU server, and conceptual accelerator layout. Show both the problem and the corresponding solution at each scale.
- Separate north–south API traffic, east–west state/collective traffic, and on-device memory movement.
- Distinguish placement scheduling (where replicas run) from request routing and iteration-level batching (which request runs next).
- Explain retrieval embeddings separately from the generative model’s token embedding lookup.
- Make disaggregated KV handoff explicitly conditional; colocated serving does not transfer its KV cache between workers for every request.
- Use a constant 100,000-GPU **reference topology** in the explorer. The lab independently changes fleet count and workload; the explorer’s estimated traffic/TTFT cards reflect the current lab parameters but do not relabel the 3D reference topology.
- Explicitly show overload instead of inventing finite latency when the modeled queue is unstable.
- Keep source links and model assumptions in the application, alongside the numbers they qualify.
- All prompt tracing is browser-local educational animation, not a real model execution or a purported monitoring connection.

## Current infrastructure issues

The **Hot issues** briefing is an editorial top-ten watchlist reviewed **2026-11-05**, based on primary engineering sources. It extends this foundational reference with current power/grid context, KV infrastructure, P/D transfer, DeepEP V2, speculative decoding, low-precision recipes, online RL, topology-aware placement, recovery and tenant/cache boundaries. Publication dates, pinned snapshot dates and claim scopes are shown separately. It does not assign measured popularity or adopt vendor benchmark numbers as generic speedups. [HOT-ISSUES.md](HOT-ISSUES.md) records selection, all source families, quantitative assumptions and the 3D visual mappings.
