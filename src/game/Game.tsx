import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Coins,
  Crosshair,
  Cpu,
  Gamepad2,
  Gauge,
  HardDrive,
  Heart,
  Layers3,
  Map,
  Maximize2,
  Minus,
  Network,
  Pause,
  Play,
  Plus,
  Power,
  Radio,
  RotateCcw,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Star,
  Timer,
  Trash2,
  Trophy,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GameScene } from './GameScene'
import type { GameSceneHandle } from './GameScene'
import { RequestLens } from './RequestLens'
import FusionUI from './FusionUI'
import { GameOperations } from './Operations'
import { pinSpatialCard } from './fusion'
import type { CameraView, FusionLens, SpatialPin } from './fusion'
import {
  MISSIONS,
  MODULES,
  PADS,
  activeOn,
  createGame,
  decodeRate,
  decodeSlots,
  formatTime,
  gameReducer,
  getGameMetrics,
  medal,
  missionById,
  prefillRate,
  readProgress,
  requirementsMet,
  unitPower,
  upgradeCost,
} from './model'
import type { GameAction, GameState, ModuleType, Progress } from './model'
import { VisualSettings, useEffectsQuality } from '../components/VisualSettings'
import './game.css'
import './fusion.css'

const moduleIcons: Record<ModuleType, LucideIcon> = {
  prefill: Cpu,
  decode: Server,
  cache: HardDrive,
  fabric: Network,
}
const toolKeys: ModuleType[] = ['prefill', 'decode', 'cache', 'fabric']
const STORAGE_KEY = 'strata-fleet-command-v1'
function loadProgress() {
  try {
    return readProgress(localStorage.getItem(STORAGE_KEY))
  } catch {
    return readProgress(null)
  }
}
function Stars({ count, total = 3 }: { count: number; total?: number }) {
  return (
    <span className="game-stars" aria-label={`${count} of ${total} stars`}>
      {Array.from({ length: total }, (_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < count ? 'currentColor' : 'none'}
          className={i < count ? 'earned' : ''}
        />
      ))}
    </span>
  )
}

function GameDialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
    const el = ref.current
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="game-dialog"
      onCancel={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      aria-label={title}
    >
      <button
        className="game-dialog-close"
        onClick={onClose}
        aria-label="Close game dialog"
      >
        <X size={19} />
      </button>
      {children}
    </dialog>
  )
}

