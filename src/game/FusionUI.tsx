import { useEffect, useRef, useState } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Box,
  Check,
  ChevronDown,
  Coins,
  Cpu,
  Crosshair,
  Eye,
  EyeOff,
  FlaskConical,
  Grid2X2,
  HardDrive,
  Heart,
  Layers3,
  Map,
  Maximize2,
  Minus,
  Network,
  Orbit,
  Pause,
  Play,
  Plus,
  Power,
  Radio,
  Scan,
  Server,
  Settings2,
  Target,
  Timer,
  Trash2,
  Wrench,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  MODULES,
  PADS,
  decodeRate,
  formatTime,
  getGameMetrics,
  missionById,
  prefillRate,
  unitPower,
  upgradeCost,
} from './model'
import type { GameAction, GameState, Job, ModuleType } from './model'
import { FUSION_LENSES, moduleTelemetry, serviceHint } from './fusion'
import type { CameraView, FusionLens } from './fusion'
import { RequestLens, REQUEST_STAGES } from './RequestLens'

const icons: Record<ModuleType, LucideIcon> = {
  prefill: Cpu,
  decode: Server,
  cache: HardDrive,
  fabric: Network,
}
const modules: ModuleType[] = ['prefill', 'decode', 'cache', 'fabric']

interface Props {
  state: GameState
  tool: ModuleType | null
  selected: number | null
  job: Job | undefined
  requestOpen: boolean
  lens: FusionLens
  labels: boolean
  follow: boolean
  view: CameraView
  speed: number
  theater: boolean
  checks: { label: string; done: boolean }[]
  onAction: (action: GameAction) => GameState
  onTool: (tool: ModuleType | null) => void
  onPad: (pad: number) => void
  onBuild: (type: ModuleType, pad: number) => void
  onDismiss: () => void
  onLens: (lens: FusionLens) => void
  onLabels: () => void
  onFollow: () => void
  onView: (view: CameraView) => void
  onFocus: (pad: number) => void
  onTheater: () => void
  onMenu: () => void
  onMissions: () => void
  onRequests: () => void
  onRequest: (id: number | null) => void
  onOpenRequest: () => void
  onSpeed: () => void
  onZoom: (direction: number) => void
  onFullscreen: () => void
  onCardSize: (height: number) => void
}

