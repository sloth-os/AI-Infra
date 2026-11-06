import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { ArrowRight, Box, Network, ScanLine, X } from 'lucide-react'
import { details, layerNodes } from '../content'
import { duration } from '../model'
import { getMotionFrame } from '../motion'
import type { CameraView, MotionFrame } from '../motion'
import { InfrastructureEngine } from '../scene/engine'
import type { PayloadInspection, SceneOptions } from '../scene/engine'
import type { SceneLabel } from '../scene/architecture'
import { useEffectsQuality } from './VisualSettings'

export interface SceneHandle {
  reset: () => void
  zoom: (direction: number) => void
  focus: (id: string) => void
  view: (view: CameraView) => void
  seek: (seconds: number) => void
  getFrame: () => MotionFrame
  getView: () => CameraView
  inspectPacket: () => void
  rotate: (direction: number) => void
}
export interface InfrastructureSceneProps extends SceneOptions {
  onFrame?: (frame: MotionFrame) => void
  compact?: boolean
  initialTime?: number
  testId?: string
  onProject?: (key: string, x: number, y: number, visible: boolean) => void
  onInspection?: (value: PayloadInspection | null) => void
  onUnavailable?: () => void
  onContextInspect?: () => void
}

export const InfrastructureScene = forwardRef<
  SceneHandle,
  InfrastructureSceneProps
