import { journey } from '../content.ts'
import type { Layer, Traffic } from '../content.ts'
import { ANIMATION_DURATION, chapterTime } from '../motion.ts'
import type { Parameters, Strategy } from '../model.ts'
import { pinSpatialCard } from '../spatial.ts'
import type { SpatialPin } from '../spatial.ts'

// Keep explanations beside the subject and clear of the scale and camera rails.
// Once opened, only the tether moves as the camera or payload changes position.
export function pinLearningCard(
  previous: SpatialPin | null,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  cardHeight: number,
  compactTop = 176,
): SpatialPin {
  const pin = pinSpatialCard(previous, key, x, y, width, height, cardHeight)
  const same =
    previous?.key === key &&
    previous.viewportWidth === width &&
    previous.viewportHeight === height
  const compact = height <= 540,
    phone = width <= 700
  const left = phone
    ? 14
    : compact
      ? 150
      : width < 1000 || same
        ? pin.x
        : x <= width * 0.6
          ? width - pin.width - 84
          : 320
  const top = phone
    ? height <= 680
      ? 222
      : 306
    : compact
      ? compactTop
      : Math.max(pin.y, Math.min(182, Math.max(112, height - cardHeight - 168)))
  const cardWidth = phone ? width - 78 : compact ? width - 164 : pin.width
  const attachX = Math.max(left + 18, Math.min(left + cardWidth - 18, x))
  const attachY = Math.max(top + 18, Math.min(top + cardHeight - 18, y))
  return {
    ...pin,
    x: left,
    y: top,
    width: cardWidth,
    tetherLength: Math.hypot(attachX - x, attachY - y),
    tetherAngle: (Math.atan2(attachY - y, attachX - x) * 180) / Math.PI,
  }
}

export function journeyScene(step: number) {
  const index = Math.max(
    0,
    Math.min(6, Math.floor(Number.isFinite(step) ? step : 0)),
  )
  return {
    layer: (index === 3 ? 'gpu' : journey[index].layer) as Layer,
    traffic: (index === 3
      ? 'tensors'
      : index === 4
        ? 'kv'
        : 'requests') as Traffic,
    node: journey[index].node,
    time: chapterTime(
      index === 3 ? 'tensors' : index === 4 ? 'kv' : 'requests',
      index === 3 ? 0 : index === 4 ? 2 : index,
    ),
  }
}
export function adjacentJourneyStage(
  step: number,
  direction: number,
  rag: boolean,
) {
  const next = Math.max(0, Math.min(6, step + (direction < 0 ? -1 : 1)))
  return !rag && next === 1 ? (direction < 0 ? 0 : 2) : next
}
export function collectiveTime(step: number) {
  const n = Math.max(
    0,
    Math.min(14, Math.floor(Number.isFinite(step) ? step : 0)),
  )
  return n === 14 ? ANIMATION_DURATION : (n / 14) * ANIMATION_DURATION + 0.001
}
export function conceptWorld(term: string): {
  layer: Layer
  traffic: Traffic
  node: string
} {
  if (/data parallel/i.test(term))
    return { layer: 'fleet', traffic: 'requests', node: 'scheduler' }
  if (/expert parallel|all-to-all/i.test(term))
    return { layer: 'pod', traffic: 'requests', node: 'fabric' }
  if (/pipeline parallel/i.test(term))
    return { layer: 'rack', traffic: 'requests', node: 'fabric' }
  if (/reduce|gather|parallelism|nccl/i.test(term))
    return { layer: 'rack', traffic: 'collectives', node: 'nvlink' }
  if (/rdma|fabric|network/i.test(term))
    return { layer: 'pod', traffic: 'kv', node: 'fabric' }
  if (/cache|caching|attention|memory|quantization/i.test(term))
    return { layer: 'gpu', traffic: 'kv', node: 'hbm' }
  if (/embedding|tensor/i.test(term))
    return { layer: 'gpu', traffic: 'tensors', node: 'tensor' }
  if (/decode|batch|tpot/i.test(term))
    return { layer: 'pod', traffic: 'requests', node: 'decode' }
  if (/prefill|ttft/i.test(term))
    return { layer: 'pod', traffic: 'requests', node: 'prefill' }
  return { layer: 'fleet', traffic: 'requests', node: 'scheduler' }
}
export function learningScenarioUrl(
  base: string,
  p: Parameters,
  strategy: Strategy,
) {
  const url = new URL(base)
  url.searchParams.set('view', 'lab')
  url.searchParams.set('learn', 'fusion')
  url.searchParams.set('strategy', strategy)
  for (const [key, value] of Object.entries(p))
    url.searchParams.set(key, String(value))
  return url.toString()
}
export function journeyPayload(step: number, prompt: string, p: Parameters) {
  const stage = journey[Math.max(0, Math.min(6, step))]
  return JSON.stringify(
    {
      request_id: 'req_strata_001',
      stage: stage.short,
      representation: stage.payload,
      ...(step === 0
        ? {
            model: 'dense-70b-bf16',
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          }
        : step === 4
          ? {
              layers: 80,
              kv_heads: 8,
              head_dim: 128,
              dtype: 'bf16',
              prompt_tokens: p.inputTokens,
              total_bytes: p.inputTokens * 327680,
              sharding: '8 TP ranks',
            }
          : {
              example: stage.output,
              note: 'Illustrative representation; not an executed model result',
            }),
    },
    null,
    2,
  )
}