export default function FusionUI(p: Props) {
  const [panel, setPanel] = useState<
    'research' | 'sectors' | 'telemetry' | null
  >(null)
  const [missionExpanded, setMissionExpanded] = useState(false)
  const card = useRef<HTMLDivElement>(null)
  const drawer = useRef<HTMLElement>(null)
  const m = getGameMetrics(p.state),
    mission = missionById(p.state.mission),
    playing = p.state.phase === 'playing'
  const unit = p.state.units.find((u) => u.pad === p.selected)
  const context = p.selected !== null || p.requestOpen
  const telemetry = unit ? moduleTelemetry(p.state, unit, p.lens) : null
  const contextKey =
    p.selected === null
      ? p.requestOpen
        ? 'request'
        : ''
      : `${p.selected}:${unit?.id ?? 'empty'}`
  useEffect(() => {
    if (contextKey) {
      setPanel(null)
      card.current?.focus({ preventScroll: true })
    }
  }, [contextKey, p.theater])
  useEffect(() => {
    if (!card.current) return
    const observer = new ResizeObserver(() =>
      p.onCardSize(card.current?.offsetHeight || 340),
    )
    observer.observe(card.current)
    return () => observer.disconnect()
  }, [contextKey, p.theater, p.onCardSize])
  useEffect(() => {
    if (panel)
      drawer.current
        ?.querySelector<HTMLButtonElement>('button')
        ?.focus({ preventScroll: true })
  }, [panel])
  const togglePanel = (next: typeof panel) => {
    p.onDismiss()
    setPanel(panel === next ? null : next)
  }
  const chooseTool = (type: ModuleType) => {
    setPanel(null)
    p.onDismiss()
    p.onTool(p.tool === type ? null : type)
  }
  const remaining = Number.isFinite(mission.duration)
    ? Math.max(0, mission.duration - p.state.time)
    : p.state.time

  if (p.theater)
    return (
      <div className="fusion-theater-return">
        <button onClick={p.onTheater}>
          <Eye size={16} />
          Show controls<kbd>H</kbd>
        </button>
        <button
          onClick={() => p.onAction({ type: playing ? 'pause' : 'resume' })}
          aria-label={playing ? 'Pause game' : 'Resume game'}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
    )

  return (
    <div className="fusion-interface" aria-label="Immersive command interface">
      <section className="fusion-mission" aria-label="Current mission">
        <div className="fusion-mission-overline">
          <span>
            <i />
            LIVE DISTRICT / {String(m.wave).padStart(2, '0')}
          </span>
          <button onClick={p.onMissions} aria-label="Choose mission">
            <Map size={15} />
          </button>
        </div>
        <button
          className="fusion-mission-name"
          onClick={() => setMissionExpanded(!missionExpanded)}
          aria-expanded={missionExpanded}
        >
          <span>{mission.name}</span>
          <ChevronDown size={15} />
        </button>
        <div className="fusion-mission-progress">
          <span>
            <b data-testid="fusion-served">{p.state.served}</b>
            <small>
              {' '}
              / {Number.isFinite(mission.goal) ? mission.goal : '∞'} delivered
            </small>
          </span>
          <span>
            {p.state.lost ? p.state.lost + ' lost' : 'All systems in reach'}
          </span>
        </div>
        <div className="fusion-progress-line">
          <i
            style={{
              width: `${Number.isFinite(mission.goal) ? Math.min(100, (p.state.served / mission.goal) * 100) : p.state.integrity}%`,
            }}
          />
        </div>
        {missionExpanded && (
          <div className="fusion-mission-expanded">
            <p>{mission.brief}</p>
            {p.checks.slice(1).map((c) => (
              <span key={c.label} className={c.done ? 'complete' : ''}>
                {c.done ? <Check size={12} /> : <Target size={12} />} {c.label}
              </span>
            ))}
            <small>
              Score {p.state.score.toLocaleString()} ·{' '}
              {m.averageLatency.toFixed(1)}s mean latency
            </small>
          </div>
        )}
      </section>

      <section className="fusion-resources" aria-label="Fleet resources">
        <div>
          <Coins size={15} />
          <span>
            Credits
            <strong data-testid="fusion-credits">
              {p.state.credits.toLocaleString()}
            </strong>
          </span>
        </div>
        <div>
          <Power size={15} />
          <span>
            Power
            <strong>
              {m.power}
              <small> / {m.maxPower}</small>
            </strong>
          </span>
        </div>
        <div className={p.state.integrity < 35 ? 'danger' : ''}>
          <Heart size={15} />
          <span>
            Integrity
            <strong>
              {p.state.integrity}
              <small>%</small>
            </strong>
          </span>
        </div>
        <div>
          <Timer size={15} />
          <span>
            {Number.isFinite(mission.duration) ? 'Shift left' : 'Survived'}
            <strong aria-label="Mission time">{formatTime(remaining)}</strong>
          </span>
        </div>
      </section>

      <nav className="fusion-lenses" aria-label="World data lenses">
        {(Object.keys(FUSION_LENSES) as FusionLens[]).map((lens, i) => {
          const Icon = [Activity, HardDrive, Network][i]
          return (
            <button
              key={lens}
              onClick={() => p.onLens(lens)}
              aria-pressed={p.lens === lens}
              aria-label={`${FUSION_LENSES[lens].name} lens`}
              style={
                {
                  '--lens-color': FUSION_LENSES[lens].color,
                } as React.CSSProperties
              }
            >
              <Icon size={13} />
              <span>{['Flow', 'Memory', 'Fabric'][i]}</span>
            </button>
          )
        })}
      </nav>
      <div className="fusion-legend">
        <i style={{ background: FUSION_LENSES[p.lens].color }} />
        <span>{FUSION_LENSES[p.lens].description}</span>
      </div>

      <nav className="fusion-camera-rail" aria-label="Spatial camera controls">
        <button
          onClick={() => p.onView('overview')}
          aria-label="Overview camera"
          aria-pressed={p.view === 'overview' && !p.follow}
          data-tip="Overview · R"
        >
          <Box size={17} />
        </button>
        <button
          onClick={() => p.onView('top')}
          aria-label="Top-down camera"
          aria-pressed={p.view === 'top' && !p.follow}
          data-tip="Top-down"
        >
          <Layers3 size={17} />
        </button>
        <button
          onClick={() => p.onView('orbit')}
          aria-label="Orbit camera"
          aria-pressed={p.view === 'orbit'}
          disabled={
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          }
          data-tip="Cinematic orbit"
        >
          <Orbit size={17} />
        </button>
        <i />
        <button
          onClick={() => p.onZoom(1)}
          aria-label="Zoom game in"
          data-tip="Move closer"
        >
          <Plus size={17} />
        </button>
        <button
          onClick={() => p.onZoom(-1)}
          aria-label="Zoom game out"
          data-tip="Pull back"
        >
          <Minus size={17} />
        </button>
        <button
          onClick={p.onLabels}
          aria-label={p.labels ? 'Hide world labels' : 'Show world labels'}
          aria-pressed={p.labels}
          data-tip="World labels"
        >
          {p.labels ? <Eye size={17} /> : <EyeOff size={17} />}
        </button>
        <button
          onClick={p.onTheater}
          aria-label="Enter cinema mode"
          data-tip="Cinema mode · H"
        >
          <Maximize2 size={16} />
        </button>
      </nav>

      {p.job && !context && (
        <button
          className="fusion-request-peek"
          onClick={p.onOpenRequest}
          aria-label="Select live request"
        >
          <span>
            <Crosshair size={14} />
            LIVE PAYLOAD
            <ArrowUpRight size={14} />
          </span>
          <strong>
            REQ {String(p.job.id).padStart(3, '0')}
            <em>{REQUEST_STAGES[p.job.phase].label}</em>
          </strong>
          <small>
            {p.job.input.toLocaleString()} prompt tokens ·{' '}
            {Math.floor(p.job.generated)} / {p.job.output} output
          </small>
        </button>
      )}

      {context && (
        <>
          <div className="fusion-world-reticle" aria-hidden="true">
            <i />
            <span>{p.selected !== null ? PADS[p.selected].name : 'LIVE'}</span>
          </div>
          <div className="fusion-world-tether" aria-hidden="true" />
          <div
            ref={card}
            tabIndex={-1}
            className={`fusion-spatial-card ${p.requestOpen ? 'is-request' : ''} ${unit ? 'has-unit' : 'is-construction'}`}
            role="region"
            aria-label={
              p.requestOpen
                ? 'Spatial request inspector'
                : unit
                  ? `Spatial ${MODULES[unit.type].name} controls`
                  : `Build in sector ${p.selected !== null ? PADS[p.selected].name : ''}`
            }
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.stopPropagation()
                p.onDismiss()
              }
            }}
            style={
              {
                '--context-color': unit ? MODULES[unit.type].color : '#c9ee87',
              } as React.CSSProperties
            }
          >
            <div className="fusion-context-top">
              <span>
                <i />
                {p.requestOpen
                  ? 'REQUEST / LIVE STATE'
                  : `SECTOR ${p.selected !== null ? PADS[p.selected].name : ''} / ${unit ? 'ONLINE MODULE' : 'OPEN TERRAIN'}`}
              </span>
              <button onClick={p.onDismiss} aria-label="Close spatial controls">
                <X size={17} />
              </button>
            </div>
            {p.requestOpen ? (
              <>
                <RequestLens
                  state={p.state}
                  job={p.job}
                  onSelect={p.onRequest}
                  onPause={() => p.onAction({ type: 'pause' })}
                />
                <div className="fusion-context-actions">
                  <button
                    className={`fusion-primary ${p.follow ? 'following' : ''}`}
                    onClick={p.onFollow}
                    disabled={!p.job}
                  >
                    <Orbit size={15} />
                    {p.follow ? 'Stop riding along' : 'Ride alongside request'}
                  </button>
                  <button
                    className="fusion-icon-button"
                    onClick={p.onRequests}
                    aria-label="Inspect live requests"
                  >
                    <Scan size={17} />
                  </button>
                </div>
              </>
            ) : unit && telemetry ? (
              <>
                <div className="fusion-unit-heading">
                  <span>
                    {(() => {
                      const Icon = icons[unit.type]
                      return <Icon size={25} />
                    })()}
                  </span>
                  <div>
                    <h2>{MODULES[unit.type].name}</h2>
                    <small>
                      LEVEL {unit.level} <i />
                      {unitPower(unit)} POWER
                    </small>
                  </div>
                  <button
                    onClick={() => p.onFocus(unit.pad)}
                    aria-label="Focus selected module"
                    className="fusion-icon-button"
                  >
                    <Crosshair size={18} />
                  </button>
                </div>
                <div
                  className="fusion-unit-reading"
                  style={
                    {
                      '--reading-color': telemetry.color,
                    } as React.CSSProperties
                  }
                >
                  <span>
                    {telemetry.label}
                    <strong>{telemetry.value}</strong>
                  </span>
                  <div>
                    <i style={{ width: `${telemetry.ratio * 100}%` }} />
                  </div>
                  <small>{telemetry.detail}</small>
                </div>
                <p className="fusion-module-lesson">
                  {MODULES[unit.type].lesson}
                </p>
                <div className="fusion-unit-capacity">
                  <span>Installed capacity</span>
                  <strong>
                    {unit.type === 'prefill'
                      ? `${Math.round(prefillRate(unit))} input tok/s`
                      : unit.type === 'decode'
                        ? `${Math.round(decodeRate(unit))} output tok/s`
                        : unit.type === 'cache'
                          ? `${unit.level * 2048} MiB`
                          : `+${unit.level * 200} Gb/s`}
                  </strong>
                </div>
                <div className="fusion-context-actions">
                  {unit.offlineUntil > p.state.time ? (
                    <button
                      className="fusion-primary"
                      onClick={() =>
                        p.onAction({ type: 'repair', unit: unit.id })
                      }
                    >
                      <Wrench size={15} />
                      Repair now · 40
                    </button>
                  ) : (
                    <button
                      className="fusion-primary"
                      onClick={() =>
                        p.onAction({ type: 'upgrade', unit: unit.id })
                      }
                      disabled={unit.level >= 3}
                    >
                      <Plus size={15} />
                      {unit.level >= 3
                        ? 'Maximum level'
                        : `Upgrade · ${upgradeCost(unit)}`}
                    </button>
                  )}
                  <button
                    className="fusion-icon-button fusion-recycle"
                    aria-label={`Recycle for ${Math.floor(unit.invested * 0.6)} credits`}
                    title={`Recycle for ${Math.floor(unit.invested * 0.6)} credits`}
                    onClick={() => {
                      const next = p.onAction({ type: 'sell', unit: unit.id })
                      if (!next.units.some((u) => u.id === unit.id))
                        p.onDismiss()
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2>Make the next connection.</h2>
                <p>Choose what belongs here. Every module changes the flow.</p>
                <div className="fusion-construction-grid">
                  {modules.map((type) => {
                    const Icon = icons[type],
                      spec = MODULES[type]
                    return (
                      <button
                        key={type}
                        onClick={() =>
                          p.selected !== null && p.onBuild(type, p.selected)
                        }
                        aria-label={`Install ${spec.name}`}
                        style={
                          {
                            '--module-color': spec.color,
                          } as React.CSSProperties
                        }
                      >
                        <span>
                          <Icon size={22} />
                          <small>
                            <Coins size={10} />
                            {spec.cost}
                          </small>
                        </span>
                        <strong>{spec.name}</strong>
                        <em>{spec.description}</em>
                      </button>
                    )
                  })}
                </div>
                <span className="fusion-construction-note">
                  <Power size={12} />
                  {m.maxPower - m.power} power available · {p.state.credits}{' '}
                  credits
                </span>
              </>
            )}
          </div>
        </>
      )}

      {p.follow && (
        <div className="fusion-follow-badge">
          <Orbit size={14} />
          <span>
            RIDING WITH REQ {p.job ? String(p.job.id).padStart(3, '0') : '—'}
          </span>
          <button onClick={p.onFollow}>
            Leave orbit
            <X size={13} />
          </button>
        </div>
      )}
      {p.state.phase === 'paused' && (
        <div className="fusion-pause-badge">
          <Pause size={13} />
          <span>
            TIME IS YOURS<small>Build and inspect while paused.</small>
          </span>
          <button onClick={() => p.onAction({ type: 'resume' })}>
            Resume
            <Play size={12} />
          </button>
        </div>
      )}

      <div className="fusion-control-deck">
        <div className="fusion-deck-overline">
          <span>
            <i />
            {p.tool
              ? `${MODULES[p.tool].short} ARMED · SELECT A HEX`
              : 'YOUR DISTRICT. YOUR DECISIONS.'}
          </span>
          <small>
            DRAG TO ORBIT <i /> SCROLL TO EXPLORE
          </small>
        </div>
        <div className="fusion-dock">
          <div className="fusion-playback">
            <button
              className="fusion-play"
              onClick={() => p.onAction({ type: playing ? 'pause' : 'resume' })}
              aria-label={playing ? 'Pause game' : 'Resume game'}
            >
              {playing ? <Pause size={19} /> : <Play size={19} />}
            </button>
            <button
              onClick={p.onSpeed}
              aria-label="Toggle game speed"
              className={p.speed === 2 ? 'active' : ''}
            >
              {p.speed}×
            </button>
          </div>
          <i className="fusion-dock-divider" />
          <div className="fusion-build-tools">
            {modules.map((type, i) => {
              const Icon = icons[type],
                spec = MODULES[type]
              return (
                <button
                  key={type}
                  onClick={() => chooseTool(type)}
                  aria-label={`Build ${spec.name}`}
                  aria-pressed={p.tool === type}
                  style={
                    { '--module-color': spec.color } as React.CSSProperties
                  }
                >
                  <Icon size={20} />
                  <span>
                    {spec.short}
                    <small>{spec.cost} credits</small>
                  </span>
                  <kbd>{i + 1}</kbd>
                </button>
              )
            })}
          </div>
          <i className="fusion-dock-divider" />
          <div className="fusion-system-tools">
            <button
              onClick={() => togglePanel('research')}
              aria-label="Open operations research"
              aria-expanded={panel === 'research'}
              data-tip="Research"
            >
              <FlaskConical size={18} />
            </button>
            <button
              onClick={() => togglePanel('sectors')}
              aria-label="Open sector grid"
              aria-expanded={panel === 'sectors'}
              data-tip="Sector access"
            >
              <Grid2X2 size={18} />
            </button>
            <button
              onClick={() => togglePanel('telemetry')}
              aria-label="Open service telemetry"
              aria-expanded={panel === 'telemetry'}
              data-tip="Service telemetry"
            >
              <Activity size={18} />
            </button>
            <button
              onClick={p.onOpenRequest}
              aria-label="Trace live request"
              data-tip="Trace a request"
            >
              <Crosshair size={18} />
            </button>
            <button
              onClick={p.onMenu}
              aria-label="Game menu"
              data-tip="Mission control"
            >
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </div>
      {p.tool ? (
        <div className="fusion-tool-hint">
          <span style={{ background: MODULES[p.tool].color }} />
          {MODULES[p.tool].name} selected
          <button onClick={() => p.onTool(null)}>
            Cancel
            <X size={12} />
          </button>
        </div>
      ) : (
        !context &&
        !panel && <p className="fusion-world-hint">{serviceHint(p.state)}</p>
      )}

      {panel && (
        <section
          ref={drawer}
          className="fusion-drawer"
          aria-label={
            panel === 'research'
              ? 'Operations research'
              : panel === 'sectors'
                ? 'Accessible sector grid'
                : 'Live service telemetry'
          }
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.stopPropagation()
              setPanel(null)
            }
          }}
        >
          <div className="fusion-drawer-heading">
            <span>
              <i />
              {panel === 'research'
                ? 'EVOLVE THE SERVICE'
                : panel === 'sectors'
                  ? 'SIXTEEN WAYS FORWARD'
                  : 'THE SERVICE, IN NUMBERS'}
            </span>
            <button
              onClick={() => setPanel(null)}
              aria-label="Close command drawer"
            >
              <X size={17} />
            </button>
          </div>
          <h2>
            {panel === 'research'
              ? 'Smarter beats bigger.'
              : panel === 'sectors'
                ? 'Choose a sector.'
                : 'Read the pressure.'}
          </h2>
          {panel === 'research' ? (
            <div className="fusion-research-list">
              {[
                {
                  id: 'batching' as const,
                  Icon: Layers3,
                  name: 'Continuous batching',
                  detail: 'Share decode iterations across active sequences.',
                  cost: 85,
                  done: p.state.batching,
                },
                {
                  id: 'prefix' as const,
                  Icon: HardDrive,
                  name: 'Prefix reuse',
                  detail:
                    'Reuse exact, tenant-scoped warm prefixes. Reserves 256 MiB.',
                  cost: 70,
                  done: p.state.prefixReuse,
                },
                {
                  id: 'power' as const,
                  Icon: Power,
                  name: 'Power headroom',
                  detail: `Add 8 power capacity. ${p.state.powerUpgrades} of 3 upgrades installed.`,
                  cost: 120,
                  done: p.state.powerUpgrades >= 3,
                },
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() =>
                    p.onAction({ type: 'research', research: r.id })
                  }
                  disabled={r.done}
                >
                  <r.Icon size={20} />
                  <span>
                    <strong>{r.name}</strong>
                    <small>{r.detail}</small>
                  </span>
                  <b>{r.done ? <Check size={15} /> : r.cost}</b>
                </button>
              ))}
            </div>
          ) : panel === 'sectors' ? (
            <>
              <p>
                Every hex has a keyboard and touch equivalent. Select one to
                build or inspect in the world.
              </p>
              <div className="fusion-access-grid">
                {PADS.map((pad) => {
                  const u = p.state.units.find((u) => u.pad === pad.id)
                  return (
                    <button
                      key={pad.id}
                      onClick={() => p.onPad(pad.id)}
                      aria-label={`Grid sector ${pad.name}${u ? `: ${MODULES[u.type].name}` : ': empty'}`}
                      style={
                        {
                          '--module-color': u
                            ? MODULES[u.type].color
                            : '#667f8c',
                        } as React.CSSProperties
                      }
                    >
                      <strong>{pad.name}</strong>
                      <small>{u ? MODULES[u.type].short : 'OPEN HEX'}</small>
                    </button>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <div className="fusion-telemetry-stats">
                <div>
                  <span>Queued</span>
                  <strong>{m.queued}</strong>
                </div>
                <div>
                  <span>Active handoffs</span>
                  <strong>{m.transfers}</strong>
                </div>
                <div>
                  <span>Useful line rate</span>
                  <strong>
                    {Math.round(m.bandwidth * 0.7)} <small>Gb/s</small>
                  </strong>
                </div>
                <div>
                  <span>Mean latency</span>
                  <strong>
                    {m.averageLatency.toFixed(1)}
                    <small>s</small>
                  </strong>
                </div>
                <div>
                  <span>KV reservation</span>
                  <strong>
                    {Math.round(m.used)}
                    <small> / {m.memory} MiB</small>
                  </strong>
                </div>
                <div>
                  <span>Prefix hits</span>
                  <strong>{p.state.prefixHits}</strong>
                </div>
              </div>
              <h3>Live request stream</h3>
              <div className="fusion-live-requests">
                {p.state.jobs
                  .filter((j) => j.phase !== 'done')
                  .slice(0, 8)
                  .map((j) => (
                    <button
                      key={j.id}
                      onClick={() => {
                        setPanel(null)
                        p.onRequest(j.id)
                        p.onOpenRequest()
                      }}
                    >
                      <span>
                        REQ {String(j.id).padStart(3, '0')}
                        <small>
                          Tenant {j.tenant + 1} · {j.input.toLocaleString()}{' '}
                          input tokens
                        </small>
                      </span>
                      <em>{REQUEST_STAGES[j.phase].label}</em>
                      <ArrowRight size={13} />
                    </button>
                  ))}
                {!p.state.jobs.some((j) => j.phase !== 'done') && (
                  <p>The next request is on its way.</p>
                )}
              </div>
            </>
          )}
          <div className="fusion-drawer-foot">
            <Radio size={12} />
            {playing
              ? 'The shift continues while this drawer is open.'
              : 'The shift is paused. Take your time.'}
          </div>
        </section>
      )}
      <button
        className="fusion-fullscreen"
        onClick={p.onFullscreen}
        aria-label="Fullscreen game"
      >
        <Scan size={14} />
        <span>EXPAND THE WORLD</span>
      </button>
    </div>
  )
}
