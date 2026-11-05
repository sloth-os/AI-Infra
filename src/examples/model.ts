import { findExample } from './catalog.ts'
import type { ExampleId } from './catalog.ts'

export interface ExampleInputs {
  tokens: number
  resolution: number
  steps: number
  seconds: number
  sessions: number
  hop: number
}
export interface ExampleView {
  id: ExampleId
  stage: number
  playing: boolean
  inputs: ExampleInputs
}
export interface Budget {
  label: string
  value: string
  unit: string
  formula: string
  note: string
}
export function defaultExampleInputs(id: ExampleId): ExampleInputs {
  return {
    tokens: 128,
    resolution: 2048,
    steps: 40,
    seconds: id === 'minimax-h3' ? 6 : 60,
    sessions: 10,
    hop: 25,
  }
}
function clamp(value: unknown, min: number, max: number, fallback: number) {
  const n = Number(value)
  return value === null || value === undefined || !Number.isFinite(n)
    ? fallback
    : Math.max(min, Math.min(max, Math.round(n)))
}
export function sanitizeExampleInputs(
  id: ExampleId,
  value: Partial<ExampleInputs>,
): ExampleInputs {
  const d = defaultExampleInputs(id)
  const resolution = clamp(value.resolution, 512, 2048, d.resolution)
  return {
    tokens: clamp(value.tokens, 1, 4096, d.tokens),
    resolution: [512, 1024, 2048].reduce(
      (a, b) => (Math.abs(b - resolution) < Math.abs(a - resolution) ? b : a),
      2048,
    ),
    steps: clamp(value.steps, 4, 60, d.steps),
    seconds: clamp(
      value.seconds,
      id === 'minimax-h3' ? 4 : 5,
      id === 'minimax-h3' ? 15 : 300,
      d.seconds,
    ),
    sessions: clamp(value.sessions, 1, 1000, d.sessions),
    hop: Math.round(clamp(value.hop, 25, 100, d.hop) / 25) * 25,
  }
}
export function exampleStage(stage: number, direction = 0) {
  return Math.max(
    0,
    Math.min(5, Math.trunc(Number.isFinite(stage) ? stage : 0) + direction),
  )
}
export function parseExampleLocation(href: string): ExampleView | null {
  const search = new URL(href).searchParams,
    example = findExample(search.get('example'))
  if (!example) return null
  const d = defaultExampleInputs(example.id),
    input: Partial<ExampleInputs> = {}
  for (const key of Object.keys(d) as (keyof ExampleInputs)[]) {
    const value = search.get(`ex_${key}`)
    if (value !== null) input[key] = Number(value)
  }
  return {
    id: example.id,
    stage: exampleStage(Number(search.get('stage'))),
    playing: false,
    inputs: sanitizeExampleInputs(example.id, input),
  }
}
export function exampleUrl(base: string, view: ExampleView) {
  const url = new URL(base)
  url.searchParams.delete('examples')
  if (
    !['explore', 'guide', 'lab', 'journey'].includes(
      url.searchParams.get('view') || '',
    )
  )
    url.searchParams.set('view', 'guide')
  url.searchParams.set('learn', 'fusion')
  url.searchParams.set('example', view.id)
  url.searchParams.set('stage', String(exampleStage(view.stage)))
  for (const [key, value] of Object.entries(
    sanitizeExampleInputs(view.id, view.inputs),
  ))
    url.searchParams.set(`ex_${key}`, String(value))
  return url.toString()
}
const num = (n: number, digits = 0) =>
  n.toLocaleString('en-US', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  })
