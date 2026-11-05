> **Integrated physical context:** open these topics through **Connections** on Fleet, Pod, Server or GPU. Existing links now target that shared hardware world; separate stage/issue platform scenes have been removed. [CONNECTED-INFRASTRUCTURE.md](CONNECTED-INFRASTRUCTURE.md) describes the current UI and animations. The original source records and numerical assumptions below remain applicable.

# Six real model workloads on AI infrastructure

Research reviewed November 4, 2026. Choose a workload through **Connections** on Fleet, Pod, Server or GPU. Its six-step operation walkthrough visits the appropriate levels of that same hardware world. The case reader retains sources, documented serving examples, data budgets and the six-workload comparison. Focus approaches connected hardware without replacing it; the same controls and research remain accessible without WebGL.

These are researched infrastructure examples, not executed model demonstrations or a representation of a vendor's private production fleet. The site downloads no model weights, calls no model APIs, opens no microphone, and generates no real images, video, music, or voices. Geometry and packet motion are explanatory. Published mechanisms, recipe configurations, source-reported observations, proposed placements, and calculated data sizes have separate labels.

## Verified model identities

| Requested model          | Verified public identity                                                      | Infrastructure distinction                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kimi K3                  | `moonshotai/Kimi-K3`                                                          | 2.8T total / 104B activated parameters; 16/896 routed experts plus two shared experts; hybrid KDA and MLA state.                                         |
| Qwen-Image-2.1           | `Qwen/Qwen-Image-2.1`                                                         | A 7B visual generator with 32 DiT layers, plus Qwen3-VL conditioning and a VAE. Iterative flow-matching image generation and RGBA export.                |
| MiniMax H3               | `MiniMaxAI/MiniMax-H3`                                                        | Joint audio/video generation. A 33B Omni Transformer, Qwen3-VL-32B-based conditioning, separate visual/audio VAEs, and a local/hosted workflow boundary. |
| MiniMax Music 3.0        | Open checkpoint `MiniMaxAI/MiniMax-Music3`; hosted API identifier `music-3.0` | 8B global and 0.6B local LMs feed hidden-state fusion, 2.4B flow matching, and a 123M Flow-VAE decoder.                                                  |
| nvidia/personaplex-7b-v1 | `nvidia/personaplex-7b-v1` and NVIDIA's `personaplex` repository              | Moshi-based 7B full-duplex speech model; concurrent incoming and outgoing audio rather than a sequential ASR → chat → TTS cascade.                       |
| CosyVoice 2              | `FunAudioLLM/CosyVoice2-0.5B`                                                 | Qwen2.5-0.5B speech-token LM → chunk-aware causal flow matching → HiFT waveform generation. It is TTS, not a complete conversational agent.              |

## What each field trip explains

**Kimi K3:** admission and agent turns → MoonViT/text features → hybrid KDA/MLA prefill → routed/shared expert execution → iterative decode → streamed answer/tool results. The pinned configuration has 69 KDA layers and 24 full-attention layers. Native MXFP4/MXFP8 quantization does not mean every tensor is four-bit or that only active experts consume resident memory. SGLang's hardware-specific examples include H100 4×8 TP32/EP32 and H200 2×8 TP16/EP16; these are recipe configurations, not universal GPU minima. The vLLM excerpt links to the complete, version-specific setup and flags.

The Serving tab also quotes a **source-reported GB200 prefill experiment** from the SGLang cookbook: input length 8,192, concurrency 32; PP16×TP1 4,550, PP8×TP2 3,596, TEP16 2,407, TP16 1,652 prefill tokens/s/GPU. The same source reports that low concurrency changes the ranking. These numbers were not measured here and must not be converted into a universal speedup, compared against unrelated model tasks, or applied to another hardware/runtime profile without validation.

**Qwen-Image-2.1:** prompt/reference admission → Qwen3-VL features → latent canvas → repeated DiT/scheduler updates → VAE pixels → encoded asset delivery. The model card's 2K example uses BF16 and 40 steps. Its **7B figure belongs to the visual generator**, not the entire pipeline. The published CPU-offload path is contrasted with keeping components resident; lower GPU residency adds host RAM and transfer costs. The pinned card lists ten reference images, so the example does not substitute limits from other Qwen releases or interfaces.

