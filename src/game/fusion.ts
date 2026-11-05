import { activeOn, decodeSlots, getGameMetrics } from './model.ts'
import type { GameState, Unit } from './model.ts'

export type FusionLens = 'flow' | 'memory' | 'fabric'
export type CameraView = 'overview' | 'top' | 'orbit'

export const FUSION_LENSES: Record<
  FusionLens,
  { name: string; color: string; description: string }
> = {
  flow: {
    name: 'Request flow',
    color: '#c9ee87',
    description:
      'Rings show occupied compute slots. Follow a payload from admission to its answer.',
  },
  memory: {
    name: 'KV memory',
    color: '#74d4d3',
    description:
      'Rings show reserved KV as a fraction of the pooled budget, including future output.',
  },
  fabric: {
    name: 'Network fabric',
    color: '#efb07a',
    description:
      'Rings show each engine’s share of active KV transfers. Switches show shared-link activity.',
  },
}

export function moduleTelemetry(
  state: GameState,
  unit: Unit,
  lens: FusionLens,
) {
  const m = getGameMetrics(state)
  if (unit.offlineUntil > state.time)
    return {
      ratio: 0,
      value: `${Math.ceil(unit.offlineUntil - state.time)}s`,
      label: 'Cooling fault',
      detail: 'Repair this engine or wait for recovery.',
      color: '#f08c83',
    }
  if (lens === 'memory' || (lens === 'flow' && unit.type === 'cache')) {
    const used =
      unit.type === 'cache'
        ? m.used
        : state.jobs
            .filter(
              (j) =>
                j.phase !== 'queued' &&
                j.phase !== 'done' &&
                (unit.type === 'prefill'
                  ? j.prefillId === unit.id
                  : unit.type === 'decode'
                    ? j.decodeId === unit.id
                    : j.phase === 'transfer'),
            )
            .reduce((sum, j) => sum + j.kvMiB, 0)
    const ratio = Math.min(1, used / m.memory)
    return {
      ratio,
      value: `${Math.round(used).toLocaleString()} MiB`,
      label:
        unit.type === 'cache' ? 'Pooled KV reserved' : 'Associated KV reserved',
      detail: `${Math.round(ratio * 100)}% of ${m.memory.toLocaleString()} MiB pooled capacity`,
      color: ratio > 0.85 ? '#f0b087' : FUSION_LENSES.memory.color,
    }
  }
  if (lens === 'fabric' || unit.type === 'fabric') {
    const count =
      unit.type === 'fabric'
        ? m.transfers
        : state.jobs.filter(
            (j) =>
              j.phase === 'transfer' &&
              (j.prefillId === unit.id || j.decodeId === unit.id),
          ).length
    const ratio = m.transfers ? count / m.transfers : 0
    return {
      ratio,
      value: `${Math.round(m.bandwidth * 0.7 * ratio)} Gb/s`,
      label: 'Useful fabric share',
      detail: `${count} active handoff${count === 1 ? '' : 's'} · ${m.bandwidth} Gb/s shared line rate`,
      color: FUSION_LENSES.fabric.color,
    }
  }
  const active = activeOn(state, unit.id),
    slots = unit.type === 'decode' ? decodeSlots(state, unit) : 1
  return {
    ratio: Math.min(1, active / slots),
    value: `${active} / ${slots}`,
    label: 'Occupied request slots',
    detail:
      unit.type === 'decode'
        ? 'KV handoffs reserve a slot before decoding starts.'
        : 'An idle prefill engine can admit another request.',
    color: FUSION_LENSES.flow.color,
  }
}

export function placeSpatialCard(
  x: number,
  y: number,
  width: number,
  height: number,
  cardHeight: number,
) {
  const narrow = width < 700,
    margin = narrow ? 14 : 24
  const cardWidth = Math.min(narrow ? 344 : 312, width - margin * 2)
  const maxY = Math.max(112, height - cardHeight - 168)
  const preferredX = x + 54
  const rightEdge = width - cardWidth - (narrow ? margin : 84)
  const left = narrow
    ? (width - cardWidth) / 2
    : Math.max(
        margin,
        Math.min(
          rightEdge,
          preferredX > rightEdge ? x - cardWidth - 54 : preferredX,
        ),
      )
  const top = narrow
    ? maxY
    : Math.max(118, Math.min(maxY, y - cardHeight * 0.38))
  const attachX = Math.max(left + 18, Math.min(left + cardWidth - 18, x))
  const attachY = Math.max(top + 18, Math.min(top + cardHeight - 18, y))
  return {
    x: left,
    y: top,
    width: cardWidth,
    tetherLength: Math.hypot(attachX - x, attachY - y),
    tetherAngle: (Math.atan2(attachY - y, attachX - x) * 180) / Math.PI,
  }
}

export function serviceHint(state: GameState) {
  const m = getGameMetrics(state)
  if (!state.units.some((u) => u.type === 'prefill'))
    return 'Select a hex. Build a prefill engine to turn prompts into model state.'
  if (!state.units.some((u) => u.type === 'decode'))
    return 'Add a decode engine. Prefill creates state; decode turns it into an answer.'
  if (state.units.some((u) => u.offlineUntil > state.time))
    return 'A cooling fault interrupted the flow. Select the red engine to repair it.'
  if (m.used / m.memory > 0.85)
    return 'Memory is holding up admission. Add a KV bank or upgrade an existing one.'
  if (m.transfers > 2)
    return 'KV handoffs are stacking up. Add shared fabric bandwidth.'
  if (m.queued > 4)
    return 'The queue is growing. Inspect occupied rings to find the constrained phase.'
  return 'The path is open. Select a request to see its state, or ride alongside it.'
}

export interface SpatialPin {
  key: string
  viewportWidth: number
  viewportHeight: number
  x: number
  y: number
  width: number
  tetherLength: number
  tetherAngle: number
}

// The anchor moves in the world; actionable controls stay where they opened.
export function pinSpatialCard(
  previous: SpatialPin | null,
  key: string,
  x: number,
  y: number,
  width: number,
  height: number,
  cardHeight: number,
): SpatialPin {
  const fresh = placeSpatialCard(x, y, width, height, cardHeight)
  const same =
    previous?.key === key &&
    previous.viewportWidth === width &&
    previous.viewportHeight === height
  const left = same ? previous.x : fresh.x
  const top = same
    ? Math.max(112, Math.min(previous.y, height - cardHeight - 168))
    : fresh.y
  const attachX = Math.max(left + 18, Math.min(left + fresh.width - 18, x))
  const attachY = Math.max(top + 18, Math.min(top + cardHeight - 18, y))
  return {
    key,
    viewportWidth: width,
    viewportHeight: height,
    x: left,
    y: top,
    width: fresh.width,
    tetherLength: Math.hypot(attachX - x, attachY - y),
    tetherAngle: (Math.atan2(attachY - y, attachX - x) * 180) / Math.PI,
  }
}