export function exampleBudgets(id: ExampleId, raw: ExampleInputs): Budget[] {
  const p = sanitizeExampleInputs(id, raw)
  switch (id) {
    case 'kimi-k3':
      return [
        {
          label: 'Expert assignments / MoE layer',
          value: num(p.tokens * 16),
          unit: 'visits',
          formula: `${num(p.tokens)} token positions × 16 routed experts`,
          note: 'Assignment count only; two shared experts and non-expert work are additional. No activation-byte or throughput estimate.',
        },
        {
          label: 'Routed experts selected / token',
          value: num((16 / 896) * 100, 2),
          unit: '%',
          formula: '16 ÷ 896 × 100',
          note: 'A routing fraction, not GPU utilization or the fraction of all parameters active.',
        },
        {
          label: 'Attention-layer mix',
          value: '69 / 24',
          unit: 'KDA / full',
          formula: '93 published layers: 69 KDA + 24 full-attention layers',
          note: 'Different state pools. The dense 70B lab’s KV formula is not used for K3.',
        },
      ]
    case 'qwen-image-21':
      return [
        {
          label: 'Raw RGBA8 output',
          value: num((p.resolution * p.resolution * 4) / 2 ** 20, 2),
          unit: 'MiB',
          formula: `${p.resolution} × ${p.resolution} pixels × 4 channels × 1 byte`,
          note: 'Before image compression. This is neither PNG size nor peak VRAM.',
        },
        {
          label: 'Relative pixel-steps',
          value: num(((p.resolution / 1024) ** 2 * p.steps) / 40, 2),
          unit: '×',
          formula: `(${p.resolution} ÷ 1,024)² × (${p.steps} ÷ 40)`,
          note: 'Relative to 1024² at 40 steps. A work index, not measured latency, FLOPs, or a quality score.',
        },
        {
          label: '7B generator BF16 floor',
          value: num((7e9 * 2) / 2 ** 30, 2),
          unit: 'GiB',
          formula: '7,000,000,000 visual-generator parameters × 2 bytes',
          note: 'Approximate parameter-count floor only; excludes conditioning encoder, VAE, activations, and runtime overhead.',
        },
      ]
    case 'minimax-h3':
      return [
        {
          label: 'Nominal output frames',
          value: num(p.seconds * 24),
          unit: 'frames',
          formula: `${p.seconds} seconds × 24 FPS`,
          note: 'An output-frame budget; internal temporal padding and latent frame counts are separate.',
        },
        {
          label: 'Example raw RGB video',
          value: num((1280 * 768 * 3 * p.seconds * 24) / 2 ** 20, 2),
          unit: 'MiB',
          formula: `1,280 × 768 × 3 bytes × ${p.seconds * 24} frames`,
          note: 'A chosen 1280×768 RGB8 example, not a fixed H3 aspect ratio. Before compression; excludes audio.',
        },
        {
          label: 'Stereo PCM16 audio',
          value: num((32000 * 2 * 2 * p.seconds) / 2 ** 20, 2),
          unit: 'MiB',
          formula: `32,000 samples/s × 2 channels × 2 bytes × ${p.seconds} s`,
          note: 'A PCM16 budget exercise. Actual muxed clip size depends on output codecs and settings.',
        },
      ]
    case 'minimax-music-3':
      return [
        {
          label: 'Maximum generation frames',
          value: num(p.seconds * 25),
          unit: 'frames',
          formula: `${p.seconds} seconds × 25 audio frames/s`,
          note: 'A frame cap for the local example; end-of-audio can finish earlier. These are not text tokens.',
        },
        {
          label: 'Local stereo PCM16 payload',
          value: num((32000 * 2 * 2 * p.seconds) / 2 ** 20, 2),
          unit: 'MiB',
          formula: `32,000 × 2 channels × 2 bytes × ${p.seconds} seconds`,
          note: 'Raw payload before WAV headers. The hosted API’s MP3/hex example uses a separate output configuration.',
        },
        {
          label: 'Audio payload rate',
          value: '128',
          unit: 'kB/s',
          formula: '32,000 × 2 × 2 = 128,000 bytes/s',
          note: 'Decimal kB/s for uncompressed PCM16; this is a delivery budget, not model generation speed.',
        },
      ]
    case 'personaplex':
      return [
        {
          label: 'Codec frame',
          value: '80',
          unit: 'ms',
          formula:
            '1,000 ms ÷ 12.5 frames/s = 80 ms; 24,000 ÷ 12.5 = 1,920 samples',
          note: 'Published codec cadence, not the model’s end-to-end response latency.',
        },
        {
          label: 'Duplex PCM16 equivalent',
          value: num((24000 * 2 * 2 * p.sessions * 8) / 1e6, 2),
          unit: 'Mb/s',
          formula: `24,000 × 2 bytes × 2 directions × ${p.sessions} sessions × 8`,
          note: 'Raw mono PCM16 in each direction. Actual WebSocket transport is compressed Opus with variable bitrate.',
        },
        {
          label: 'Reference-worker session slots',
          value: num(p.sessions),
          unit: 'slots',
          formula: `${p.sessions} simultaneous sessions ÷ 1 active session per locked reference worker`,
          note: 'Worker slots, not GPU count. A batched runtime requires its own capacity and deadline validation.',
        },
      ]
    case 'cosyvoice-2':
      return [
        {
          label: 'Audio represented by a chunk',
          value: num(p.hop / 25, 2),
          unit: 's',
          formula: `${p.hop} speech tokens ÷ 25 speech tokens/s`,
          note: 'Audio duration, not compute time or first-audio latency. These are budget exercises; actual masks/chunks must match the model.',
        },
        {
          label: 'Chunk PCM16 mono payload',
          value: num(((p.hop / 25) * 24000 * 2) / 1024, 2),
          unit: 'KiB',
          formula: `(${p.hop} ÷ 25) s × 24,000 samples/s × 2 bytes`,
          note: 'Before response framing. The wrapper may use a different output encoding.',
        },
        {
          label: 'Mel frames per chunk',
          value: num(p.hop * 2),
          unit: 'frames',
          formula: `${p.hop} speech tokens × 2 mel frames/token; each frame has 80 bins`,
          note: 'The config also needs 3 lookahead tokens; reference-prompt alignment can require additional padding.',
        },
      ]
  }
}
export function examplePayload(view: ExampleView, prompt: string) {
  const e = findExample(view.id)!,
    p = sanitizeExampleInputs(view.id, view.inputs)
  const body =
    view.id === 'kimi-k3'
      ? {
          model: e.checkpoint,
          messages: [{ role: 'user', content: prompt }],
          stream: true,
          reasoning_effort: 'low',
        }
      : view.id === 'qwen-image-21'
        ? {
            pipeline: 'QwenImage21Pipeline',
            checkpoint: e.checkpoint,
            kwargs: {
              prompt,
              width: p.resolution,
              height: p.resolution,
              num_inference_steps: p.steps,
            },
          }
        : view.id === 'minimax-h3'
          ? {
              checkpoint: e.checkpoint,
              model_variant: 'fl2va',
              example_job: {
                prompt,
                seconds: p.seconds,
                fps: 24,
                resolution: '768p',
              },
            }
          : view.id === 'minimax-music-3'
            ? {
                model: e.checkpoint,
                input:
                  '[Verse]\nMorning light filtering through the pine\n[Chorus]\nSoftly the world begins to breathe',
                instructions: prompt,
                max_new_tokens: p.seconds * 25,
                response_format: 'wav',
                stream: false,
              }
            : view.id === 'personaplex'
              ? {
                  reference_server: 'moshi.server',
                  session_explanation: {
                    text_prompt: prompt,
                    voice_prompt: 'NATF2.pt',
                    transport: 'WebSocket / Opus',
                    sample_rate: 24000,
                    codec_frame_ms: 80,
                  },
                }
              : {
                  checkpoint: e.checkpoint,
                  method: 'inference_zero_shot',
                  example_args: {
                    tts_text: prompt,
                    prompt_text: 'Transcript of the reference clip',
                    prompt_speech: 'reference.wav',
                    stream: true,
                  },
                  output_sample_rate: 24000,
                }
  return JSON.stringify(body, null, 2)
}