export default function FleetGame({
  active,
  onLearn,
}: {
  active: boolean
  onLearn: () => void
}) {
  const effects = useEffectsQuality()
  const [state, setState] = useState<GameState>(() => createGame())
  const stateRef = useRef(state)
  stateRef.current = state
  const [fusion, setFusion] = useState(
    () => new URLSearchParams(location.search).get('ui') !== 'tactical',
  )
  const [tool, setTool] = useState<ModuleType | null>(() =>
    new URLSearchParams(location.search).get('ui') === 'tactical'
      ? 'prefill'
      : null,
  )
  const [lens, setLens] = useState<FusionLens>('flow')
  const [labels, setLabels] = useState(true)
  const [follow, setFollow] = useState(false)
  const [view, setView] = useState<CameraView>(() =>
    new URLSearchParams(location.search).get('ui') === 'tactical'
      ? 'overview'
      : 'orbit',
  )
  const [theater, setTheater] = useState(false)
  const [requestOpen, setRequestOpen] = useState(false)
  const [webgl, setWebgl] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [hovered, setHovered] = useState<number | null>(null)
  const [request, setRequest] = useState<number | null>(null)
  const [dialog, setDialog] = useState<
    'missions' | 'help' | 'menu' | 'requests' | null
  >(null)
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [speed, setSpeed] = useState(1)
  const [sound, setSound] = useState(false)
  const [sectors, setSectors] = useState(false)
  const scene = useRef<GameSceneHandle>(null),
    root = useRef<HTMLElement>(null)
  const audio = useRef<AudioContext | null>(null)
  const recorded = useRef('')
  const contextHeight = useRef(360)
  const contextPin = useRef<SpatialPin | null>(null)
  const refreshSpatial = useRef<(() => void) | null>(null)
  const onCardSize = useCallback((height: number) => {
    contextHeight.current = height
    refreshSpatial.current?.()
  }, [])
  const mission = missionById(state.mission),
    metrics = getGameMetrics(state)
  const selectedUnit = state.units.find((u) => u.pad === selected)
  const focusedJob =
    state.jobs.find((j) => j.id === request) ||
    state.jobs.find((j) => j.phase !== 'done') ||
    state.jobs[0]
  const playing = state.phase === 'playing',
    canBuild = playing || state.phase === 'paused'

  const beep = (good = true) => {
    if (!sound) return
    try {
      const ctx = audio.current || (audio.current = new AudioContext())
      void ctx.resume()
      const osc = ctx.createOscillator(),
        gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(good ? 620 : 180, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(
        good ? 920 : 110,
        ctx.currentTime + 0.12,
      )
      gain.gain.setValueAtTime(0.025, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } catch {
      /* Sound is optional and never blocks play. */
    }
  }
  const dispatch = (action: GameAction) => {
    const before = stateRef.current,
      next = gameReducer(before, action)
    stateRef.current = next
    setState(next)
    if (
      action.type !== 'tick' &&
      action.type !== 'pause' &&
      action.type !== 'resume'
    )
      beep(
        next.credits !== before.credits ||
          action.type === 'start' ||
          next.energy < before.energy,
      )
    return next
  }
  const pickPad = (pad: number) => {
    if (!canBuild) return
    if (fusion) {
      setTheater(false)
      setFollow(false)
      setView('overview')
      setRequestOpen(false)
      const existing = stateRef.current.units.find((u) => u.pad === pad)
      if (existing) {
        setSelected(pad)
        setTool(null)
        return
      }
      if (tool) {
        const next = dispatch({ type: 'build', module: tool, pad })
        if (next.units.some((u) => u.pad === pad)) {
          setTool(null)
          setSelected(null)
        }
        return
      }
      setSelected(pad)
      return
    }
    setSelected(pad)
    const existing = stateRef.current.units.find((u) => u.pad === pad)
    if (existing) {
      setTool(null)
      return
    }
    if (tool) {
      const before = stateRef.current.units.length,
        next = dispatch({ type: 'build', module: tool, pad })
      if (next.units.length > before) {
        if (
          state.mission === 'first-light' &&
          !next.units.some((u) => u.type === 'decode')
        )
          setTool('decode')
        else setTool(null)
      }
    }
  }
  const openDialog = (next: typeof dialog) => {
    if (playing) dispatch({ type: 'pause' })
    setDialog(next)
  }
  const chooseMission = (id: string) => {
    contextPin.current = null
    const next = createGame(id)
    setState(next)
    stateRef.current = next
    setSelected(null)
    setRequest(null)
    setTool(fusion ? null : 'prefill')
    setRequestOpen(false)
    setFollow(false)
    setView(fusion ? 'orbit' : 'overview')
    setTheater(false)
    setLens(
      missionById(id).requirement === 'memory'
        ? 'memory'
        : missionById(id).requirement === 'network'
          ? 'fabric'
          : 'flow',
    )
    setDialog(null)
    setSectors(false)
    setSpeed(1)
    recorded.current = ''
    scene.current?.reset()
  }
  const start = () => {
    setView('overview')
    dispatch({ type: 'start' })
    setDialog(null)
    setTool(
      fusion
        ? null
        : state.units.some((u) => u.type === 'prefill')
          ? 'decode'
          : 'prefill',
    )
    if (fusion) scene.current?.enter()
  }
  const learn = () => {
    if (playing) dispatch({ type: 'pause' })
    if (document.fullscreenElement === root.current)
      void document.exitFullscreen?.().catch(() => {})
    onLearn()
  }

  const dismissContext = () => {
    contextPin.current = null
    setSelected(null)
    setRequestOpen(false)
    root.current?.style.setProperty('--spatial-ready', '0')
  }
  const selectRequest = (id: number | null) => {
    setRequest(id)
    setSelected(null)
    setTool(null)
    setRequestOpen(fusion)
    setView('overview')
  }
  const cameraView = (next: CameraView) => {
    setView(next)
    setFollow(false)
    if (next !== 'orbit') scene.current?.view(next)
  }
  const toggleFusion = () => {
    const next = !fusion
    setFusion(next)
    dismissContext()
    setTheater(false)
    setFollow(false)
    setView('overview')
    setTool(next ? null : 'prefill')
    scene.current?.reset()
    const url = new URL(location.href)
    url.searchParams.set('ui', next ? 'fusion' : 'tactical')
    history.replaceState({}, '', url)
  }
  const projectContext = (
    id: string,
    x: number,
    y: number,
    visible: boolean,
  ) => {
    if (id !== 'context' || !fusion || !root.current) return
    const host = root.current,
      placement = pinSpatialCard(
        contextPin.current,
        selected !== null ? `pad-${selected}` : 'request',
        x,
        y,
        host.clientWidth,
        host.clientHeight,
        contextHeight.current,
      )
    contextPin.current = placement
    host.style.setProperty('--world-x', `${x}px`)
    host.style.setProperty('--world-y', `${y}px`)
    host.style.setProperty('--spatial-x', `${placement.x}px`)
    host.style.setProperty('--spatial-y', `${placement.y}px`)
    host.style.setProperty('--spatial-width', `${placement.width}px`)
    host.style.setProperty('--tether-length', `${placement.tetherLength}px`)
    host.style.setProperty('--tether-angle', `${placement.tetherAngle}deg`)
    host.style.setProperty('--anchor-visible', visible ? '1' : '0')
    host.style.setProperty('--spatial-ready', '1')
  }
  refreshSpatial.current = () => {
    if (!webgl && fusion && (selected !== null || requestOpen) && root.current)
      projectContext(
        'context',
        root.current.clientWidth / 2,
        root.current.clientHeight * 0.45,
        false,
      )
  }
  useEffect(() => {
    refreshSpatial.current?.()
  }, [webgl, fusion, selected, requestOpen])

  useEffect(() => {
    if (!active || state.phase !== 'playing') return
    let raf = 0,
      last = performance.now(),
      accumulated = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.max(0, Math.min(0.2, (now - last) / 1000))
      last = now
      if (document.hidden) return
      accumulated += dt * speed
      if (accumulated >= 0.09) {
        const next = gameReducer(stateRef.current, {
          type: 'tick',
          dt: accumulated,
        })
        stateRef.current = next
        setState(next)
        accumulated = 0
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active, state.phase, speed])
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(
          (e.target as HTMLElement).tagName,
        )
      )
        return
      if (dialog) return
      if (e.key === 'Escape') {
        e.preventDefault()
        if (fusion && theater) {
          setTheater(false)
          return
        }
        if (fusion && (selected !== null || requestOpen)) {
          dismissContext()
          return
        }
        if (fusion && tool) {
          setTool(null)
          return
        }
        openDialog('menu')
        return
      }
      if (!canBuild) return
      if (['1', '2', '3', '4'].includes(e.key)) {
        setTool(toolKeys[Number(e.key) - 1])
        setSelected(null)
        setRequestOpen(false)
        setTheater(false)
        e.preventDefault()
      } else if (
        e.code === 'Space' &&
        (e.target as HTMLElement).tagName !== 'BUTTON'
      ) {
        e.preventDefault()
        dispatch({ type: playing ? 'pause' : 'resume' })
      } else if (e.key.toLowerCase() === 'r') cameraView('overview')
      else if (e.key.toLowerCase() === 'q') {
        setFollow(false)
        setView('overview')
        scene.current?.rotate(-1)
      } else if (e.key.toLowerCase() === 'e') {
        setFollow(false)
        setView('overview')
        scene.current?.rotate(1)
      } else if (e.key.toLowerCase() === 'u' && selectedUnit)
        dispatch({ type: 'upgrade', unit: selectedUnit.id })
      else if (e.key.toLowerCase() === 'b' && selectedUnit)
        dispatch({ type: 'surge', unit: selectedUnit.id })
      else if (fusion && e.key.toLowerCase() === 'h') {
        setTheater(!theater)
        e.preventDefault()
      } else if (fusion && e.key.toLowerCase() === 'l') setLabels(!labels)
      else if (fusion && e.key.toLowerCase() === 'f' && focusedJob) {
        setFollow(!follow)
        setView('overview')
        setSelected(null)
        setRequestOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    if (
      state.phase !== 'victory' ||
      recorded.current === `${state.mission}:${state.score}`
    )
      return
    recorded.current = `${state.mission}:${state.score}`
    setProgress((previous) => {
      const next = {
        stars: {
          ...previous.stars,
          [state.mission]: Math.max(
            previous.stars[state.mission] || 0,
            medal(state),
          ),
        },
        best: {
          ...previous.best,
          [state.mission]: Math.max(
            previous.best[state.mission] || 0,
            state.score,
          ),
        },
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* A private browser may disable persistence. */
      }
      return next
    })
  }, [state.phase, state.mission, state.score])
  useEffect(
    () => () => {
      void audio.current?.close()
    },
    [],
  )

  const nextMission =
    MISSIONS[
      Math.min(
        MISSIONS.length - 1,
        MISSIONS.findIndex((m) => m.id === state.mission) + 1,
      )
    ]
  const remaining = Number.isFinite(mission.duration)
    ? Math.max(0, mission.duration - state.time)
    : state.time
  const missionChecks = [
    {
      label: `Deliver ${Number.isFinite(mission.goal) ? mission.goal : 'as many'} requests`,
      done: state.served >= mission.goal,
    },
    ...(mission.requirement === 'batching' || mission.requirement === 'all'
      ? [{ label: 'Enable continuous batching', done: state.batching }]
      : []),
    ...(mission.requirement === 'memory' || mission.requirement === 'all'
      ? [
          {
            label: 'Add a KV memory bank',
            done: state.units.some((u) => u.type === 'cache'),
          },
        ]
      : []),
    ...(mission.requirement === 'network' || mission.requirement === 'all'
      ? [{ label: 'Reach 400 Gb/s fabric', done: metrics.bandwidth >= 400 }]
      : []),
    ...(mission.requirement === 'prefix'
      ? [
          {
            label: 'Enable prefix reuse · earn 8 hits',
            done: state.prefixReuse && state.prefixHits >= 8,
          },
        ]
      : []),
  ]
  return (
    <section
      ref={root}
      className={`fleet-game ${fusion ? 'is-fusion' : ''} ${theater ? 'is-theater' : ''} ${state.phase === 'briefing' ? 'is-briefing' : ''} ${state.integrity < 35 ? 'integrity-critical' : ''}`}
      hidden={!active}
      aria-label="Fleet Command 3D game"
    >
      <GameScene
        effects={effects}
        ref={scene}
        active={active}
        state={state}
        tool={tool}
        selected={selected}
        focusedJob={focusedJob?.id ?? null}
        fusion={fusion}
        lens={lens}
        showLabels={labels && !theater}
        followRequest={follow}
        autoOrbit={view === 'orbit'}
        requestOpen={requestOpen}
        onProject={projectContext}
        onUnavailable={() => setWebgl(false)}
        onCameraRelease={() => {
          setFollow(false)
          setView('overview')
        }}
        onPad={pickPad}
        onHover={setHovered}
        onRequest={selectRequest}
      />
      {active && (
        <>
          <div className="game-vignette" />
          <header className="game-header">
            <button
              className="game-brand"
              onClick={() => openDialog('missions')}
              aria-label="Fleet Command mission map"
            >
              <span>
                <Layers3 size={24} />
              </span>
              <b>
                strata<span>.</span>
              </b>
              <i />
              <small>FLEET COMMAND</small>
            </button>
            <div className="game-header-mission">
              <span className="game-led" />
              {state.phase === 'briefing'
                ? 'AN AI INFRASTRUCTURE STRATEGY GAME'
                : `${mission.name.toUpperCase()} · WAVE ${metrics.wave}`}
            </div>
            <div className="game-header-actions">
              <VisualSettings />
              <button
                className="game-fusion-toggle"
                onClick={toggleFusion}
                aria-label={
                  fusion
                    ? 'Switch to tactical interface'
                    : 'Switch to immersive interface'
                }
                aria-pressed={fusion}
                title={
                  fusion
                    ? 'Switch to tactical interface'
                    : 'Switch to immersive interface'
                }
              >
                <Layers3 size={15} />
                <span>{fusion ? 'Fusion' : 'Tactical'}</span>
              </button>
              <button
                onClick={learn}
                className="game-learning-button"
                aria-label="Learning mode"
              >
                <BookOpen size={15} />
                <span>Learning mode</span>
                <ArrowUpRight size={12} />
              </button>
              <button
                onClick={() => openDialog('help')}
                aria-label="How to play"
              >
                <CircleHelp size={17} />
              </button>
              <button
                onClick={() => {
                  setSound(!sound)
                  if (!sound) {
                    try {
                      audio.current ||= new AudioContext()
                    } catch {
                      /* optional */
                    }
                  }
                }}
                aria-label={sound ? 'Mute game sound' : 'Enable game sound'}
              >
                {sound ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </button>
            </div>
          </header>

          {state.phase === 'briefing' ? (
            <>
              <div className="game-briefing">
                <span className="game-eyebrow">
                  <span className="game-led" /> YOUR SHIFT STARTS HERE
                </span>
                <h1>
                  Build the backbone.
                  <br />
                  <em>
                    Keep the answers
                    <br className="game-wide-break" /> flowing.
                  </em>
                </h1>
                <p>
                  You’re the architect. Turn a handful of GPU engines into a
                  service that can weather the rush. Every request is counting
                  on you.
                </p>
                <div className="game-briefing-facts">
                  <span>
                    <Box size={16} />
                    <b>Build</b> the fleet
                  </span>
                  <span>
                    <RouteIcon />
                    <b>Route</b> the work
                  </span>
                  <span>
                    <ShieldCheck size={16} />
                    <b>Hold</b> the line
                  </span>
                </div>
                <div className="game-mission-preview">
                  <div>
                    <span>{mission.kicker}</span>
                    <Stars count={progress.stars[mission.id] || 0} />
                  </div>
                  <h2>{mission.name}</h2>
                  <p>{mission.brief}</p>
                  <div>
                    <span>
                      <Timer size={13} />
                      {Number.isFinite(mission.duration)
                        ? `${mission.duration}s shift`
                        : 'Endless shift'}
                    </span>
                    <span>
                      <Coins size={13} />
                      {mission.credits} credits
                    </span>
                    <span>
                      <Heart size={13} />
                      100 integrity
                    </span>
                  </div>
                </div>
                <button className="game-primary game-start" onClick={start}>
                  <Play size={17} fill="currentColor" />
                  Start mission
                  <ArrowRight size={18} />
                </button>
                <div className="game-briefing-links">
                  <button onClick={() => openDialog('missions')}>
                    <Map size={14} />
                    Choose a mission
                  </button>
                  <button onClick={() => chooseMission('sandbox')}>
                    <Sparkles size={14} />
                    Sandbox
                    <ArrowRight size={13} />
                  </button>
                </div>
                <span className="game-local-note">
                  No downloads. No account. Your personal best stays in this
                  browser.
                </span>
              </div>
              <div className="game-preview-badge">
                <span className="game-led" />
                <div>
                  <strong>YOUR NEXT SERVING DISTRICT</strong>
                  <small>
                    Interactive 3D · real decisions · calculated KV sizes
                  </small>
                </div>
                <Gamepad2 size={22} />
              </div>
              <div className="game-briefing-bottom">
                <span>
                  01—06 <i /> SIX MISSIONS. ONE CONNECTED SYSTEM.
                </span>
                <button onClick={learn}>
                  Explore the science behind the game
                  <ArrowUpRight size={14} />
                </button>
                <span>
                  DRAG TO ORBIT <i /> SCROLL TO ZOOM
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="game-resource-bar" aria-label="Game resources">
                <div>
                  <Coins size={16} />
                  <span>
                    CREDITS
                    <strong data-testid="game-credits">
                      {Math.floor(state.credits).toLocaleString()}
                    </strong>
                  </span>
                </div>
                <div>
                  <Power size={16} />
                  <span>
                    POWER
                    <strong>
                      {metrics.power}
                      <small> / {metrics.maxPower}</small>
                    </strong>
                  </span>
                </div>
                <div className={state.integrity < 35 ? 'danger' : ''}>
                  <Heart size={16} />
                  <span>
                    INTEGRITY
                    <strong>
                      {state.integrity}
                      <small>%</small>
                    </strong>
                  </span>
                </div>
                <div>
                  <Timer size={16} />
                  <span>
                    {Number.isFinite(mission.duration)
                      ? 'SHIFT LEFT'
                      : 'SURVIVED'}
                    <strong aria-label="Mission time">
                      {formatTime(remaining)}
                    </strong>
                  </span>
                </div>
                <div className="game-score-resource">
                  <Star size={16} />
                  <span>
                    SCORE<strong>{state.score.toLocaleString()}</strong>
                  </span>
                </div>
              </div>
              <aside className="game-left-hud">
                <div className="game-objective-card">
                  <div className="game-card-kicker">
                    <span className="game-led" />
                    {mission.kicker}
                  </div>
                  <div className="game-objective-title">
                    <h2>{mission.name}</h2>
                    <button
                      onClick={() => openDialog('missions')}
                      aria-label="Choose mission"
                    >
                      <Map size={15} />
                    </button>
                  </div>
                  <p>{mission.brief}</p>
                  <div className="game-delivery-count">
                    <span>
                      <b data-testid="game-served">{state.served}</b>
                      <small>
                        {' '}
                        / {Number.isFinite(mission.goal)
                          ? mission.goal
                          : '∞'}{' '}
                        delivered
                      </small>
                    </span>
                    <span>{state.lost} lost</span>
                  </div>
                  <div className="game-goal-track">
                    <i
                      style={{
                        width: `${Number.isFinite(mission.goal) ? Math.min(100, (state.served / mission.goal) * 100) : Math.min(100, state.integrity)}%`,
                      }}
                    />
                  </div>
                  <div className="game-objectives">
                    {missionChecks.slice(1).map((c) => (
                      <span key={c.label} className={c.done ? 'done' : ''}>
                        {c.done ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          <span className="game-empty-check" />
                        )}
                        {c.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="game-build-panel">
                  <div className="game-panel-heading">
                    <span>BUILD YOUR FLEET</span>
                    <small>1—4</small>
                  </div>
                  <div className="game-build-grid">
                    {toolKeys.map((type, i) => {
                      const Icon = moduleIcons[type],
                        spec = MODULES[type]
                      return (
                        <button
                          key={type}
                          className={`${tool === type ? 'selected' : ''} ${state.credits < spec.cost ? 'unaffordable' : ''}`}
                          style={
                            {
                              '--module-color': spec.color,
                            } as React.CSSProperties
                          }
                          onClick={() => {
                            setTool(tool === type ? null : type)
                            setSelected(null)
                          }}
                          aria-label={`Build ${spec.name}`}
                          aria-pressed={tool === type}
                        >
                          <span>
                            <Icon size={21} />
                            <kbd>{i + 1}</kbd>
                          </span>
                          <strong>{spec.short}</strong>
                          <small>
                            <Coins size={10} />
                            {spec.cost}
                            <span>
                              <Power size={9} />
                              {spec.power}
                            </span>
                          </small>
                        </button>
                      )
                    })}
                  </div>
                  <div className="game-build-hint">
                    {tool ? (
                      <>
                        <span style={{ background: MODULES[tool].color }} />
                        {MODULES[tool].description}
                      </>
                    ) : (
                      <>
                        <span />
                        Select a module, then click a glowing sector.
                      </>
                    )}
                  </div>
                </div>
                <div className="game-research">
                  <div className="game-panel-heading">
                    <span>OPERATIONS RESEARCH</span>
                    <Settings2 size={12} />
                  </div>
                  <button
                    onClick={() =>
                      dispatch({ type: 'research', research: 'batching' })
                    }
                    className={state.batching ? 'researched' : ''}
                    disabled={state.batching}
                  >
                    <Layers3 size={15} />
                    <span>
                      Continuous batching<small>Share decode iterations</small>
                    </span>
                    {state.batching ? <Check size={13} /> : <b>85</b>}
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: 'research', research: 'prefix' })
                    }
                    className={state.prefixReuse ? 'researched' : ''}
                    disabled={state.prefixReuse}
                  >
                    <HardDrive size={15} />
                    <span>
                      Prefix reuse<small>Exact, tenant-aware KV hits</small>
                    </span>
                    {state.prefixReuse ? <Check size={13} /> : <b>70</b>}
                  </button>
                  <button
                    onClick={() =>
                      dispatch({ type: 'research', research: 'power' })
                    }
                    disabled={state.powerUpgrades >= 3}
                  >
                    <Power size={15} />
                    <span>
                      Power headroom
                      <small>
                        +8 capacity · {state.powerUpgrades}/3 upgrades
                      </small>
                    </span>
                    <b>120</b>
                  </button>
                </div>
                <div className={`game-sectors ${sectors ? 'expanded' : ''}`}>
                  <button
                    className="game-sector-toggle"
                    onClick={() => setSectors(!sectors)}
                    aria-expanded={sectors}
                  >
                    <span>SECTOR GRID</span>
                    <small>Keyboard / touch</small>
                    <Plus size={13} />
                  </button>
                  <div className="game-sector-grid">
                    {PADS.map((p) => {
                      const u = state.units.find((u) => u.pad === p.id)
                      return (
                        <button
                          key={p.id}
                          onClick={() => pickPad(p.id)}
                          aria-label={`Sector ${p.name}${u ? `: ${MODULES[u.type].name}` : ': empty'}`}
                          title={
                            u
                              ? `${MODULES[u.type].name} · level ${u.level}`
                              : `Build in ${p.name}`
                          }
                          style={
                            {
                              '--module-color': u
                                ? MODULES[u.type].color
                                : tool
                                  ? MODULES[tool].color
                                  : '#506473',
                            } as React.CSSProperties
                          }
                          className={`${u ? 'occupied' : ''} ${selected === p.id ? 'selected' : ''}`}
                        >
                          <span>{p.name}</span>
                          {u && <i />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </aside>
              <aside className="game-right-hud">
                {selectedUnit ? (
                  <div className="game-unit-inspector">
                    <div className="game-panel-heading">
                      <span>SECTOR {PADS[selectedUnit.pad].name}</span>
                      <button
                        onClick={() => setSelected(null)}
                        aria-label="Close module inspector"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div
                      className="game-unit-icon"
                      style={
                        {
                          '--module-color': MODULES[selectedUnit.type].color,
                        } as React.CSSProperties
                      }
                    >
                      {(() => {
                        const Icon = moduleIcons[selectedUnit.type]
                        return <Icon size={26} />
                      })()}
                      <span>LVL {selectedUnit.level}</span>
                    </div>
                    <h2>{MODULES[selectedUnit.type].name}</h2>
                    <p>{MODULES[selectedUnit.type].description}</p>
                    <dl>
                      <div>
                        <dt>Capacity</dt>
                        <dd>
                          {selectedUnit.type === 'prefill'
                            ? `${Math.round(prefillRate(selectedUnit))} input tok/s`
                            : selectedUnit.type === 'decode'
                              ? `${Math.round(decodeRate(selectedUnit))} output tok/s`
                              : selectedUnit.type === 'cache'
                                ? `${selectedUnit.level * 2048} MiB`
                                : `${selectedUnit.level * 200} Gb/s`}
                        </dd>
                      </div>
                      <div>
                        <dt>
                          {selectedUnit.type === 'cache'
                            ? 'Pooled occupancy'
                            : selectedUnit.type === 'fabric'
                              ? 'KV transfers'
                              : 'Active requests'}
                        </dt>
                        <dd>
                          {selectedUnit.type === 'cache'
                            ? `${Math.round(metrics.used)} / ${metrics.memory} MiB`
                            : selectedUnit.type === 'fabric'
                              ? metrics.transfers
                              : activeOn(state, selectedUnit.id)}
                          {selectedUnit.type === 'decode'
                            ? ` / ${decodeSlots(state, selectedUnit)}`
                            : ''}
                        </dd>
                      </div>
                      <div>
                        <dt>Power demand</dt>
                        <dd>{unitPower(selectedUnit)} game units</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd
                          className={
                            selectedUnit.offlineUntil > state.time
                              ? 'danger'
                              : ''
                          }
                        >
                          {selectedUnit.offlineUntil > state.time
                            ? `Offline · ${Math.ceil(selectedUnit.offlineUntil - state.time)}s`
                            : 'Operational'}
                        </dd>
                      </div>
                    </dl>
                    {selectedUnit.offlineUntil > state.time ? (
                      <button
                        className="game-primary repair-button"
                        onClick={() =>
                          dispatch({ type: 'repair', unit: selectedUnit.id })
                        }
                      >
                        <Wrench size={14} />
                        Repair now · 40
                      </button>
                    ) : (
                      <button
                        className="game-primary"
                        onClick={() =>
                          dispatch({ type: 'upgrade', unit: selectedUnit.id })
                        }
                        disabled={selectedUnit.level >= 3}
                      >
                        <Plus size={14} />
                        {selectedUnit.level >= 3
                          ? 'Maximum level'
                          : `Upgrade · ${upgradeCost(selectedUnit)}`}
                      </button>
                    )}
                    <button
                      className="game-recycle"
                      onClick={() => {
                        const next = dispatch({
                          type: 'sell',
                          unit: selectedUnit.id,
                        })
                        if (!next.units.some((u) => u.id === selectedUnit.id))
                          setSelected(null)
                      }}
                    >
                      <Trash2 size={12} />
                      Recycle for {Math.floor(selectedUnit.invested * 0.6)}{' '}
                      credits
                    </button>
                    <div className="game-lesson">
                      <BookOpen size={14} />
                      <p>{MODULES[selectedUnit.type].lesson}</p>
                    </div>
                  </div>
                ) : (
                  <div className="game-network-card">
                    <div className="game-panel-heading">
                      <span>THE SERVICE AT A GLANCE</span>
                      <Radio size={13} />
                    </div>
                    <div className="game-signal-number">
                      <strong>{metrics.queued}</strong>
                      <span>requests in the queue</span>
                      <i className={metrics.queued > 5 ? 'warning' : ''} />
                    </div>
                    <div className="game-memory-meter">
                      <span>
                        KV MEMORY
                        <strong>
                          {Math.round(metrics.used).toLocaleString()} /{' '}
                          {metrics.memory.toLocaleString()} <small>MiB</small>
                        </strong>
                      </span>
                      <div>
                        <i
                          style={{
                            width: `${Math.min(100, (metrics.used / metrics.memory) * 100)}%`,
                          }}
                          className={
                            metrics.used / metrics.memory > 0.85
                              ? 'warning'
                              : ''
                          }
                        />
                      </div>
                    </div>
                    <div className="game-service-metrics">
                      <span>
                        <Network size={14} />
                        Fabric<strong>{metrics.bandwidth} Gb/s</strong>
                      </span>
                      <span>
                        <Gauge size={14} />
                        Mean latency
                        <strong>
                          {metrics.averageLatency
                            ? `${metrics.averageLatency.toFixed(1)}s`
                            : '—'}
                        </strong>
                      </span>
                      <span>
                        <HardDrive size={14} />
                        Prefix hits<strong>{state.prefixHits}</strong>
                      </span>
                      <span>
                        <Sparkles size={14} />
                        Tokens emitted
                        <strong>
                          {Math.floor(state.generated + 1e-6).toLocaleString()}
                        </strong>
                      </span>
                    </div>
                    <div className="game-system-note">
                      <ShieldCheck size={15} />
                      <span>
                        {metrics.used / metrics.memory > 0.85
                          ? 'Memory is limiting admission. Add or upgrade a KV bank.'
                          : metrics.queued > 4
                            ? 'The queue is growing. Inspect the busy phase and add capacity.'
                            : metrics.transfers > 2
                              ? 'Transfers are stacking up. Upgrade the fabric.'
                              : 'A balanced service keeps every stage moving.'}
                      </span>
                    </div>
                  </div>
                )}
                <div className="game-event-feed">
                  <div className="game-panel-heading">
                    <span>COMMAND FEED</span>
                    <span className="game-led" />
                  </div>
                  {state.events.length ? (
                    state.events.slice(0, 4).map((e) => (
                      <div key={e.id} className={`game-event ${e.kind}`}>
                        <i />
                        <p>
                          {e.text}
                          <small>{formatTime(e.at)}</small>
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="game-empty-feed">
                      The first requests are on their way. Build a complete
                      serving path.
                    </p>
                  )}
                </div>
              </aside>
              {playing && (
                <div className="game-live-goal">
                  <span>{mission.name}</span>
                  <strong>
                    {state.served} /{' '}
                    {Number.isFinite(mission.goal) ? mission.goal : '∞'}
                  </strong>
                  <span>delivered</span>
                </div>
              )}
              <RequestLens
                state={state}
                job={focusedJob}
                onSelect={setRequest}
                onPause={() => dispatch({ type: 'pause' })}
              />
              <div className="game-feedback" role="status">
                <span className="game-led" />
                {hovered !== null &&
                tool &&
                !state.units.some((u) => u.pad === hovered)
                  ? `Click sector ${PADS[hovered].name} to build ${MODULES[tool].name.toLowerCase()} · ${MODULES[tool].cost} credits`
                  : state.feedback}
              </div>
              {state.phase === 'paused' && !dialog && (
                <div className="game-paused-banner">
                  <Pause size={15} />
                  <span>
                    PAUSED<span>Build and plan without losing time.</span>
                  </span>
                  <button onClick={() => dispatch({ type: 'resume' })}>
                    Resume
                    <Play size={13} />
                  </button>
                </div>
              )}
              <div className="game-bottom-bar">
                <div className="game-controls">
                  <button
                    className="game-pause-control"
                    onClick={() =>
                      dispatch({ type: playing ? 'pause' : 'resume' })
                    }
                    aria-label={playing ? 'Pause game' : 'Resume game'}
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    className={speed === 2 ? 'active' : ''}
                    onClick={() => setSpeed(speed === 1 ? 2 : 1)}
                    aria-label="Toggle game speed"
                  >
                    {speed}×
                  </button>
                  <button
                    onClick={() => openDialog('menu')}
                    aria-label="Game menu"
                  >
                    <Settings2 size={16} />
                  </button>
                  <button
                    onClick={() => openDialog('requests')}
                    aria-label="Inspect live requests"
                  >
                    <Crosshair size={15} />
                  </button>
                </div>
                <span className="game-keyboard-hint">
                  <kbd>1</kbd>—<kbd>4</kbd> BUILD <i />
                  <kbd>SPACE</kbd> PAUSE <i /> DRAG TO ORBIT
                </span>
                <div className="game-camera-controls">
                  <button
                    onClick={() => scene.current?.rotate(-1)}
                    aria-label="Rotate game camera left"
                  >
                    <RotateCcw size={14} />
                  </button>
                  <button
                    onClick={() => scene.current?.zoom(-1)}
                    aria-label="Zoom game out"
                  >
                    <Minus size={15} />
                  </button>
                  <button
                    onClick={() => scene.current?.zoom(1)}
                    aria-label="Zoom game in"
                  >
                    <Plus size={15} />
                  </button>
                  <button
                    onClick={() => scene.current?.reset()}
                    aria-label="Reset game camera"
                  >
                    <Box size={15} />
                  </button>
                  <button
                    onClick={() => {
                      if (document.fullscreenElement)
                        void document.exitFullscreen()
                      else
                        void root.current?.requestFullscreen().catch(() => {})
                    }}
                    aria-label="Fullscreen game"
                  >
                    <Maximize2 size={14} />
                  </button>
                </div>
              </div>
            </>
          )}
          {fusion && state.phase !== 'briefing' && (
            <FusionUI
              state={state}
              tool={tool}
              selected={selected}
              job={focusedJob}
              requestOpen={requestOpen}
              lens={lens}
              labels={labels}
              follow={follow}
              view={view}
              speed={speed}
              theater={theater}
              checks={missionChecks}
              onAction={dispatch}
              onTool={setTool}
              onPad={pickPad}
              onLens={setLens}
              onLabels={() => setLabels(!labels)}
              onFollow={() => {
                setFollow(!follow)
                setView('overview')
                if (!follow) dismissContext()
              }}
              onView={cameraView}
              onFocus={(pad) => {
                setFollow(false)
                setView('overview')
                scene.current?.focus(pad)
                dismissContext()
              }}
              onTheater={() => {
                setTheater(!theater)
                setTool(null)
              }}
              onMenu={() => openDialog('menu')}
              onMissions={() => openDialog('missions')}
              onRequests={() => openDialog('requests')}
              onRequest={(id) => setRequest(id)}
              onOpenRequest={() => {
                setSelected(null)
                setTool(null)
                setRequestOpen(true)
              }}
              onDismiss={dismissContext}
              onSpeed={() => setSpeed(speed === 1 ? 2 : 1)}
              onZoom={(d) => {
                setFollow(false)
                setView('overview')
                scene.current?.zoom(d)
              }}
              onCardSize={onCardSize}
              onBuild={(type, pad) => {
                const next = dispatch({ type: 'build', module: type, pad })
                if (next.units.some((u) => u.pad === pad)) {
                  setTool(null)
                  setSelected(pad)
                  setRequestOpen(false)
                }
              }}
              onFullscreen={() => {
                if (document.fullscreenElement)
                  void document.exitFullscreen?.().catch(() => {})
                else void root.current?.requestFullscreen?.().catch(() => {})
              }}
            />
          )}
          <span className="game-model-note">
            GAME-BALANCED TIME & CURRENCY · ANALYTICAL KV SIZES
          </span>

          {dialog === 'requests' && (
            <GameDialog
              title="Inspect live requests"
              onClose={() => setDialog(null)}
            >
              <span className="game-eyebrow">FROM TOKENS TO ANSWERS</span>
              <h2>
                Follow the bytes.
                <br />
                <em>Find the bottleneck.</em>
              </h2>
              <p>
                The shift is paused. Use the arrows to inspect each admitted or
                queued request. Tenant colors follow requests across the 3D
                board.
              </p>
              <RequestLens
                state={state}
                job={focusedJob}
                onSelect={setRequest}
                onPause={() => dispatch({ type: 'pause' })}
              />
              <p>
                Prompt KV is calculated from the 70B GQA reference: 80 layers ×
                8 KV heads × 128 dimensions × K and V × 2 bytes. The memory
                budget reserves prompt and output KV at admission.
              </p>
              <button className="game-primary" onClick={() => setDialog(null)}>
                Back to the board
                <ArrowRight size={16} />
              </button>
            </GameDialog>
          )}
          {dialog === 'missions' && (
            <GameDialog
              title="Choose a mission"
              onClose={() => setDialog(null)}
            >
              <span className="game-eyebrow">THE CAMPAIGN</span>
              <h2>
                Every bottleneck
                <br />
                <em>is a new challenge.</em>
              </h2>
              <p>
                Six shifts through the infrastructure stack. Play any mission,
                or experiment in the sandbox.
              </p>
              <div className="game-mission-list">
                {MISSIONS.map((m, i) => (
                  <button
                    key={m.id}
                    className={state.mission === m.id ? 'selected' : ''}
                    onClick={() => chooseMission(m.id)}
                  >
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{m.name}</strong>
                      <small>{m.kicker.split('/ ')[1]}</small>
                    </div>
                    <Stars count={progress.stars[m.id] || 0} />
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
              <button
                className="game-sandbox-button"
                onClick={() => chooseMission('sandbox')}
              >
                <Sparkles size={19} />
                <span>
                  <strong>Open horizon</strong>
                  <small>Sandbox · an endless shift, your own rules</small>
                </span>
                <ArrowRight size={17} />
              </button>
              <small className="game-dialog-footnote">
                Personal stars and best scores are saved locally in this
                browser.
              </small>
            </GameDialog>
          )}
          {dialog === 'help' && (
            <GameDialog
              title="How to play Fleet Command"
              onClose={() => setDialog(null)}
            >
              <span className="game-eyebrow">YOU ARE THE SCHEDULER</span>
              <h2>
                A city that runs
                <br />
                <em>on your decisions.</em>
              </h2>
              <div className="game-howto">
                {[
                  {
                    icon: Cpu,
                    title: 'Build a complete path',
                    text: fusion
                      ? 'Click an empty hex to choose a module, or arm a tool in the dock. Add both prefill and decode so requests become answers.'
                      : 'Select a prefill engine, then click an empty hex or sector button. Add a decode engine so requests can become answers.',
                  },
                  {
                    icon: HardDrive,
                    title: 'Keep state in memory',
                    text: 'Every admitted request reserves KV capacity. Long prompts need bigger banks; queued work waits for space.',
                  },
                  {
                    icon: Network,
                    title: 'Move the expensive bytes',
                    text: 'Prefill hands KV to decode over shared fabric. A slow link creates a backlog even when compute is free.',
                  },
                  {
                    icon: Heart,
                    title: 'Protect the service',
                    text: 'Completed requests earn credits. Missed deadlines damage integrity. Upgrade, batch, reuse exact prefixes, or repair an outage.',
                  },
                ].map((x) => (
                  <div key={x.title}>
                    <x.icon size={20} />
                    <span>
                      <strong>{x.title}</strong>
                      <p>{x.text}</p>
                    </span>
                  </div>
                ))}
              </div>
              <div className="game-help-keys">
                <span>
                  <kbd>1–4</kbd> Select module
                </span>
                <span>
                  <kbd>SPACE</kbd> Pause / resume
                </span>
                <span>
                  <kbd>Q / E</kbd> Rotate camera
                </span>
                <span>
                  <kbd>R</kbd> Reset view
                </span>
                <span>
                  <kbd>U</kbd> Upgrade selection
                </span>
                <span>
                  <kbd>B</kbd> Surge selected module
                </span>
                <span>
                  <kbd>ESC</kbd>{' '}
                  {fusion ? 'Back / mission control' : 'Game menu'}
                </span>
                {fusion && (
                  <>
                    <span>
                      <kbd>H</kbd> Cinema / show HUD
                    </span>
                    <span>
                      <kbd>L</kbd> World annotations
                    </span>
                    <span>
                      <kbd>F</kbd> Ride a live request
                    </span>
                  </>
                )}
              </div>
              <p>
                Operations research adds FIFO, earliest-deadline and
                shortest-prompt scheduling, optional memory backfill, a capacity
                reserve with energy/power/cooldown costs, and claimable service
                contracts. Open horizon also supports burst and long-context
                stress drills. Select a compute engine or switch to activate its
                reserve in the world.
              </p>
              <p className="game-help-disclaimer">
                This is a teaching game, not a fleet sizing tool. Token sizes
                use the 70B GQA reference; speed, power, deadlines, and currency
                are balanced for play.
              </p>
              <button className="game-primary" onClick={() => setDialog(null)}>
                Got it. Let’s build.
                <ArrowRight size={16} />
              </button>
            </GameDialog>
          )}
          {dialog === 'menu' && (
            <GameDialog title="Mission control" onClose={() => setDialog(null)}>
              <span className="game-eyebrow">MISSION CONTROL</span>
              <h2>
                Take a breath.
                <br />
                <em>The fleet can wait.</em>
              </h2>
              <div className="game-menu-buttons">
                <button
                  className="game-primary"
                  onClick={() => {
                    setDialog(null)
                    if (state.phase === 'paused') dispatch({ type: 'resume' })
                  }}
                >
                  <Play size={16} />
                  Return to the game
                </button>
                <button onClick={() => chooseMission(state.mission)}>
                  <RotateCcw size={16} />
                  Restart this mission
                </button>
                <button onClick={() => setDialog('missions')}>
                  <Map size={16} />
                  Choose another mission
                </button>
                {state.mission === 'sandbox' && (
                  <button
                    onClick={() => {
                      setDialog(null)
                      dispatch({ type: 'finish' })
                    }}
                  >
                    <Award size={16} />
                    Finish this shift
                  </button>
                )}
                <button
                  onClick={() => {
                    setDialog(null)
                    learn()
                  }}
                >
                  <BookOpen size={16} />
                  Open the learning explorer
                </button>
              </div>
              <GameOperations state={state} onAction={dispatch} />
            </GameDialog>
          )}
          {(state.phase === 'victory' || state.phase === 'defeat') &&
            !dialog && (
              <GameDialog
                title={
                  state.phase === 'victory' ? 'Mission complete' : 'Shift ended'
                }
                onClose={() => chooseMission(state.mission)}
              >
                <div
                  className={`game-result-symbol ${state.phase === 'victory' ? 'won' : 'lost'}`}
                >
                  {state.phase === 'victory' ? (
                    <Trophy size={38} />
                  ) : (
                    <Heart size={36} />
                  )}
                </div>
                <span className="game-eyebrow">
                  {state.phase === 'victory'
                    ? 'MISSION COMPLETE'
                    : 'A NEW PLAN STARTS HERE'}
                </span>
                <h2>
                  {state.phase === 'victory'
                    ? 'You held the line.'
                    : 'A bottleneck won.'}
                  <br />
                  <em>
                    {state.phase === 'victory'
                      ? 'The answers kept flowing.'
                      : 'Now you know where to build.'}
                  </em>
                </h2>
                {state.phase === 'victory' && <Stars count={medal(state)} />}
                <p>{state.reason}</p>
                <div className="game-result-stats">
                  <span>
                    SCORE<strong>{state.score.toLocaleString()}</strong>
                  </span>
                  <span>
                    DELIVERED<strong>{state.served}</strong>
                  </span>
                  <span>
                    INTEGRITY<strong>{state.integrity}%</strong>
                  </span>
                </div>
                <div className="game-result-lesson">
                  <BookOpen size={18} />
                  <p>{mission.lesson}</p>
                </div>
                <div className="game-result-actions">
                  <button
                    className="game-primary"
                    onClick={() =>
                      chooseMission(
                        state.phase === 'victory' && state.mission !== 'sandbox'
                          ? nextMission.id
                          : state.mission,
                      )
                    }
                  >
                    {state.phase === 'victory' &&
                    state.mission !== MISSIONS[5].id &&
                    state.mission !== 'sandbox'
                      ? 'Next mission'
                      : 'Try this mission again'}
                    <ArrowRight size={16} />
                  </button>
                  <button onClick={() => setDialog('missions')}>
                    <Map size={15} />
                    Mission map
                  </button>
                </div>
              </GameDialog>
            )}
          <span className="sr-only">
            {requirementsMet(state)
              ? 'Special mission requirements met.'
              : 'Special mission requirements outstanding.'}
          </span>
        </>
      )}
    </section>
  )
}

function RouteIcon() {
  return <Network size={16} />
}