**MiniMax H3:** context interpretation → modality-specific encoders/VAEs → packed audiovisual tokens → joint Omni Transformer updates → audio/video decode → asset delivery or optional 2K regeneration. The reviewed release exposes local H3-Base at 768p; H3-Context-IR and H3-Regenerate-2K are hosted modules not included in that checkpoint. Initial open inference uses full attention; native sparse attention is described but not released in that snapshot. The four-GPU/Ulysses-degree-four entrypoint is quoted from the official README, not invented from parameter counts. The VisualVAE's 16× spatial, 4× temporal, 24-channel representation and the 1×2×2 patchification are distinguished from RGB output. Output specifications are 24 FPS and 32 kHz stereo, with a 4–15-second duration range.

**MiniMax Music 3.0:** lyric/description queue → 8B global LM → 0.6B local LM → fused continuous hidden states → 2.4B flow matching → 123M Flow-VAE decode and completed WAV. The first of eight RVQ codebooks models semantic structure; the other seven model acoustic detail. Inference waveform synthesis consumes fused hidden states, not only a discrete tokenizer decoder. `max_new_tokens` in the documented local service caps 25-Hz audio frames, not text tokens.

Two versioned deployment paths are kept distinct. The pinned official GitHub reference uses two CUDA GPUs, splitting LM generation and synthesis, and supports non-streaming generation. The pinned Hugging Face card also documents a newer Diffusers path with a 24GB+ example and an 8GB CPU/group-offload example described as slower. Those statements refer to different runtimes/configurations. The local format is **32 kHz PCM16 stereo WAV**; the hosted API's example uses separately configured **44.1 kHz MP3**, optional streaming hex, and expiring asset URLs. The API docs' notice says new paid access closed on August 20, 2026 and free music APIs are discontinued, directing users to MiniMax Audio or the open Music3 model. The website does not recommend a discontinued free endpoint as generally available.

**PersonaPlex:** persistent WebSocket/Opus session → live Mimi encoding → voice/text persona prefill → temporal/depth transformers listening while generating → Mimi decoding → duplex playback and interruption. The public loader fixes 24 kHz and 12.5 codec frames/s, or **1,920 samples / 80 ms per frame**. This is a codec cadence, not an end-to-end response-latency promise. The reference server holds a session-wide async lock: adding a load balancer does not establish concurrent calls per worker or per GPU. The proposed session-worker pool, sticky placement, bounded buffers, and deadline-aware scheduling are clearly infrastructure designs. A custom batched runtime requires its own validation. The paper's training GPU count is not presented as serving hardware.

**CosyVoice 2:** text/reference conditioning → Qwen2.5-0.5B speech-token generation → compatible token chunks → causal flow matching → HiFT waveform chunks → client playback/backpressure. The configuration has 25-Hz speech tokens, 24 kHz output, 80 mel bins, two mel frames per speech token, and three-token lookahead. A default 25-token chunk represents **one second of output audio**, not one second of compute or time to first audio. The reference runtime starts with a 25-token hop and can grow toward 100; reference-prompt alignment can add padding. The budget control is not a claim that arbitrary chunk masks are compatible with a trained checkpoint. The code example selects CosyVoice 2 explicitly rather than silently replacing it with CosyVoice 3.

## Reproducible sizing exercises

| Example                | Calculation                                                                      | Interpretation                                                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| K3 microbatch          | 128 token positions × 16 routed experts = 2,048 expert assignments per MoE layer | Counts assignments; shared experts, attention, dense layers, bytes and timing are additional. 16/896 = 1.79% is not GPU utilization. |
| Qwen RGBA              | 2048 × 2048 × 4 bytes = 16 MiB                                                   | Raw RGBA8 output, not PNG size or peak VRAM.                                                                                         |
| Qwen work index        | `(resolution/1024)² × steps/40`                                                  | Pixel-step comparison, not measured latency, FLOPs, or image quality.                                                                |
| Qwen weight floor      | Rounded 7B × 2 BF16 bytes ≈ 13.04 GiB                                            | Visual-generator weights only; excludes encoder, VAE, activations and overhead.                                                      |
| H3 example             | 6 s × 24 FPS = 144 nominal frames; 1280 × 768 × 3 × 144 = 405 MiB                | A chosen raw RGB8 frame budget; excludes audio and compression. Temporal VAE padding is separate.                                    |
| Music local output     | 32,000 samples/s × 2 channels × 2 bytes × 60 s = 7,680,000 bytes ≈ 7.32 MiB      | PCM payload before WAV framing; generation can stop before its 1,500-frame cap.                                                      |
| PersonaPlex equivalent | 24,000 × 2 PCM16 bytes × 2 directions × 100 sessions × 8 = 76.8 Mb/s             | Raw PCM16 equivalent. The actual reference transport is compressed Opus. 100 locked-reference-worker slots does not mean 100 GPUs.   |
| CosyVoice chunk        | 25/25 = 1 s; 24,000 × 2 bytes = 46.875 KiB; 25 × 2 = 50 mel frames               | Mono PCM16 payload and acoustic frame count, not total memory or first-audio latency.                                                |