>(function InfrastructureScene(props, ref) {
  const quality = useEffectsQuality()
  const host = useRef<HTMLDivElement>(null)
  const runtime = useRef<InfrastructureEngine | null>(null)
  const latest = useRef(props)
  latest.current = { ...props, effects: props.effects || quality }
  const [fallback, setFallback] = useState(false)
  const [labels, setLabels] = useState<SceneLabel[]>([])
  const [frame, setFrame] = useState(() =>
    getMotionFrame(
      props.initialTime || 0,
      props.traffic,
      props.params,
      props.strategy,
    ),
  )
  const frameRef = useRef(frame)
  const [inspection, setInspection] = useState<PayloadInspection | null>(null)
  const labelElements = useRef<Map<string, HTMLButtonElement>>(new Map())

  useImperativeHandle(
    ref,
    () => ({
      reset: () => runtime.current?.reset(),
      zoom: (direction) => runtime.current?.zoom(direction),
      focus: (id) => runtime.current?.focus(id),
      view: (view) => runtime.current?.setView(view),
      seek: (seconds) => {
        if (runtime.current) runtime.current.seek(seconds)
        else {
          const next = getMotionFrame(
            seconds,
            latest.current.traffic,
            latest.current.params,
            latest.current.strategy,
          )
          frameRef.current = next
          setFrame(next)
          latest.current.onFrame?.(next)
        }
      },
      getFrame: () => runtime.current?.getFrame() || frameRef.current,
      getView: () => runtime.current?.getView() || 'isometric',
      inspectPacket: () => runtime.current?.inspectPacket(),
      rotate: (d) => runtime.current?.rotate(d),
    }),
    [],
  )

  useEffect(() => {
    if (props.active === false || fallback || !host.current || runtime.current)
      return
    try {
      const engine = new InfrastructureEngine(
        host.current,
        () => latest.current,
        {
          labels: setLabels,
          frame: (next) => {
            frameRef.current = next
            setFrame(next)
            latest.current.onFrame?.(next)
          },
          project: (key, x, y, visible) => {
            latest.current.onProject?.(key, x, y, visible)
            const element = labelElements.current.get(key)
            if (!element) return
            element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`
            element.style.opacity = visible ? '1' : '0'
            element.style.pointerEvents = visible ? 'auto' : 'none'
            if (element.getAttribute('aria-hidden') !== String(!visible))
              element.setAttribute('aria-hidden', String(!visible))
            element.tabIndex = visible ? 0 : -1
          },
          inspect: (next) => {
            setInspection(next)
            latest.current.onInspection?.(next)
          },
          contextLost: () => {
            runtime.current?.dispose()
            runtime.current = null
            setFallback(true)
            latest.current.onUnavailable?.()
          },
        },
      )
      runtime.current = engine
      engine.seek(frameRef.current.time)
      if (latest.current.immersive) engine.enter()
    } catch {
      setFallback(true)
      latest.current.onUnavailable?.()
    }
  }, [props.active, fallback])
  useEffect(
    () => () => {
      runtime.current?.dispose()
      runtime.current = null
    },
    [],
  )

  useEffect(() => {
    if (props.initialTime !== undefined)
      runtime.current?.seek(props.initialTime)
  }, [props.initialTime])

  useEffect(() => {
    if (runtime.current) return
    const next = getMotionFrame(
      frameRef.current.time,
      props.traffic,
      props.params,
      props.strategy,
    )
    frameRef.current = next
    setFrame(next)
    latest.current.onFrame?.(next)
  }, [props.traffic, props.params, props.strategy])
  useEffect(() => {
    if (
      !fallback ||
      props.context ||
      props.active === false ||
      props.paused ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const timer = window.setInterval(() => {
      if (document.hidden) return
      const time =
        (frameRef.current.time + 0.18 * (latest.current.speed || 1)) % 48
      const next = getMotionFrame(
        time,
        latest.current.traffic,
        latest.current.params,
        latest.current.strategy,
      )
      frameRef.current = next
      setFrame(next)
      latest.current.onFrame?.(next)
    }, 180)
    return () => clearInterval(timer)
  }, [fallback, props.active, props.paused, props.context])

  useEffect(() => {
    if (
      !fallback ||
      props.active === false ||
      !props.context?.playing ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return
    const timer = setInterval(() => {
      if (!document.hidden) {
        const p = latest.current,
          c = p.context
        if (c) p.onContextStep?.((c.stage + 1) % c.steps.length, true)
      }
    }, props.context.duration * 1000)
    return () => clearInterval(timer)
  }, [fallback, props.active, props.context])

  return (
    <div
      ref={host}
      className={`infrastructure-scene enhanced-scene ${props.compact ? 'compact-scene' : ''} ${fallback ? 'scene-fallback' : ''}`}
      data-testid={props.testId || 'infrastructure-scene'}
      data-motion-mode={props.traffic}
      data-context-kind={props.context?.kind || ''}
      data-context-id={props.context?.id || ''}
      data-context-stage={props.context?.stage ?? ''}
      data-context-pattern={props.context?.pattern || ''}
      data-world-kind={
        !props.context && props.traffic === 'tensors'
          ? 'transformer'
          : 'infrastructure'
      }
      data-motion-layer={props.layer}
      data-motion-time={frame.time.toFixed(1)}
    >
      {!fallback &&
        labels.map((label) => {
          const key = label.key || label.id
          const moving = key === 'moving-payload'
          let title = label.title,
            subtitle = label.subtitle
          if (moving) {
            title =
              props.traffic === 'kv'
                ? `KV shard · ${(frame.shardMiB || ((props.params?.inputTokens || 2048) * 327680) / 2 ** 20 / 8).toFixed(1)} MiB / rank`
                : props.traffic === 'collectives'
                  ? `Chunk in flight · exchange ${frame.collectiveStep} / 14`
                  : props.traffic === 'tensors'
                    ? `Activation · ${frame.chapter.short}`
                    : 'req_A · an independent sequence'
            subtitle =
              props.traffic === 'kv'
                ? props.layer === 'gpu' || props.layer === 'rack'
                  ? `${frame.contextTokens.toLocaleString()} positions · local memory movement`
                  : `${duration(frame.transferMs)} modeled full-prompt handoff`
                : props.traffic === 'requests'
                  ? frame.chapter.payload
                  : 'Click the parcel to inspect its data'
          } else if (label.rank !== undefined) {
            const chunk =
              frame.collectiveStep > 0 && frame.collectiveStep < 8
                ? (label.rank - frame.collectiveStep + 16) % 8
                : (label.rank + 1) % 8
            const full = frame.contributions[label.rank].filter(
              (n) => n === 8,
            ).length
            subtitle =
              frame.collectiveStep >= 7
                ? `Σ = 36 · ${full}/8 chunks complete`
                : `C${chunk} = ${frame.buffers[label.rank][chunk]} · ${frame.contributions[label.rank][chunk]}/8 contributions`
          } else if (!props.context && key === 'kv-bank') {
            subtitle = `${frame.shardMiB.toFixed(1)} MiB / rank · ${frame.contextTokens.toLocaleString()} positions`
          }
          return (
            <button
              key={key}
              ref={(el) => {
                if (el) labelElements.current.set(key, el)
                else labelElements.current.delete(key)
              }}
              className={`scene-label ${props.selected === label.id ? 'is-selected' : ''} ${label.context ? 'context-focus-label' : ''} ${moving ? 'moving-payload-label' : ''} ${label.stage === frame.chapterIndex && props.traffic === 'tensors' ? 'active-tensor-stage' : ''}`}
              onClick={() => {
                if (label.context) props.onContextInspect?.()
                else if (moving) runtime.current?.inspectPacket()
                else if (props.immersive && label.rank !== undefined)
                  props.onRank?.(label.rank)
                else {
                  props.onSelect(label.id)
                  if (!props.immersive)
                    runtime.current?.focus(label.id, label.position)
                }
              }}
              aria-label={
                label.context
                  ? `Inspect context: ${label.title}`
                  : moving
                    ? 'Inspect moving payload'
                    : `Inspect ${title}`
              }
            >
              <span
                className="scene-label-dot"
                style={{
                  background: moving
                    ? frame.chapter.color
                    : label.context
                      ? props.context?.color
                      : details[label.id]?.color || '#b8d299',
                }}
              />
              <span>
                {label.stage !== undefined && (
                  <b className="tensor-stage-number">
                    {String(label.stage + 1).padStart(2, '0')}{' '}
                  </b>
                )}
                {title}
                <small>{subtitle}</small>
              </span>
              {moving && <ScanLine size={12} />}
            </button>
          )
        })}
      {!fallback && !props.immersive && (
        <div className="motion-telemetry" aria-label="Animation state">
          <div className="motion-telemetry-phase">
            <span
              className="telemetry-indicator"
              style={{ background: frame.chapter.color }}
            />
            <span className="telemetry-kicker">
              {props.traffic === 'tensors'
                ? 'INSIDE A TRANSFORMER'
                : props.traffic === 'collectives'
                  ? 'RANKS EXCHANGE ACTUAL PARTIAL SUMS'
                  : 'ANIMATED DATA PLANE'}
            </span>
            <strong>{frame.chapter.title}</strong>
          </div>
          <div className="motion-telemetry-stats">
            <span>
              <small>
                {props.traffic === 'collectives'
                  ? 'EXCHANGE'
                  : props.layer === 'gpu' && props.traffic !== 'tensors'
                    ? 'KV / RANK'
                    : 'KV / TP GROUP'}
              </small>
              <b>
                {props.traffic === 'collectives'
                  ? `${frame.collectiveStep} / 14`
                  : `${(props.layer === 'gpu' && props.traffic !== 'tensors' ? frame.shardMiB : frame.cacheMiB).toFixed(0)} MiB`}
              </b>
            </span>
            <span>
              <small>
                {props.traffic === 'kv'
                  ? props.layer === 'gpu' || props.layer === 'rack'
                    ? 'MEMORY PATH'
                    : 'HANDOFF ESTIMATE'
                  : 'REPRESENTATION'}
              </small>
              <b>
                {props.traffic === 'kv'
                  ? props.layer === 'gpu' || props.layer === 'rack'
                    ? 'HBM ↔ compute'
                    : duration(frame.transferMs)
                  : props.traffic === 'tensors'
                    ? 'BF16 · TP = 8'
                    : props.traffic === 'collectives'
                      ? '8 ranks · 8 chunks'
                      : `${frame.generatedTokens} / ${props.params?.outputTokens || 256} tokens`}
              </b>
            </span>
            <span className={frame.load >= 1 ? 'telemetry-overload' : ''}>
              <small>MODELED FLEET LOAD</small>
              <b>{Math.round(frame.load * 100)}%</b>
            </span>
          </div>
        </div>
      )}
      {!fallback && !props.immersive && inspection && (
        <aside
          className="payload-inspection"
          aria-label="Inspected data parcel"
        >
          <button
            className="payload-inspection-close"
            onClick={() => setInspection(null)}
            aria-label="Close payload inspection"
          >
            <X size={14} />
          </button>
          <span className="small-label">
            <Box size={13} /> PAYLOAD SNAPSHOT · {inspection.time.toFixed(1)} s
          </span>
          <h4>{inspection.title}</h4>
          <strong>{inspection.size}</strong>
          <span className="payload-transport">
            <Network size={12} />
            {inspection.transport}
          </span>
          <p>{inspection.explanation}</p>
          <code>{inspection.formula}</code>
        </aside>
      )}
      {fallback && (
        <div className="fallback-topology">
          <span className="eyebrow">INTERACTIVE TOPOLOGY · 2D FALLBACK</span>
          <h3>
            {props.layer === 'gpu'
              ? 'Inside an accelerator'
              : 'A connected serving system'}
          </h3>
          <p>
            3D rendering is unavailable on this device. The same infrastructure
            levels, component controls, connected stories and source-backed
            experiments remain available.
          </p>
          <div>
            {layerNodes[props.layer].map((id) => (
              <button
                key={id}
                onClick={() => props.onSelect(id)}
                className={props.selected === id ? 'active' : ''}
                style={{ borderColor: details[id].color }}
              >
                {details[id].title}
              </button>
            ))}
          </div>
          {props.context && (
            <p className="fallback-context-description">
              {props.context.heading}: {props.context.explanation}
            </p>
          )}
          <div className="fallback-motion-phase">
            <strong>{props.context?.title || frame.chapter.title}</strong>
            <ArrowRight size={16} />
            <span>{props.context?.payload || frame.chapter.payload}</span>
          </div>
        </div>
      )}
    </div>
  )
})
