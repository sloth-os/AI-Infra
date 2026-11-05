import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { Cpu } from 'lucide-react'
import * as THREE from 'three'
import { GameRenderer } from './scene'
import type { GameSceneOptions } from './scene'
import { MODULES, PADS, activeOn, getGameMetrics } from './model'
import { REQUEST_STAGES } from './RequestLens'
import { kvBytes } from '../model'
import { FUSION_LENSES, moduleTelemetry } from './fusion'
import type { CameraView } from './fusion'

export interface GameSceneHandle {
  reset: () => void
  zoom: (direction: number) => void
  rotate: (direction: number) => void
  enter: () => void
  view: (view: CameraView) => void
  focus: (pad: number) => void
}

export const GameScene = forwardRef<GameSceneHandle, GameSceneOptions>(
  function GameScene(props, ref) {
    const host = useRef<HTMLDivElement>(null),
      runtime = useRef<GameRenderer | null>(null),
      latest = useRef(props)
    latest.current = props
    const labels = useRef<Map<string, HTMLButtonElement>>(new Map())
    const [fallback, setFallback] = useState(false)
    const [annotations, setAnnotations] = useState<
      {
        id: string
        title: string
        subtitle: string
        position: THREE.Vector3
        pad: number | null
        color: string
      }[]
    >([])
    useImperativeHandle(
      ref,
      () => ({
        reset: () => runtime.current?.reset(),
        zoom: (d) => runtime.current?.zoom(d),
        rotate: (d) => runtime.current?.rotate(d),
        enter: () => runtime.current?.enter(),
        view: (view) => runtime.current?.view(view),
        focus: (pad) => runtime.current?.focus(pad),
      }),
      [],
    )
    const focused = props.state.jobs.find((j) => j.id === props.focusedJob)
    const metrics = getGameMetrics(props.state)
    useEffect(() => {
      if (fallback || !props.active || !host.current || runtime.current) return
      try {
        runtime.current = new GameRenderer(host.current, () => latest.current, {
          labels: setAnnotations,
          project: (id, x, y, visible) => {
            latest.current.onProject(id, x, y, visible)
            const el = labels.current.get(id)
            if (!el) return
            el.style.transform = `translate(-50%,-100%) translate(${x}px,${y}px)`
            el.style.opacity = visible ? '1' : '0'
            el.style.pointerEvents = visible ? 'auto' : 'none'
            el.tabIndex = visible ? 0 : -1
            el.setAttribute('aria-hidden', String(!visible))
          },
          lost: () => {
            setFallback(true)
            latest.current.onUnavailable()
            runtime.current?.dispose()
            runtime.current = null
          },
        })
      } catch {
        setFallback(true)
        latest.current.onUnavailable()
      }
    }, [props.active, fallback])
    useEffect(
      () => () => {
        runtime.current?.dispose()
        runtime.current = null
      },
      [],
    )
    return (
      <div className="game-scene" ref={host} data-testid="game-scene">
        {props.fusion &&
          !fallback &&
          props.state.phase !== 'briefing' &&
          PADS.filter(
            (p) => !props.state.units.some((u) => u.pad === p.id),
          ).map((pad) => (
            <button
              key={`pad-${pad.id}`}
              ref={(el) => {
                if (el) labels.current.set(`pad-${pad.id}`, el)
                else labels.current.delete(`pad-${pad.id}`)
              }}
              className={`fusion-pad-tag ${props.tool ? 'can-build' : ''}`}
              aria-label={`Sector ${pad.name}: empty`}
              onClick={() => props.onPad(pad.id)}
            >
              <span>
                <b>+</b>
                {pad.name}
              </span>
            </button>
          ))}
        {!fallback && focused && (
          <button
            className="game-world-label game-request-label"
            ref={(el) => {
              if (el) labels.current.set('request', el)
              else labels.current.delete('request')
            }}
            onClick={() => props.onRequest(focused.id)}
            aria-label={`Follow request ${focused.id}`}
          >
            <i />
            <span>
              REQ {String(focused.id).padStart(3, '0')} ·{' '}
              {focused.phase === 'done' && focused.generated < focused.output
                ? 'TIMED OUT'
                : REQUEST_STAGES[focused.phase].label.toUpperCase()}
              <small>
                {focused.phase === 'transfer'
                  ? `${(kvBytes(focused.input) / 2 ** 20).toFixed(0)} MiB KV payload`
                  : focused.phase === 'decode'
                    ? `${Math.floor(focused.generated)} / ${focused.output} output tokens`
                    : `${focused.input.toLocaleString()} prompt tokens · tenant ${focused.tenant + 1}`}
              </small>
            </span>
          </button>
        )}
        {!fallback &&
          annotations.map((label) => {
            const u = props.state.units.find((u) => u.pad === label.pad),
              offline = u && u.offlineUntil > props.state.time
            return (
              <button
                key={label.id}
                ref={(el) => {
                  if (el) labels.current.set(label.id, el)
                  else labels.current.delete(label.id)
                }}
                className={`game-world-label ${props.selected === label.pad && label.pad !== null ? 'selected' : ''} ${offline ? 'offline' : ''}`}
                aria-label={
                  props.fusion && u
                    ? `Sector ${PADS[u.pad].name}: ${MODULES[u.type].name}`
                    : `Inspect ${label.title}`
                }
                onClick={() =>
                  label.pad !== null
                    ? props.onPad(label.pad)
                    : props.fusion && props.onRequest(focused?.id ?? 0)
                }
                style={
                  {
                    '--module-color': label.color,
                    '--lens-color': FUSION_LENSES[props.lens].color,
                  } as React.CSSProperties
                }
              >
                <i />
                <span>
                  {label.title}
                  <small>
                    {offline
                      ? 'COOLING FAULT'
                      : u
                        ? u.type === 'cache'
                          ? `${Math.round(metrics.used)} / ${metrics.memory} MiB pooled`
                          : u.type === 'fabric'
                            ? `${metrics.bandwidth} Gb/s · ${metrics.transfers} transfers`
                            : `L${u.level} · ${activeOn(props.state, u.id)} active request${activeOn(props.state, u.id) === 1 ? '' : 's'}`
                        : label.subtitle}
                  </small>
                  {props.fusion && u && (
                    <em className="fusion-label-value">
                      {moduleTelemetry(props.state, u, props.lens).value}
                    </em>
                  )}
                </span>
              </button>
            )
          })}
        {fallback && (
          <div className="game-fallback">
            <span>
              <Cpu size={17} />
              TACTICAL BOARD · 2D FALLBACK
            </span>
            <p>
              3D is unavailable on this device. All game rules and controls
              remain playable.
            </p>
            <div>
              {PADS.map((p) => {
                const unit = props.state.units.find((u) => u.pad === p.id)
                return (
                  <button
                    key={p.id}
                    aria-label={`Fallback sector ${p.name}`}
                    onClick={() => props.onPad(p.id)}
                    style={{
                      borderColor: unit ? MODULES[unit.type].color : '#4b6575',
                    }}
                  >
                    <strong>{p.name}</strong>
                    <small>
                      {unit ? MODULES[unit.type].short : 'BUILD PAD'}
                    </small>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  },
)
