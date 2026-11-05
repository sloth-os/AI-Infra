export type ExampleId =
  | 'kimi-k3'
  | 'qwen-image-21'
  | 'minimax-h3'
  | 'minimax-music-3'
  | 'personaplex'
  | 'cosyvoice-2'
export type ExampleKind = 'moe' | 'image' | 'video' | 'music' | 'duplex' | 'tts'
export interface Evidence {
  text: string
  sources: string[]
}
export interface ExampleStage {
  title: string
  short: string
  input: string
  output: string
  detail: string
  placement: string
  traffic: string
  bottleneck: string
  sources: string[]
}
export interface ModelExample {
  id: ExampleId
  name: string
  checkpoint: string
  maker: string
  kind: ExampleKind
  color: string
  tagline: string
  request: string
  facts: Evidence[]
  stages: ExampleStage[]
  deployment: string
  recipes: { title: string; code: string; note: string; sources: string[] }[]
  observations?: Evidence[]
  choices: { title: string; benefit: string; cost: string; sources: string[] }[]
  measure: string
  boundary: string
}
const hf = (repo: string, sha: string, path = 'README.md') =>
  `https://huggingface.co/${repo}/blob/${sha}/${path}`
const gh = (repo: string, sha: string, path: string) =>
  `https://github.com/${repo}/blob/${sha}/${path}`