MiB/GiB are binary. Audio sample rates and decimal network rates retain their stated units. None of these cases calls the dense 70B lab's `simulate()` or reuses its KV formula as a model-specific estimate.

## Evidence and access

All fact, stage, recipe, and trade-off citations are defined in `src/examples/catalog.ts` and surfaced in the application. Model/configuration snapshots:

| Source                                                                     | Reviewed revision                          |
| -------------------------------------------------------------------------- | ------------------------------------------ |
| [Kimi K3](https://huggingface.co/moonshotai/Kimi-K3)                       | `f831ab66814297da540d832a5235f8e904f29d06` |
| [Qwen-Image-2.1](https://huggingface.co/Qwen/Qwen-Image-2.1)               | `d26bb61231c349cf6b7896fa83353113880e1ba3` |
| [MiniMax H3](https://huggingface.co/MiniMaxAI/MiniMax-H3)                  | `42ed227ee7df40d41602854ae760620d6eb651fe` |
| [MiniMax Music3](https://huggingface.co/MiniMaxAI/MiniMax-Music3)          | `1b525ccb685ae809f33027c51c351eeb5833cf72` |
| [CosyVoice2-0.5B](https://huggingface.co/FunAudioLLM/CosyVoice2-0.5B)      | `eec1ae6c79877dbd9379285cf8789c9e0879293d` |
| [NVIDIA PersonaPlex code](https://github.com/NVIDIA/personaplex)           | `3428dfd95309a7f3c84fd93259ded0f810d1ff91` |
| [H3 serving README](https://github.com/MiniMax-AI/MiniMax-H3)              | `199b7d0e1fd95e7b3eafa8c15eca692534142427` |
| [Music3 serving README](https://github.com/MiniMax-AI/MiniMax-Music3)      | `efecc2167c68dd6b1ec75fa49f97f23b475513dd` |
| [CosyVoice runtime and examples](https://github.com/FunAudioLLM/CosyVoice) | `074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc` |

Additional sources are the [Kimi SGLang cookbook](https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3), [Kimi vLLM recipes](https://recipes.vllm.ai/moonshotai/Kimi-K3), [MiniMax Music API](https://platform.minimax.io/docs/api-reference/music-generation), [PersonaPlex paper](https://arxiv.org/html/2602.06053v1), and [CosyVoice 2 paper](https://arxiv.org/html/2412.10117v1). Recipe/API pages can evolve; the site qualifies their observations as reviewed examples.

Anonymous raw PersonaPlex model-card/config requests returned HTTP 401 because the model is gated. No access controls were bypassed, no license was accepted, and no weights were fetched. NVIDIA's public repository, loader/server code, and paper support the architecture and serving claims used here. Model-name searches were discovery aids; model facts are grounded in the primary sources rather than search snippets or community quantizations.

## Implementation and checks

`src/examples/catalog.ts` retains the research and citations. `model.ts` owns bounded inputs, sharing, request sketches and pure payload calculations. `ModelExamples.tsx` provides the operation/serving/source reader, budget controls and comparison. The mixed catalog and level mappings live in `src/learning/infrastructure/`; `src/scene/context.ts` attaches model-specific instanced annotations to the existing hardware. Kimi retains 896 logical expert glyphs, 16 illustrative routed choices and two shared experts; CosyVoice retains the selected hop plus separate lookahead. A single annotation layer is reused across stories.

Tests cover source identity, payload math, deployment boundaries, inputs/URLs, exact expert/token counts, all four physical levels, persistent canvas/hardware identity, reader/input continuity, serving/media distinctions, playback/focus/cinema, comparison/evidence, mobile bounds, reduced motion and physical-topology fallback. [CONNECTED-INFRASTRUCTURE.md](CONNECTED-INFRASTRUCTURE.md) documents the shared scene semantics.