export const exampleSources: Record<string, { title: string; url: string }> = {
  'kimi-card': {
    title: 'Moonshot: Kimi K3 model card',
    url: hf('moonshotai/Kimi-K3', 'f831ab66814297da540d832a5235f8e904f29d06'),
  },
  'kimi-config': {
    title: 'Kimi K3: attention and MoE configuration',
    url: hf(
      'moonshotai/Kimi-K3',
      'f831ab66814297da540d832a5235f8e904f29d06',
      'config.json',
    ),
  },
  'kimi-serving': {
    title: 'SGLang: Kimi K3 hardware and parallelism recipes',
    url: 'https://docs.sglang.io/cookbook/autoregressive/Moonshotai/Kimi-K3',
  },
  'kimi-vllm': {
    title: 'vLLM: Kimi K3 serving recipes',
    url: 'https://recipes.vllm.ai/moonshotai/Kimi-K3',
  },
  'qwen-card': {
    title: 'Qwen: Qwen-Image-2.1 model card and examples',
    url: hf('Qwen/Qwen-Image-2.1', 'd26bb61231c349cf6b7896fa83353113880e1ba3'),
  },
  'qwen-pipeline': {
    title: 'Qwen-Image-2.1: pipeline components',
    url: hf(
      'Qwen/Qwen-Image-2.1',
      'd26bb61231c349cf6b7896fa83353113880e1ba3',
      'model_index.json',
    ),
  },
  'qwen-config': {
    title: 'Qwen-Image-2.1: 32-layer DiT configuration',
    url: hf(
      'Qwen/Qwen-Image-2.1',
      'd26bb61231c349cf6b7896fa83353113880e1ba3',
      'transformer/config.json',
    ),
  },
  'h3-card': {
    title: 'MiniMax H3: architecture, formats, and release boundaries',
    url: hf('MiniMaxAI/MiniMax-H3', '42ed227ee7df40d41602854ae760620d6eb651fe'),
  },
  'h3-serving': {
    title: 'MiniMax H3: official four-GPU serving example',
    url: gh(
      'MiniMax-AI/MiniMax-H3',
      '199b7d0e1fd95e7b3eafa8c15eca692534142427',
      'README.md',
    ),
  },
  'h3-config': {
    title: 'H3 FL2VA: transformer dimensions',
    url: hf(
      'MiniMaxAI/MiniMax-H3',
      '42ed227ee7df40d41602854ae760620d6eb651fe',
      'FL2VA/transformer/config.json',
    ),
  },
  'music-card': {
    title: 'MiniMax Music 3: architecture and current Diffusers examples',
    url: hf(
      'MiniMaxAI/MiniMax-Music3',
      '1b525ccb685ae809f33027c51c351eeb5833cf72',
    ),
  },
  'music-serving': {
    title: 'MiniMax Music 3: reference two-GPU SGLang-Omni path',
    url: gh(
      'MiniMax-AI/MiniMax-Music3',
      'efecc2167c68dd6b1ec75fa49f97f23b475513dd',
      'README.md',
    ),
  },
  'music-api': {
    title: 'MiniMax Music API: music-3.0, formats, and availability notice',
    url: 'https://platform.minimax.io/docs/api-reference/music-generation',
  },
  'persona-readme': {
    title: 'NVIDIA PersonaPlex: server, prompts, and license access',
    url: gh(
      'NVIDIA/personaplex',
      '3428dfd95309a7f3c84fd93259ded0f810d1ff91',
      'README.md',
    ),
  },
  'persona-loader': {
    title: 'PersonaPlex: 24 kHz audio and 12.5 Hz codec frames',
    url: gh(
      'NVIDIA/personaplex',
      '3428dfd95309a7f3c84fd93259ded0f810d1ff91',
      'moshi/moshi/models/loaders.py',
    ),
  },
  'persona-server': {
    title: 'PersonaPlex: WebSocket, Opus, and session lock',
    url: gh(
      'NVIDIA/personaplex',
      '3428dfd95309a7f3c84fd93259ded0f810d1ff91',
      'moshi/moshi/server.py',
    ),
  },
  'persona-paper': {
    title: 'PersonaPlex paper: full-duplex architecture and evaluation',
    url: 'https://arxiv.org/html/2602.06053v1',
  },
  'cosy-paper': {
    title: 'CosyVoice 2 paper: Qwen2.5, speech tokens, and causal flow',
    url: 'https://arxiv.org/html/2412.10117v1',
  },
  'cosy-config': {
    title: 'CosyVoice 2: 24 kHz, 25 Hz, 80-bin mel, and HiFT configuration',
    url: hf(
      'FunAudioLLM/CosyVoice2-0.5B',
      'eec1ae6c79877dbd9379285cf8789c9e0879293d',
      'cosyvoice2.yaml',
    ),
  },
  'cosy-runtime': {
    title: 'CosyVoice: version-specific streaming state and chunk scheduling',
    url: gh(
      'FunAudioLLM/CosyVoice',
      '074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc',
      'cosyvoice/cli/model.py',
    ),
  },
  'cosy-readme': {
    title: 'CosyVoice: installation and CosyVoice 2 serving support',
    url: gh(
      'FunAudioLLM/CosyVoice',
      '074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc',
      'README.md',
    ),
  },
  'cosy-example': {
    title: 'Official CosyVoice 2 zero-shot and streaming examples',
    url: gh(
      'FunAudioLLM/CosyVoice',
      '074ca6dc9e80a2f424f1f74b48bdd7d3fea531cc',
      'example.py',
    ),
  },
}
export const modelExamples: ModelExample[] = [
  {
    id: 'kimi-k3',
    name: 'Kimi K3',
    checkpoint: 'moonshotai/Kimi-K3',
    maker: 'Moonshot AI',
    kind: 'moe',
    color: '#c6dea0',
    tagline: 'Sparse expert compute. A very large resident model.',
    request:
      'Review a repository, inspect a screenshot, call a tool, and explain a fix.',
    facts: [
      {
        text: '2.8T total parameters; 104B activated parameters.',
        sources: ['kimi-card'],
      },
      {
        text: '16 of 896 routed experts per token, plus 2 shared experts.',
        sources: ['kimi-card', 'kimi-config'],
      },
      {
        text: '93 layers: 69 KDA layers and 24 full-attention layers in the published configuration; 1,048,576-token context.',
        sources: ['kimi-config'],
      },
      {
        text: 'Native MXFP4 weights / MXFP8 activations; hybrid KDA and gated MLA state. This is not the lab’s dense 70B GQA cache.',
        sources: ['kimi-card', 'kimi-config'],
      },
    ],
    stages: [
      {
        title: 'Admit an agent request',
        short: 'API + router',
        input: 'Messages, images, tool definitions',
        output: 'A request assigned to a warm model replica',
        detail:
          'An agent can create many model calls over a long session. Model placement and per-request routing are separate decisions. Preserve compatible conversation and cache state across turns.',
        placement:
          'Proposed: tenant-aware gateway and a topology-aware replica router.',
        traffic:
          'HTTPS carries the user request; model weights are already resident in the serving group.',
        bottleneck:
          'Long prompts, bursty tools, and a replica with little free state capacity.',
        sources: ['kimi-card', 'kimi-serving'],
      },
      {
        title: 'Encode text and vision',
        short: 'Vision + tokens',
        input: 'Token IDs and image pixels',
        output: 'Text embeddings and MoonViT-V2 visual features',
        detail:
          'K3 is natively multimodal. Image encoding adds its own compute and intermediate features before the language backbone; retrieval embeddings are a separate application choice.',
        placement:
          'Proposed: colocate or pool the vision encoder, while preserving model-version compatibility.',
        traffic:
          'Pixels or decoded image tensors become visual features; they are not SSE output tokens.',
        bottleneck:
          'Vision preprocessing and long multimodal prefixes can delay prefill.',
        sources: ['kimi-card'],
      },
      {
        title: 'Prefill hybrid attention state',
        short: 'KDA + MLA',
        input: 'The complete prompt sequence',
        output: 'Recurrent KDA state plus MLA attention cache',
        detail:
          'The released configuration interleaves 69 KDA layers with 24 full-attention layers. KDA state and MLA cache need different memory accounting; a single dense-GQA bytes-per-token formula is inappropriate.',
        placement:
          'Published SGLang recipes configure separate KDA and MLA state budgets.',
        traffic:
          'Local HBM traffic supplies weights and state. A disaggregated serving design also needs a compatible state-transfer implementation.',
        bottleneck:
          'State-pool allocation, prefix-hit granularity, and long-context prefill.',
        sources: ['kimi-config', 'kimi-serving', 'kimi-vllm'],
      },
      {
        title: 'Dispatch tokens to routed experts',
        short: '896 experts',
        input: 'Hidden states and top-16 routing choices',
        output: 'Combined expert outputs, plus shared-expert work',
        detail:
          'Only selected experts execute for a token, but the distributed model still needs the expert weights available. The 896 tiles show the published routed-expert count; highlighted choices are an illustrative route.',
        placement:
          'Published examples: H100 4×8 TP32/EP32; H200 2×8 TP16/EP16. These are recipe layouts, not universal minimums.',
        traffic:
          'Expert parallelism exchanges token activations between expert owners. Keep local fast links and cross-node RDMA distinct.',
        bottleneck:
          'Expert imbalance, activation exchange, and HBM reads; sparse compute does not make the resident weights disappear.',
        sources: ['kimi-card', 'kimi-serving'],
      },
      {
        title: 'Decode the next token',
        short: 'Token loop',
        input: 'Previous state and the last emitted token',
        output: 'Reasoning, tool-call, or answer tokens',
        detail:
          'Decode repeats hybrid-attention and expert work for active sequences. Continuous batching can use idle capacity, but interactive latency and long-context state still constrain admission.',
        placement:
          'Proposed: budget interactive and background work separately; benchmark the actual hardware and engine recipe.',
        traffic:
          'State reads and writes remain local to their owning ranks unless the serving design explicitly migrates them.',
        bottleneck:
          'Per-token latency, memory headroom, and the slowest communication path.',
        sources: ['kimi-card', 'kimi-serving'],
      },
      {
        title: 'Stream, call tools, and resume',
        short: 'Tools + SSE',
        input: 'Assistant messages and tool calls',
        output: 'Streamed results and the next agent turn',
        detail:
          'K3’s model card requires preserved thinking history: pass the returned assistant message back intact, including reasoning_content and tool_calls. A tool call leaves the model service and later creates another inference turn.',
        placement:
          'Proposed: sandbox tool execution separately from GPU workers and reuse a compatible warm replica when appropriate.',
        traffic:
          'Small streamed tokens leave through HTTPS; tool results return as new prompt data.',
        bottleneck:
          'Tool execution can dominate end-to-end latency even when GPU decode is fast.',
        sources: ['kimi-card'],
      },
    ],
    deployment:
      'The serving group spans multiple accelerators. Hardware, kernel backend, TP/EP/PP layout, cache dtype, and context length are coupled choices; use a complete engine recipe for the selected platform.',
    recipes: [
      {
        title: 'Published vLLM entrypoint · eight-GPU Blackwell profile',
        code: 'vllm serve moonshotai/Kimi-K3 \\\n  --trust-remote-code \\\n  --tensor-parallel-size 8 \\\n  --enable-auto-tool-choice --tool-call-parser kimi_k3 \\\n  --reasoning-parser kimi_k3',
        note: 'Excerpt from the published profile, not a complete installation command. The linked recipe supplies the required image, driver, memory, attention, and cache flags. Other hardware uses different layouts.',
        sources: ['kimi-vllm', 'kimi-serving'],
      },
    ],
    choices: [
      {
        title: 'Tensor + expert parallelism',
        benefit:
          'Distribute the very large checkpoint and expert work across a fast serving group.',
        cost: 'Communication and expert imbalance limit scaling; a fast GPU cannot compensate for a slow interconnect.',
        sources: ['kimi-serving'],
      },
      {
        title: 'Separate prefill and decode',
        benefit:
          'Allocate resources by phase and protect interactive decode from long-prompt work.',
        cost: 'Hybrid state transfer and separate state pools add implementation and network costs; this is not a generic 640 MiB handoff.',
        sources: ['kimi-serving', 'kimi-vllm'],
      },
      {
        title: 'Cache a compatible prefix',
        benefit: 'Reuse prompt work across agent turns.',
        cost: 'The hybrid cache has engine-specific matching and state-pool constraints. Cache affinity still needs a load escape path.',
        sources: ['kimi-vllm'],
      },
    ],
    measure:
      'TTFT, per-token latency, accepted tokens/s under the same SLO, expert imbalance, and hybrid-state headroom.',
    observations: [
      {
        text: 'Source-reported GB200 prefill experiment: input length 8,192, concurrency 32. PP16 × TP1: 4,550 prefill tokens/s/GPU; PP8 × TP2: 3,596; TEP16: 2,407; TP16: 1,652. The cookbook reports a different ranking below roughly eight concurrent requests, where TEP16 leads deep PP. These are that source’s configurations and measurements, not results from this website or a universal speedup.',
        sources: ['kimi-serving'],
      },
    ],
    boundary:
      'The expert highlights and routing animation are schematic. The published recipes describe possible deployments, not Moonshot’s private production fleet.',
  },
  {
    id: 'qwen-image-21',
    name: 'Qwen-Image-2.1',
    checkpoint: 'Qwen/Qwen-Image-2.1',
    maker: 'Qwen',
    kind: 'image',
    color: '#bca7ed',
    tagline: 'An image takes repeated latent updates, then a VAE decode.',
    request:
      'Create a transparent 2K product sticker, or edit a reference photograph.',
    facts: [
      {
        text: '7B parameters in the visual generator, with 32 single-stream DiT layers. This excludes the other pipeline components.',
        sources: ['qwen-card', 'qwen-config'],
      },
      {
        text: 'Qwen3-VL conditioning, FlowMatchEulerDiscreteScheduler, and AutoencoderKLQwenImage21 are explicit pipeline components.',
        sources: ['qwen-pipeline'],
      },
      {
        text: 'The published 2048×2048 example uses BF16 and 40 inference steps. Native RGBA output and image editing are supported.',
        sources: ['qwen-card'],
      },
      {
        text: 'The pinned model card lists up to 10 reference images; limits belong to this version, not all Qwen image releases.',
        sources: ['qwen-card'],
      },
    ],
    stages: [
      {
        title: 'Route an image job',
        short: 'Job admission',
        input: 'Prompt, optional reference images, resolution, seed',
        output: 'A queued generation or editing job',
        detail:
          'Unlike chat, the useful product is an image asset. Admission should account for resolution, reference inputs, and requested denoising steps rather than prompt tokens alone.',
        placement:
          'Proposed: a separate image-worker pool with queues grouped by compatible shapes and pipeline versions.',
        traffic:
          'HTTPS uploads and optional object-store reads bring prompts and reference images to the service.',
        bottleneck:
          'An oversized batch or image can exhaust activation memory even when the weights fit.',
        sources: ['qwen-card'],
      },
      {
        title: 'Encode the conditioning',
        short: 'Qwen3-VL',
        input: 'Text and optional reference pixels',
        output: 'Conditioning features for the visual generator',
        detail:
          'The pipeline uses Qwen3VLForConditionalGeneration and a Qwen3VLProcessor. Prompt features are not themselves the final image and are distinct from the noisy generation latents.',
        placement:
          'Proposed: keep the encoder resident when capacity permits, or offload components with the documented pipeline facilities.',
        traffic:
          'Text/image tensors become conditioning features inside the GPU pipeline.',
        bottleneck:
          'Encoder residency and transfers compete with denoiser activation memory.',
        sources: ['qwen-pipeline', 'qwen-card'],
      },
      {
        title: 'Create the latent canvas',
        short: 'Noisy latents',
        input: 'Seeded noise and conditioning',
        output: 'An image latent representation',
        detail:
          'The generated canvas lives in latent space. The grid here is an explanatory preview, not an image produced by Qwen. Editing also conditions on encoded reference content.',
        placement:
          'Proposed: allocate latent and attention buffers on the denoiser’s device before admitting the job.',
        traffic:
          'Local device memory moves latent tensors; the intermediate canvas need not leave the worker.',
        bottleneck:
          'Larger images increase token and activation counts; output PNG size is not a VRAM estimate.',
        sources: ['qwen-card', 'qwen-pipeline', 'qwen-config'],
      },
      {
        title: 'Repeat the DiT update',
        short: '32-layer DiT',
        input: 'Current latents, conditioning, and timestep',
        output: 'Updated latents over repeated scheduler steps',
        detail:
          'The 32-layer visual transformer is invoked repeatedly under a flow-matching scheduler. The published example requests 40 steps. More pixel-steps is a work proxy, not a measured runtime or a quality guarantee.',
        placement:
          'Proposed: batch compatible image jobs; keep the denoiser resident for throughput.',
        traffic:
          'Attention and MLP activations circulate through HBM and on-chip memory. The model card also describes prefix KV reuse.',
        bottleneck:
          'Denoiser compute and attention IO dominate repeated steps.',
        sources: ['qwen-card', 'qwen-config', 'qwen-pipeline'],
      },
      {
        title: 'Decode latents to RGBA',
        short: 'VAE decoder',
        input: 'Final visual latents',
        output: 'RGB or RGBA pixels',
        detail:
          'AutoencoderKLQwenImage21 converts the final latent representation into pixels. Alpha is a real output channel; transparent imagery should retain it through the export pipeline.',
        placement:
          'Proposed: reserve memory for the VAE peak; component offloading can trade VRAM for transfer time.',
        traffic:
          'The final pixel buffer moves from device to host for encoding.',
        bottleneck:
          'VAE decode and image export can have different memory peaks from denoising.',
        sources: ['qwen-pipeline', 'qwen-card'],
      },
      {
        title: 'Encode and deliver the asset',
        short: 'PNG + storage',
        input: 'Pixels and alpha',
        output: 'An encoded image and an asset URL',
        detail:
          'A 2048² RGBA8 pixel buffer is exactly 16 MiB before compression. The final PNG/WebP size depends on content and settings; raw pixels are not an estimate of encoded network bytes.',
        placement:
          'Proposed: a CPU encoding and durable object-storage tier, separate from GPU scheduling.',
        traffic:
          'Encoded assets leave through storage/CDN or a direct API response.',
        bottleneck:
          'CPU encoding, storage writes, and client download time can outlast the last GPU operation.',
        sources: ['qwen-card'],
      },
    ],
    deployment:
      'The complete pipeline includes the conditioning model, the 7B visual generator, the VAE, and runtime buffers. A 7B × 2-byte weight calculation is only a visual-generator floor, not the GPU requirement of the whole pipeline.',
    recipes: [
      {
        title: 'Published Diffusers generation example',
        code: 'pipe = QwenImage21Pipeline.from_pretrained(\n    "Qwen/Qwen-Image-2.1", torch_dtype=torch.bfloat16\n).to("cuda")\nimage = pipe(prompt=prompt, width=2048, height=2048,\n             num_inference_steps=40).images[0]',
        note: 'Requires the model card’s compatible Transformers and Diffusers versions. No model is loaded by this website.',
        sources: ['qwen-card'],
      },
    ],
    choices: [
      {
        title: 'Resident pipeline components',
        benefit:
          'Avoid repeated host/device transfers between generation phases.',
        cost: 'Needs memory for multiple models plus activation peaks; 7B is only the visual component.',
        sources: ['qwen-card', 'qwen-pipeline'],
      },
      {
        title: 'Model CPU offload',
        benefit:
          'The published enable_model_cpu_offload() path reduces GPU residency.',
        cost: 'Host RAM and PCIe transfers enter the critical path. Lower VRAM does not imply faster generation.',
        sources: ['qwen-card'],
      },
      {
        title: 'Change resolution or step count',
        benefit: 'Control the amount of generation work per image.',
        cost: 'Validate visual quality and scheduler compatibility. Four steps are not interchangeable with the published 40-step example.',
        sources: ['qwen-card'],
      },
    ],
    measure:
      'Time to image, images/s at a fixed resolution and step count, peak VRAM, and image quality under the same evaluation.',
    boundary:
      'The animated canvas is synthetic. The pixel-step index is a sizing illustration, not a diffusion benchmark or a real Qwen output.',
  },
  {
    id: 'minimax-h3',
    name: 'MiniMax H3',
    checkpoint: 'MiniMaxAI/MiniMax-H3',
    maker: 'MiniMax',
    kind: 'video',
    color: '#e7b392',
    tagline: 'Video and stereo audio are generated together.',
    request:
      'Generate a six-second scene with synchronized dialogue and environmental sound.',
    facts: [
      {
        text: 'H3-Base uses a 33B dense Omni Transformer; its conditioning encoder uses Qwen3-VL-32B.',
        sources: ['h3-card'],
      },
      {
        text: 'The published output specification is 4–15 seconds, 24 FPS, with 32 kHz stereo audio.',
        sources: ['h3-card'],
      },
      {
        text: 'Visual VAE: 16× spatial / 4× temporal compression, 24 channels; audio VAE: 40 Hz latents per channel.',
        sources: ['h3-card'],
      },
      {
        text: 'Open H3-Base produces 768p. Context-IR and 2K regeneration are hosted modules in this release; the initial open implementation uses full attention.',
        sources: ['h3-card'],
      },
    ],
    stages: [
      {
        title: 'Build the context representation',
        short: 'Context-IR',
        input: 'Text and optional image, video, and audio references',
        output: 'Structured context for H3-Base',
        detail:
          'The official full workflow uses H3-Context-IR to interpret relationships, timing, and instructions. That multi-service system is hosted; the release also explains how to supply your own prompting system.',
        placement:
          'Published: hosted Context-IR or a separately implemented local preprocessing system.',
        traffic:
          'Reference assets may be much larger than the text prompt; stage them close to the generation workers.',
        bottleneck:
          'Reference decoding, preprocessing, and remote service calls can dominate job startup.',
        sources: ['h3-card'],
      },
      {
        title: 'Encode each modality',
        short: 'Encoder + VAEs',
        input: 'Structured text and reference media',
        output: 'Text features, visual latents, audio latents',
        detail:
          'Text uses the Qwen3-VL-32B-based H3 encoder. Visual inputs also use the VisualVAE; audio uses the AudioVAE. These are distinct models and memory budgets.',
        placement:
          'Proposed: schedule encoder/VAE work separately when their utilization differs from the Omni Transformer.',
        traffic:
          'Decoded media becomes device tensors and modality-specific latents.',
        bottleneck:
          'A 33B denoiser’s weight size excludes the large text/vision encoder and both VAEs.',
        sources: ['h3-card'],
      },
      {
        title: 'Pack time, image, and audio',
        short: 'Packed AV tokens',
        input: 'Visual and stereo-audio latents',
        output: 'A packed multimodal sequence with MM-RoPE positions',
        detail:
          'Visual latents are patchified 1×2×2, giving effective 32× spatial downsampling into transformer tokens. Audio remains temporally aligned through its own latent stream.',
        placement:
          'Proposed: keep encoded references and generation buffers near the attention group.',
        traffic:
          'The expensive working set is a multimodal sequence, not a text-only KV cache.',
        bottleneck:
          'Duration, resolution, references, and full attention all affect activation pressure.',
        sources: ['h3-card', 'h3-config'],
      },
      {
        title: 'Jointly predict audio and video',
        short: 'Omni Transformer',
        input: 'Packed multimodal sequence and timesteps',
        output: 'Updated video and audio latents',
        detail:
          'The same dense transformer predicts both modalities. The official SGLang example uses four GPUs with Ulysses degree four. Sequence parallelism distributes attention work while adding collective traffic.',
        placement:
          'Published serving example: --num-gpus 4 --ulysses-degree 4. Hardware and performance still require the linked full recipe.',
        traffic:
          'Sequence-parallel attention exchanges data within the GPU group; output audio is not generated by an unrelated after-the-fact TTS service.',
        bottleneck:
          'Attention compute, memory, and interconnect cost for long visual sequences.',
        sources: ['h3-card', 'h3-serving'],
      },
      {
        title: 'Decode synchronized media',
        short: 'Visual + audio VAE',
        input: 'Final video and audio latents',
        output: '24 FPS frames and 32 kHz stereo samples',
        detail:
          'The VisualVAE reconstructs frames; the AudioVAE decodes left and right channels. Preserve the shared timeline when assembling the clip.',
        placement:
          'Proposed: reserve decoder peak memory and overlap CPU media work only when it does not starve GPU processing.',
        traffic:
          'Raw frame and PCM buffers cross device/host boundaries before muxing.',
        bottleneck:
          'Video decode and audio/video muxing can create large transient host buffers.',
        sources: ['h3-card'],
      },
      {
        title: 'Deliver 768p or request 2K regeneration',
        short: 'Encode + deliver',
        input: 'Decoded video/audio and optional original context',
        output: 'A playable clip; optionally a second hosted 2K pass',
        detail:
          'H3-Regenerate-2K is an in-context regeneration step, not a conventional upscaler bundled into the open H3-Base checkpoint. Its cost and hosted availability are separate from local 768p inference.',
        placement:
          'Published boundary: local H3-Base plus optional hosted regeneration. Proposed: durable asset storage and media delivery.',
        traffic:
          'The raw RGB budget shown here is before compression and excludes audio. MP4 bitrate is content/codec dependent.',
        bottleneck:
          'A second generation pass and large asset transfers add end-to-end cost.',
        sources: ['h3-card'],
      },
    ],
    deployment:
      'The local example is H3-Base. The complete official 2K workflow crosses a local/hosted boundary; the website marks those stages rather than implying the entire system is in the checkpoint.',
    recipes: [
      {
        title: 'Official four-GPU H3-Base entrypoint',
        code: 'sglang serve \\\n  --model-path MiniMaxAI/MiniMax-H3 \\\n  --num-gpus 4 --ulysses-degree 4 \\\n  --performance-mode speed \\\n  --model-variant fl2va --port 30010',
        note: 'Startup excerpt from the pinned official README. Use its framework installation and hardware guidance. FL2VA and Ref2VA serve different reference-input tasks.',
        sources: ['h3-serving'],
      },
    ],
    choices: [
      {
        title: 'Sequence parallelism',
        benefit: 'Spread long-sequence attention across accelerators.',
        cost: 'Collective traffic and synchronization can limit speedup; four GPUs does not imply a fourfold improvement.',
        sources: ['h3-serving'],
      },
      {
        title: 'Cache AdaLN modulation',
        benefit:
          'The card describes roughly 13B AdaLN-related parameters whose outputs can be precomputed for inference.',
        cost: 'This is a specific implementation optimization, not permission to remove arbitrary model weights.',
        sources: ['h3-card'],
      },
      {
        title: 'Local 768p versus full 2K workflow',
        benefit:
          'Choose a local base pipeline or the higher-resolution hosted regeneration workflow.',
        cost: 'The latter adds a separate module, service dependency, and generation work. Initial open inference does not include native sparse-attention implementation.',
        sources: ['h3-card'],
      },
    ],
    measure:
      'Time to complete a clip at fixed duration/resolution/steps, peak memory, synchronization quality, and media delivery latency.',
    boundary:
      'Stage blocks are a proposed infrastructure schematic. They do not expose MiniMax’s private cluster layout or simulate the model’s attention numerically.',
  },
  {
    id: 'minimax-music-3',
    name: 'MiniMax Music 3.0',
    checkpoint: 'MiniMaxAI/MiniMax-Music3',
    maker: 'MiniMax',
    kind: 'music',
    color: '#dfbf78',
    tagline: 'A global/local language model feeds continuous audio synthesis.',
    request:
      'Turn tagged lyrics and a structured musical description into a one-minute song.',
    facts: [
      {
        text: 'The official open checkpoint is named MiniMaxAI/MiniMax-Music3; the API model identifier is music-3.0.',
        sources: ['music-card', 'music-api'],
      },
      {
        text: '8B Global LLM + 0.6B Local LLM; fused hidden states feed 2.4B Flow Matching and a 123M Flow-VAE decoder.',
        sources: ['music-card'],
      },
      {
        text: '25 generated audio frames/s; local output is 32 kHz, 16-bit stereo WAV. The card supports songs up to five minutes.',
        sources: ['music-card'],
      },
      {
        text: 'The pinned local release supports non-streaming generation. The API has a separate availability notice: new paid access closed and free APIs discontinued.',
        sources: ['music-card', 'music-api'],
      },
    ],
    stages: [
      {
        title: 'Queue lyrics and a musical plan',
        short: 'Lyrics + caption',
        input: 'Tagged lyrics and style, vocals, arrangement instructions',
        output: 'Tokenized conditioning and a bounded generation job',
        detail:
          'Lyrics belong in input; the musical description belongs in instructions on the documented SGLang-Omni speech API. A long song is a long-running job, not an interactive chat turn.',
        placement:
          'Proposed: an asynchronous job queue isolated from low-latency voice-chat workers.',
        traffic:
          'A small text request enters; generation later returns a much larger audio asset.',
        bottleneck:
          'Unbounded duration requests occupy workers for a long time; admission needs a maximum-frame budget.',
        sources: ['music-card', 'music-serving'],
      },
      {
        title: 'Model long-range song structure',
        short: 'Global LLM · 8B',
        input: 'Conditioning and previous semantic frames',
        output: 'First-codebook predictions and global hidden states',
        detail:
          'The Global LLM is initialized from Qwen3-8B. It predicts the first RVQ codebook frame by frame and models musical structure across the song.',
        placement:
          'Published two-GPU reference: GPU 0 runs the language-model generation stage.',
        traffic:
          'Autoregressive state and weights are read repeatedly on the language-model device.',
        bottleneck:
          'Long sequences occupy state and compute; generated audio-frame tokens are not text words.',
        sources: ['music-card', 'music-serving'],
      },
      {
        title: 'Restore acoustic detail within a frame',
        short: 'Local LLM · 0.6B',
        input: 'Current global frame and local context',
        output: 'Remaining codebooks and local hidden states',
        detail:
          'The Local LLM predicts the other seven acoustic codebooks. The training tokenizer has one 16,384-entry semantic codebook and seven 1,024-entry residual codebooks.',
        placement:
          'Proposed: keep the global/local loop together when moving it would add a network round trip to each frame.',
        traffic: 'Fine-grained frame work stays close to the global model.',
        bottleneck:
          'A frame’s local acoustic work lies inside the generation critical path.',
        sources: ['music-card'],
      },
      {
        title: 'Fuse continuous hidden states',
        short: 'Hidden-state handoff',
        input: 'Global and local final hidden states',
        output: 'Continuous conditioning for synthesis',
        detail:
          'Inference synthesis uses fused hidden states, not just a discrete RVQ tokenizer decoder. A stage split must transport these representations, not pretend the intermediate is already WAV audio.',
        placement:
          'Published two-GPU reference separates LM generation and synthesis. A networked stage pool is a proposed extension, not a vendor topology claim.',
        traffic:
          'GPU-to-GPU hidden-state transfer crosses the stage boundary; bandwidth depends on the implementation’s shapes and dtype.',
        bottleneck:
          'Queueing or copying the entire intermediate can delay synthesis after the LM finishes.',
        sources: ['music-card', 'music-serving'],
      },
      {
        title: 'Generate continuous audio latents',
        short: 'Flow Matching · 2.4B',
        input: 'Fused conditioning',
        output: 'Flow-VAE latents',
        detail:
          'The 2.4B flow-matching module converts the continuous conditioning into audio latents. It is a separate model phase from autoregressive music-frame generation.',
        placement:
          'Published reference: GPU 1 runs Flow Matching and waveform decoding.',
        traffic:
          'Latent updates circulate in device memory; moving them between workers is an explicit deployment choice.',
        bottleneck:
          'The synthesis pool can become the bottleneck even when LM generation is well batched.',
        sources: ['music-card', 'music-serving'],
      },
      {
        title: 'Decode and store the stereo song',
        short: 'Flow-VAE · WAV',
        input: 'Continuous audio latents',
        output: '32 kHz / PCM16 / two-channel audio',
        detail:
          'The 123M Flow-VAE decoder yields stereo audio. At 32,000 samples/s × two channels × two bytes, one minute contains 7,680,000 PCM bytes before WAV framing.',
        placement:
          'Proposed: send completed audio to durable object storage; the pinned local path is non-streaming.',
        traffic:
          'WAV transport and legacy API MP3/hex transport have different bandwidth costs. Do not mix the local 32 kHz spec with an API’s 44.1 kHz example.',
        bottleneck:
          'Long-form generation, synthesis, asset encoding, and delivery need separate timing measurements.',
        sources: ['music-card', 'music-api'],
      },
    ],
    deployment:
      'Two documented paths coexist: the pinned GitHub SGLang-Omni reference splits LM and synthesis over two CUDA GPUs; the newer pinned Hugging Face card also documents a Diffusers path with CPU/group offload for lower VRAM. Those are versioned recipes, not contradictory universal hardware requirements.',
    recipes: [
      {
        title: 'Open checkpoint · SGLang-Omni API example',
        code: 'sgl-omni serve --model-path MiniMaxAI/MiniMax-Music3 --port 8000\n\n# POST http://127.0.0.1:8000/v1/audio/speech\n{\n  "model": "MiniMaxAI/MiniMax-Music3",\n  "input": "[Verse]\\nMorning light...",\n  "instructions": "Warm acoustic pop, guitar and soft piano",\n  "max_new_tokens": 1500,\n  "response_format": "wav", "stream": false\n}',
        note: 'The 1,500-frame cap represents at most 60 seconds at 25 frames/s; end-of-audio can stop earlier. The displayed request is an example, not an executed call.',
        sources: ['music-card', 'music-serving'],
      },
    ],
    choices: [
      {
        title: 'Two-GPU staged reference',
        benefit:
          'Separate autoregressive generation from flow/waveform synthesis.',
        cost: 'Two device placements and an intermediate handoff; the pinned reference is non-streaming.',
        sources: ['music-serving'],
      },
      {
        title: 'Diffusers CPU / layer offload',
        benefit:
          'The model card publishes a 24GB+ recipe and an 8GB example using CPU/group offload.',
        cost: 'The card describes the low-memory path as slower. It shifts residency and transfer costs; it does not shrink the model’s total parameters.',
        sources: ['music-card'],
      },
      {
        title: 'Use the hosted Music API',
        benefit:
          'Avoid managing the model runtime when the account has access.',
        cost: 'Current docs restrict new access; streaming hex and expiring URLs are API-specific. They are not guarantees of the local open checkpoint.',
        sources: ['music-api'],
      },
    ],
    measure:
      'Time to complete a song, real-time factor (compute seconds / audio seconds), stage utilization, and delivered audio quality.',
    boundary:
      'No song is synthesized here. The waveforms illustrate data flow; local model facts and legacy hosted-API behavior are labeled separately.',
  },
  {
    id: 'personaplex',
    name: 'PersonaPlex 7B v1',
    checkpoint: 'nvidia/personaplex-7b-v1',
    maker: 'NVIDIA',
    kind: 'duplex',
    color: '#80cfc2',
    tagline: 'Listen while speaking. Keep the session on time.',
    request:
      'A role-conditioned voice agent listens, responds, and handles interruption without a push-to-talk boundary.',
    facts: [
      {
        text: 'A 7B full-duplex speech-to-speech model based on Moshi, conditioned by a role text prompt and an audio voice prompt.',
        sources: ['persona-readme', 'persona-paper'],
      },
      {
        text: 'The reference codec runs at 24 kHz and 12.5 frames/s: an 80 ms audio-frame cadence.',
        sources: ['persona-loader'],
      },
      {
        text: 'The reference server transports Opus over a WebSocket and holds a session-wide async lock. It does not demonstrate arbitrary concurrent sessions on one worker.',
        sources: ['persona-server'],
      },
      {
        text: 'Model weights require accepting the NVIDIA model license. The public code and paper are sufficient for this walkthrough; gated weights were not downloaded.',
        sources: ['persona-readme'],
      },
    ],
    stages: [
      {
        title: 'Open a persistent duplex session',
        short: 'WebSocket + Opus',
        input: 'Continuous microphone packets and persona settings',
        output: 'An admitted, stateful conversation',
        detail:
          'The connection stays open while both participants can speak. The reference implementation’s async lock serializes active sessions on a worker, so production concurrency requires an explicit worker or batching design.',
        placement:
          'Proposed: a session router with sticky assignment to a warm worker; bound connection admission.',
        traffic:
          'Opus packets travel in both directions over a WebSocket, not one request followed by one finished WAV.',
        bottleneck:
          'Admission, packet jitter, and a worker that misses its real-time deadline.',
        sources: ['persona-server', 'persona-readme'],
      },
      {
        title: 'Turn live PCM into codec frames',
        short: 'Mimi encoder',
        input: '24 kHz mono audio samples',
        output: 'Mimi audio tokens at 12.5 Hz',
        detail:
          'At 24,000 samples/s and 12.5 frames/s, a codec frame represents 1,920 samples or 80 ms. Audio encoding runs continuously while later stages also generate audio.',
        placement:
          'Published reference keeps codec models and the language model in the serving process.',
        traffic:
          'Decoded PCM reaches the GPU encoder. Compressed network bytes differ from float tensors inside the worker.',
        bottleneck:
          'Small recurring deadlines make tail latency and jitter more important than bulk bandwidth.',
        sources: ['persona-loader', 'persona-server'],
      },
      {
        title: 'Prefill the voice and role',
        short: 'Hybrid persona prompt',
        input: 'Voice conditioning and role text',
        output: 'A persona-conditioned model state',
        detail:
          'The paper concatenates voice and text system-prompt segments. The reference places the voice prompt first so it can be prefetched for an existing voice. This is not a separate ASR transcript passed to a generic chat model.',
        placement:
          'Proposed: cache only compatible persona initialization state and isolate each session’s continuing state.',
        traffic:
          'Conditioning is loaded at initialization; per-session audio then advances the live state.',
        bottleneck:
          'Cold loading and repeated prompt setup can delay the start of a call.',
        sources: ['persona-paper', 'persona-readme'],
      },
      {
        title: 'Listen and generate in one model',
        short: 'Moshi temporal + depth',
        input: 'User audio, agent text, and agent audio streams',
        output: 'Agent text/audio tokens while user audio continues',
        detail:
          'The temporal and depth-transformer design models coupled audio streams. A user interruption does not require stopping input capture while a separate TTS job completes.',
        placement:
          'Proposed: reserve compute for frame deadlines; do not place long video batches in the same latency-critical queue.',
        traffic:
          'Recurrent model state and tokens remain on the assigned worker. Cross-host migration must preserve all required state.',
        bottleneck:
          'A long batch or scheduler stall can create audible gaps even with adequate average throughput.',
        sources: ['persona-paper', 'persona-loader'],
      },
      {
        title: 'Decode the agent audio',
        short: 'Mimi decoder',
        input: 'Generated audio codebooks',
        output: 'Streaming PCM audio',
        detail:
          'The audio decoder turns generated codec frames into waveform chunks. Encoding user speech and decoding agent speech are concurrent sides of the same interaction.',
        placement:
          'Published reference hosts encoding and decoding in the same process; a distributed design must justify its added latency.',
        traffic:
          'PCM moves from the model to the audio packetizer; the reference uses Opus for transport.',
        bottleneck:
          'Missed decode deadlines produce buffer underruns or growing latency.',
        sources: ['persona-server', 'persona-loader'],
      },
      {
        title: 'Play, hear, and interrupt',
        short: 'Duplex playback',
        input: 'Agent audio packets and continuing user input',
        output: 'A responsive two-way conversation',
        detail:
          'The two animated lanes remain active together. A production jitter buffer absorbs network variation but also adds delay. End-to-end interruption behavior needs evaluation, not just a text-token throughput test.',
        placement:
          'Proposed: a bounded client playout buffer and regional session routing.',
        traffic:
          'The bandwidth exercise uses PCM16 equivalents; actual Opus bytes depend on codec configuration.',
        bottleneck:
          'Network jitter, playout buffering, and the model’s conversational response policy.',
        sources: ['persona-server', 'persona-paper'],
      },
    ],
    deployment:
      'Begin with the official single-session reference and then benchmark a session-worker pool or an explicitly engineered batching runtime. One hundred calls require one hundred reference-worker slots, not a claim that one hundred GPUs are necessary.',
    recipes: [
      {
        title: 'Official local reference server',
        code: 'pip install moshi/.\npython -m moshi.server --ssl ./ssl\n\n# Optional when VRAM is insufficient:\npython -m moshi.server --ssl ./ssl --cpu-offload',
        note: 'Follow the official repository for the SSL directory, dependencies, license acceptance, and model authentication. CPU offload changes latency; it is not a real-time guarantee.',
        sources: ['persona-readme'],
      },
    ],
    choices: [
      {
        title: 'Warm, sticky session workers',
        benefit:
          'Retain codec and model state without migrating it every audio frame.',
        cost: 'Requires admission limits and failover behavior; weights fitting in VRAM does not establish calls per GPU.',
        sources: ['persona-server'],
      },
      {
        title: 'Batch across conversations',
        benefit: 'A custom runtime may improve accelerator utilization.',
        cost: 'Must preserve state isolation and meet frame deadlines. The shipped locked reference server is not evidence that this feature already exists.',
        sources: ['persona-server'],
      },
      {
        title: 'CPU offload',
        benefit: 'The reference exposes a lower-GPU-memory path.',
        cost: 'Extra host/device traffic can harm audio cadence. Benchmark real-time factor, jitter, and interruption response.',
        sources: ['persona-readme'],
      },
    ],
    measure:
      'Real-time factor below one, audio-frame deadline misses, jitter, turn-taking/interrupt latency, and quality. An 80 ms frame is not an 80 ms end-to-end response claim.',
    boundary:
      'No microphone is opened and no voice is generated. Codec timing comes from public code; public paper training GPU counts are not serving capacity claims.',
  },
  {
    id: 'cosyvoice-2',
    name: 'CosyVoice 2',
    checkpoint: 'FunAudioLLM/CosyVoice2-0.5B',
    maker: 'FunAudioLLM / Alibaba',
    kind: 'tts',
    color: '#e1a4c7',
    tagline: 'Text becomes speech tokens, mel frames, then waveform chunks.',
    request:
      'Read a streamed answer in a reference voice without waiting for the entire paragraph.',
    facts: [
      {
        text: 'The text-speech LM is initialized from Qwen2.5-0.5B. The full TTS pipeline also includes flow and HiFT models.',
        sources: ['cosy-paper', 'cosy-config'],
      },
      {
        text: 'Speech-token rate is 25 Hz; the released configuration uses 24 kHz audio, 80 mel bins, and a token-to-mel ratio of 2.',
        sources: ['cosy-paper', 'cosy-config'],
      },
      {
        text: 'The configuration’s streaming chunk is 25 tokens with 3-token flow lookahead. The runtime can grow its hop from 25 toward 100 tokens.',
        sources: ['cosy-config', 'cosy-runtime'],
      },
      {
        text: 'CosyVoice 2 is a TTS component. A conversational stack needs a separate text generator and, for speech input, an ASR/input path.',
        sources: ['cosy-paper'],
      },
    ],
    stages: [
      {
        title: 'Admit text and voice conditioning',
        short: 'Text + voice prompt',
        input: 'Text chunks, optional reference audio and its text',
        output: 'Normalized text and compatible speaker conditioning',
        detail:
          'The model synthesizes the supplied words. It does not independently decide a conversational answer. In a voice assistant, an upstream LLM and optional ASR have their own latency and scheduling costs.',
        placement:
          'Proposed: a TTS gateway and speaker-conditioning cache keyed by model/version and authorized reference.',
        traffic:
          'Text is small; optional reference audio is encoded at initialization rather than retransmitted for every output chunk.',
        bottleneck:
          'Text normalization, reference preprocessing, and waiting too long for upstream text.',
        sources: ['cosy-paper', 'cosy-readme'],
      },
      {
        title: 'Generate speech tokens',
        short: 'Qwen2.5 · 0.5B',
        input: 'Text tokens and speech-prompt context',
        output: 'Autoregressive semantic speech tokens',
        detail:
          'The paper uses Qwen2.5-0.5B as the text-speech language model. Its output tokens represent speech; they are not the final PCM waveform or a generic text answer.',
        placement:
          'Proposed: batch compatible TTS sessions, while bounding first-chunk delay.',
        traffic:
          'LM weights and autoregressive state are read locally; speech tokens feed the next pipeline phase.',
        bottleneck:
          'A 0.5B LM’s small weight footprint does not include the flow decoder, vocoder, or runtime buffers.',
        sources: ['cosy-paper', 'cosy-config'],
      },
      {
        title: 'Assemble a streaming chunk',
        short: '25 Hz token buffer',
        input: 'New speech tokens and continuing session state',
        output: 'A token chunk plus required lookahead',
        detail:
          'The published default chunk is 25 tokens; at 25 tokens/s it represents one second of speech. That is an audio duration, not one second of compute or first-byte latency. The configuration also requires three lookahead tokens.',
        placement:
          'Proposed: use bounded per-session queues and the model’s compatible chunk/mask configuration.',
        traffic:
          'Compact token buffers stay in the worker; backpressure should stop unbounded synthesis ahead of playout.',
        bottleneck:
          'Too much buffering adds delay; too little can starve the causal flow decoder.',
        sources: ['cosy-config', 'cosy-runtime'],
      },
      {
        title: 'Convert tokens to mel frames',
        short: 'Causal Flow Matching',
        input: 'Speech tokens and speaker/acoustic conditioning',
        output: '80-bin mel frames, two per speech token',
        detail:
          'Chunk-aware causal flow matching produces an acoustic representation. The released configuration maps one speech token to two mel frames and preserves the required left context/lookahead.',
        placement:
          'Proposed: keep LM and flow close when communication would otherwise add to each chunk’s critical path.',
        traffic:
          'Token tensors become substantially richer mel features inside device memory.',
        bottleneck: 'Flow compute, chunk masks, and cached acoustic context.',
        sources: ['cosy-paper', 'cosy-config'],
      },
      {
        title: 'Synthesize waveform chunks',
        short: 'HiFT vocoder',
        input: 'Mel features and vocoder cache',
        output: '24 kHz waveform samples',
        detail:
          'HiFT converts acoustic features into audio. The runtime maintains per-request caches and overlap handling; treating every chunk as an unrelated stateless job risks discontinuities.',
        placement:
          'Proposed: preserve the per-session flow/vocoder caches when scheduling or moving work.',
        traffic:
          'Waveform samples leave device memory for a streaming response.',
        bottleneck:
          'Vocoder timing and boundary continuity, not just LM tokens/s.',
        sources: ['cosy-config', 'cosy-runtime'],
      },
      {
        title: 'Stream and apply backpressure',
        short: 'Client playout',
        input: 'Waveform chunks',
        output: 'Continuous audible speech',
        detail:
          'A client can begin playback before a long answer finishes synthesizing. For live assistants, measure upstream text delay, first audio, steady synthesis, network buffering, and cancellation separately.',
        placement:
          'Proposed: a bounded audio response and playout buffer; release state promptly on cancellation.',
        traffic:
          'The exercise sizes PCM16 mono output. The serving wrapper’s actual encoding and protocol may differ.',
        bottleneck:
          'A slow client can cause buffer growth; a delayed producer causes audible gaps.',
        sources: ['cosy-paper', 'cosy-runtime'],
      },
    ],
    deployment:
      'The deployed unit is the complete text-speech LM → causal flow → HiFT pipeline. A one-GB BF16 calculation for 0.5B parameters covers only the LM weight floor and must not be advertised as the pipeline’s total VRAM.',
    recipes: [
      {
        title: 'CosyVoice 2 zero-shot streaming interface',
        code: 'from cosyvoice.cli.cosyvoice import AutoModel\n\nmodel = AutoModel(\n    model_dir="pretrained_models/CosyVoice2-0.5B")\nfor chunk in model.inference_zero_shot(\n    "Hello, welcome to our service.",\n    "Transcript matching reference.wav",\n    "reference.wav", stream=True):\n    audio_chunk = chunk["tts_speech"]\n    # Consume at model.sample_rate (24,000 Hz).',
        note: 'Adapted from the pinned CosyVoice 2 example. Install its dependencies, download the correct checkpoint, and supply a reference clip with its matching transcript. The complete pipeline yields waveform chunks; the website does not execute it.',
        sources: ['cosy-example', 'cosy-config', 'cosy-readme'],
      },
    ],
    choices: [
      {
        title: 'Streaming compatible chunks',
        benefit: 'Start playback before the entire utterance is complete.',
        cost: 'Chunk masks, lookahead, overlap, and session cache must match the model; shrinking arbitrary chunks is not automatically supported.',
        sources: ['cosy-config', 'cosy-runtime'],
      },
      {
        title: 'Grow later hops',
        benefit:
          'The reference runtime grows from 25 toward 100 tokens to reduce repeated inference overhead.',
        cost: 'Later chunks represent more audio and may add buffering delay. First-chunk and steady-state objectives differ.',
        sources: ['cosy-runtime'],
      },
      {
        title: 'Optimize the complete cascade',
        benefit:
          'Coordinate upstream text, LM batching, flow, and vocoder utilization.',
        cost: 'Accelerating only the 0.5B LM may move the bottleneck to flow, HiFT, or the client.',
        sources: ['cosy-paper', 'cosy-runtime'],
      },
    ],
    measure:
      'First-audio latency, steady-state real-time factor, chunk underruns, cancellation delay, and speech quality; include upstream LLM/ASR separately.',
    boundary:
      'Chunk-size controls are budget exercises, not a claim that every value is compatible with a trained checkpoint. No reference voice or user audio is uploaded.',
  },
]
export function findExample(id: string | null | undefined) {
  return modelExamples.find((x) => x.id === id)
}
export function sourcesForExample(example: ModelExample) {
  const ids = new Set([
    ...example.facts.flatMap((x) => x.sources),
    ...example.stages.flatMap((x) => x.sources),
    ...example.recipes.flatMap((x) => x.sources),
    ...example.choices.flatMap((x) => x.sources),
    ...(example.observations || []).flatMap((x) => x.sources),
  ])
  return [...ids].map((id) => ({ id, ...exampleSources[id] }))
}
