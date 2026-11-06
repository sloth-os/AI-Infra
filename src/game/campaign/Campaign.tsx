import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Box,
  Check,
  Cloud,
  ChevronRight,
  Cpu,
  Gauge,
  Globe2,
  HardDrive,
  Layers3,
  Maximize2,
  Minus,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Server,
  ShieldCheck,
  Star,
  X,
  Zap,
} from 'lucide-react'
import { InfrastructureScene } from '../../components/InfrastructureScene'
import type { SceneHandle } from '../../components/InfrastructureScene'
import { VisualSettings } from '../../components/VisualSettings'
import type { Layer } from '../../content'
import { lifecycleSources } from '../../lifecycle/catalog'
import type { LifecyclePhase, PostMethod } from '../../lifecycle/catalog'
import {
  CAMPAIGN_LEVELS,
  CAMPAIGN_PHASES,
  DECISIONS,
  LEVEL_LESSONS,
  LEVEL_NAMES,
  METHOD_NOTES,
  PHASE_NAMES,
} from './catalog'
import {
  contractState,
  createOperation,
  defaultConfiguration,
  earnedProgress,
  operationMetrics,
  operationReducer,
  readCampaignProgress,
} from './model'
import type { CampaignProgress, OperationAction, OperationState } from './model'
import { campaignFrame } from './scene'
import { ProviderUI } from '../provider/ProviderUI'
import { ScenarioSwitch } from '../provider/ScenarioSwitch'
import { useProvider } from '../provider/useProvider'
import './campaign.css'

const STORAGE = 'strata-lifecycle-campaign-v1'
const icons = { fleet: Globe2, pod: Network, rack: Server, gpu: Cpu }
function initialPhase(): LifecyclePhase {
  const phase = new URLSearchParams(location.search).get('operation')
  return CAMPAIGN_PHASES.includes(phase as LifecyclePhase)
    ? (phase as LifecyclePhase)
    : 'pretrain'
}
function initialLevel(): Layer {
  const level = new URLSearchParams(location.search).get('gameLevel')
  return level === 'server'
    ? 'rack'
    : CAMPAIGN_LEVELS.includes(level as Layer)
      ? (level as Layer)
      : 'fleet'
}
function loadProgress() {
  try {
    return readCampaignProgress(localStorage.getItem(STORAGE))
  } catch {
    return {}
  }
}
function compact(value: number, suffix = '') {
  return `${value.toLocaleString('en-US', { maximumFractionDigits: value < 10 ? 2 : 1 })}${suffix}`
}
export default function LifecycleCampaign({
  active,
  onServing,
  onLearn,
}: {
  active: boolean
  onServing: () => void
  onLearn: () => void
}) {
  const [phase, setPhase] = useState<LifecyclePhase>(initialPhase),
    [level, setLevel] = useState<Layer>(initialLevel)
  const [cloudMode, setCloudMode] = useState(
    () =>
      new URLSearchParams(location.search).get('scenario') === 'cloud-provider',
  )
  const cloud = useProvider(active && cloudMode, level)
  useEffect(() => {
    if (!active) return
    const query = new URLSearchParams(location.search)
    if (query.get('scenario') === 'cloud-provider') {
      setCloudMode(true)
      if (query.has('gameLevel')) setLevel(initialLevel())
    }
  }, [active])
  const [runs, setRuns] = useState<Record<LifecyclePhase, OperationState>>(
    () => ({
      pretrain: createOperation('pretrain'),
      posttrain: createOperation('posttrain'),
      inference: createOperation('inference'),
    }),
  )
  const [saved, setSaved] = useState<CampaignProgress>(loadProgress)
  const [panel, setPanel] = useState(true),
    [help, setHelp] = useState(false),
    [sources, setSources] = useState(false),
    [cinema, setCinema] = useState(false),
    [follow, setFollow] = useState(false),
    [labels, setLabels] = useState(true),
    [speed, setSpeed] = useState(1)
  const scene = useRef<SceneHandle>(null),
    root = useRef<HTMLElement>(null),
    workshop = useRef<HTMLElement>(null)
  const s = runs[phase],
    metrics = useMemo(() => operationMetrics(s), [s]),
    baseline = useMemo(
      () => operationMetrics(s, defaultConfiguration(phase)),
      [s, phase],
    )
  const current = metrics.stages[s.stage],
    lesson = LEVEL_LESSONS[phase][level],
    contract = contractState(s, level)
  const done = CAMPAIGN_LEVELS.filter((l) => s.evidence[l] >= 2).length
  const modelFrame = useMemo(
    () => campaignFrame(s, level),
    [
      phase,
      level,
      s.method,
      s.config,
      s.stage,
      s.status,
      s.cycles,
      s.policyVersion,
      s.warm,
    ],
  )
  const frame = cloudMode ? cloud.frame : modelFrame
  const dispatch = useCallback(
    (action: OperationAction) =>
      setRuns((previous) => ({
        ...previous,
        [phase]: operationReducer(previous[phase], action),
      })),
    [phase],
  )
  const visit = useCallback(
    (next: Layer, manual = true) => {
      setLevel(next)
      if (!cloudMode) dispatch({ type: 'visit', level: next })
      if (manual) setFollow(false)
    },
    [dispatch, cloudMode],
  )
  const selectPhase = (next: LifecyclePhase) => {
    dispatch({ type: 'pause' })
    setPhase(next)
    setRuns((previous) => ({
      ...previous,
      [next]: operationReducer(previous[next], { type: 'visit', level }),
    }))
    setFollow(false)
  }
  const toggle = useCallback(
    () => dispatch({ type: s.status === 'running' ? 'pause' : 'run' }),
    [dispatch, s.status],
  )
  const toggleRide = useCallback(() => {
    if (!follow) setPanel(false)
    setFollow(!follow)
  }, [follow])
  useEffect(() => {
    if (!active || cloudMode || s.status !== 'running') return
    let raf = 0,
      last = performance.now(),
      accumulated = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.5, Math.max(0, (now - last) / 1000))
      last = now
      if (document.hidden) return
      accumulated += dt * speed
      if (accumulated >= 0.1) {
        dispatch({ type: 'tick', dt: accumulated })
        accumulated = 0
      }
    }
    const resetClock = () => {
      last = performance.now()
      accumulated = 0
    }
    document.addEventListener('visibilitychange', resetClock)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', resetClock)
    }
  }, [active, cloudMode, s.status, phase, speed, dispatch])
  useEffect(() => {
    if (!active || cloudMode)
      setRuns(
        (previous) =>
          Object.fromEntries(
            CAMPAIGN_PHASES.map((p) => [
              p,
              operationReducer(previous[p], { type: 'pause' }),
            ]),
          ) as Record<LifecyclePhase, OperationState>,
      )
  }, [active, cloudMode])
  useEffect(() => {
    if (active && !cloudMode) dispatch({ type: 'visit', level })
  }, [active, cloudMode, phase, dispatch])
  useEffect(() => {
    if (workshop.current) workshop.current.scrollTop = 0
  }, [phase, level, panel])
  useEffect(() => {
    if (active && !cloudMode && follow && s.status === 'running')
      visit(current.layer, false)
  }, [
    active,
    cloudMode,
    follow,
    phase,
    s.stage,
    s.status,
    current.layer,
    visit,
  ])
  useEffect(() => {
    if (!active) return
    const url = new URL(location.href)
    url.searchParams.set('campaign', 'lifecycle')
    if (cloudMode) {
      url.searchParams.set('scenario', 'cloud-provider')
      url.searchParams.delete('operation')
    } else {
      url.searchParams.delete('scenario')
      url.searchParams.set('operation', phase)
    }
    url.searchParams.set('gameLevel', level === 'rack' ? 'server' : level)
    history.replaceState({}, '', url)
  }, [active, cloudMode, phase, level])
  useEffect(() => {
    const earned = earnedProgress(s)
    if (!Object.keys(earned).length) return
    setSaved((previous) => {
      const next = { ...previous }
      let changed = false
      for (const [key, value] of Object.entries(earned))
        if ((next[key] || 0) < value) {
          next[key] = value
          changed = true
        }
      if (!changed) return previous
      try {
        localStorage.setItem(STORAGE, JSON.stringify(next))
      } catch {
        /* Private mode can disable persistence. */
      }
      return next
    })
  }, [s.evidence.fleet, s.evidence.pod, s.evidence.rack, s.evidence.gpu, phase])
  useEffect(() => {
    if (!active || cloudMode) return
    const key = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(
          (event.target as HTMLElement).tagName,
        )
      )
        return
      if (event.key === 'Escape') {
        setHelp(false)
        setSources(false)
        setCinema(false)
        return
      }
      if (help || sources) return
      if ('1234'.includes(event.key) && event.key.length === 1) {
        event.preventDefault()
        visit(CAMPAIGN_LEVELS[Number(event.key) - 1])
      }
      if (event.code === 'Space') {
        if (['BUTTON', 'A'].includes((event.target as HTMLElement).tagName))
          return
        event.preventDefault()
        toggle()
      }
      if (event.key.toLowerCase() === 'f') toggleRide()
      if (event.key.toLowerCase() === 'h') {
        setFollow(false)
        setPanel((value) => !value)
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [active, cloudMode, help, sources, toggle, visit, toggleRide])
  const selectScenario = useCallback((next: 'model' | 'cloud-provider') => {
    setCloudMode(next === 'cloud-provider')
    setFollow(false)
    setPanel(true)
    setHelp(false)
    setSources(false)
    setCinema(false)
  }, [])
  const back = () => {
    dispatch({ type: 'pause' })
    onServing()
  }
  const learn = () => {
    dispatch({ type: 'pause' })
    if (cloudMode) {
      const url = new URL(location.href)
      url.searchParams.set('provider', 'cloud')
      url.searchParams.set('level', level === 'rack' ? 'server' : level)
      url.searchParams.set('learn', 'fusion')
      history.replaceState({}, '', url)
    }
    onLearn()
  }
  const reset = () => {
    setRuns((previous) => ({
      ...previous,
      [phase]: createOperation(phase, s.method),
    }))
    setFollow(false)
    setLevel('fleet')
  }
  const localMetrics =
    phase === 'pretrain'
      ? level === 'fleet'
        ? [
            ['Useful tokens / modeled second', compact(metrics.rate)],
            [
              'Full-job checkpoint',
              compact(metrics.checkpointBytes / 2 ** 30, ' GiB'),
            ],
          ]
        : level === 'pod'
          ? [
              [
                'Exposed collective time',
                compact(metrics.communicationSeconds * 1000, ' ms'),
              ],
              [
                'Wire volume / rank',
                compact(metrics.wireBytes / 2 ** 30, ' GiB'),
              ],
            ]
          : level === 'rack'
            ? [
                [
                  'State + activations / GPU',
                  compact(metrics.residentGiB, ' GiB'),
                ],
                ['GPipe bubble', compact(metrics.bubble * 100, '%')],
              ]
            : [
                ['HBM pass coefficient', compact(metrics.memoryPass)],
                [
                  'State + activations / GPU',
                  compact(metrics.residentGiB, ' GiB'),
                ],
              ]
      : phase === 'posttrain'
        ? level === 'fleet'
          ? [
              ['Policy version', `v${s.policyVersion}`],
              ['Rejected updates', String(s.rejected)],
            ]
          : level === 'pod'
            ? [
                [
                  'Preparation + learner interval',
                  compact(metrics.pipelineSeconds, ' s'),
                ],
                ['Baseline interval', compact(baseline.pipelineSeconds, ' s')],
              ]
            : level === 'rack'
              ? [
                  [
                    'Resident state / learner',
                    compact(metrics.residentGiB, ' GiB'),
                  ],
                  [
                    'Publication bytes',
                    compact(metrics.wireBytes / 2 ** 20, ' MiB'),
                  ],
                ]
              : [
                  ['Objective valid', metrics.valid ? 'Yes' : 'No'],
                  [
                    'Learner compute estimate',
                    compact(metrics.computeSeconds, ' s'),
                  ],
                ]
        : level === 'fleet'
          ? [
              ['Modeled requests / second', compact(metrics.rate)],
              ['GPUs allocated / quota', `${metrics.allocatedGPUs} / 64`],
            ]
          : level === 'pod'
            ? [
                [
                  'Inter-token service model',
                  compact(metrics.iterationSeconds * 1000, ' ms'),
                ],
                [
                  'Inter-pool KV / cohort',
                  compact(metrics.wireBytes / 2 ** 30, ' GiB'),
                ],
              ]
            : level === 'rack'
              ? [
                  ['Requests per cohort', String(metrics.work)],
                  [
                    'Modeled first-token time',
                    compact(metrics.ttftSeconds, ' s'),
                  ],
                ]
              : [
                  [
                    'KV demand / rank, including warm state',
                    compact(metrics.kvGiB, ' GiB'),
                  ],
                  ['KV-only allowance / rank', '24 GiB'],
                ]
  const comparison =
    phase === 'pretrain'
      ? level === 'pod'
        ? [
            compact(baseline.communicationSeconds * 1000, ' ms'),
            compact(metrics.communicationSeconds * 1000, ' ms'),
          ]
        : level === 'rack'
          ? [
              compact(baseline.residentGiB, ' GiB'),
              compact(metrics.residentGiB, ' GiB'),
            ]
          : level === 'gpu'
            ? [compact(baseline.memoryPass), compact(metrics.memoryPass)]
            : [
                compact(baseline.rate, ' useful tok/s'),
                compact(metrics.rate, ' useful tok/s'),
              ]
      : phase === 'posttrain'
        ? level === 'rack'
          ? [
              compact(baseline.residentGiB, ' GiB'),
              compact(metrics.residentGiB, ' GiB'),
            ]
          : level === 'gpu'
            ? [
                'Invalid objective',
                metrics.valid ? 'Valid objective' : 'Invalid objective',
              ]
            : level === 'pod'
              ? [
                  compact(baseline.pipelineSeconds, ' s'),
                  compact(metrics.pipelineSeconds, ' s'),
                ]
              : [
                  compact(baseline.rate, ' useful tok/s'),
                  compact(metrics.rate, ' useful tok/s'),
                ]
        : level === 'pod'
          ? [
              compact(baseline.iterationSeconds * 1000, ' ms'),
              compact(metrics.iterationSeconds * 1000, ' ms'),
            ]
          : level === 'gpu'
            ? [compact(baseline.memoryPass), compact(metrics.memoryPass)]
            : [
                compact(baseline.rate, ' req/s'),
                compact(metrics.rate, ' req/s'),
              ]
  return (
    <section
      ref={root}
      hidden={!active}
      className={`campaign-game ${cloudMode ? 'is-provider' : ''} ${cinema ? 'campaign-cinema' : ''}`}
      aria-label="AI lifecycle campaign"
      data-scenario={cloudMode ? 'cloud-provider' : 'model'}
      data-phase={phase}
      data-level={level}
      data-status={cloudMode ? cloud.state.status : s.status}
      data-time={(cloudMode ? cloud.state.time : s.time).toFixed(2)}
      data-cycles={s.cycles}
      data-produced={cloudMode ? cloud.state.served : s.produced}
      data-training-jobs={cloudMode ? cloud.state.completed.train : undefined}
      data-tuning-jobs={cloudMode ? cloud.state.completed.tune : undefined}
      data-contracts={cloudMode ? cloud.metrics.contracts : undefined}
      data-rejected={s.rejected}
      data-stage={cloudMode ? cloud.job.state : current.id}
    >
      <div className="campaign-world">
        <InfrastructureScene
          testId="campaign-scene"
          ref={scene}
          active={active}
          immersive
          layer={level}
          traffic={frame.traffic}
          selected={frame.node}
          paused={(cloudMode ? cloud.state.status : s.status) !== 'running'}
          context={frame}
          contextProgress={cloudMode ? cloud.progress : s.progress}
          showLabels={labels && !cinema}
          onSelect={(id) => {
            scene.current?.focus(id)
            setPanel(true)
            setFollow(false)
          }}
          onContextInspect={() => setPanel(true)}
          onCameraRelease={() => setFollow(false)}
        />
      </div>
      {active && !cloudMode && (
        <>
          <header className="campaign-header">
            <button onClick={back} aria-label="Return to serving district">
              <Layers3 size={23} />
              <span>
                strata<span>.</span>
                <small>LIFECYCLE COMMAND</small>
              </span>
            </button>
            <nav aria-label="Game lifecycle phases">
              {CAMPAIGN_PHASES.map((p) => (
                <button
                  key={p}
                  aria-pressed={phase === p}
                  onClick={() => selectPhase(p)}
                >
                  <span>{PHASE_NAMES[p]}</span>
                  <small>
                    {CAMPAIGN_LEVELS.filter((l) => saved[`${p}:${l}`]).length}/4
                  </small>
                </button>
              ))}
            </nav>
            <div className="campaign-header-tools">
              <ScenarioSwitch value="model" onChange={selectScenario} />
              <button onClick={learn} aria-label="Learning mode">
                <BookOpen size={17} />
              </button>
              <button
                onClick={() => {
                  dispatch({ type: 'pause' })
                  setHelp(true)
                }}
                aria-label="Campaign instructions"
              >
                <ShieldCheck size={17} />
              </button>
              <button onClick={back} aria-label="Serving district">
                <ArrowLeft size={17} />
              </button>
            </div>
          </header>
          {!cinema && (
            <>
              <div className="campaign-heading">
                <span>12 CONTRACTS · THREE PHASES · FOUR SCALES</span>
                <h1>
                  {phase === 'pretrain'
                    ? 'Build the next parameter version.'
                    : phase === 'posttrain'
                      ? 'Make every learning signal count.'
                      : 'Turn capacity into responsive answers.'}
                </h1>
                <p>{metrics.source}</p>
                <button
                  className="campaign-cloud-launch"
                  onClick={() => selectScenario('cloud-provider')}
                >
                  <Cloud size={12} />
                  Play as the cloud provider
                  <ChevronRight size={12} />
                </button>
              </div>
              <div className="campaign-score" aria-label="Operation telemetry">
                <div>
                  <small>ENGINEERING CREDITS</small>
                  <strong>{s.credits}</strong>
                </div>
                <div>
                  <small>
                    {phase === 'inference'
                      ? 'REQUESTS DELIVERED'
                      : 'UPDATES COMMITTED'}
                  </small>
                  <strong data-testid="campaign-produced">{s.produced}</strong>
                </div>
                <div>
                  <small>VERIFIED CONTRACTS</small>
                  <strong>
                    {done}
                    <em>/4</em>
                  </strong>
                </div>
                <div>
                  <small>GAME CLOCK</small>
                  <strong>
                    {s.time.toFixed(1)}
                    <em>s</em>
                  </strong>
                </div>
              </div>
              <nav
                className="campaign-scale"
                aria-label="Game infrastructure scale"
              >
                {CAMPAIGN_LEVELS.map((l, i) => {
                  const Icon = icons[l],
                    state = contractState(s, l)
                  return (
                    <button
                      key={l}
                      aria-label={`${i + 1} ${LEVEL_NAMES[l]} game level`}
                      aria-pressed={level === l}
                      onClick={() => visit(l)}
                      className={state.done ? 'contract-complete' : ''}
                    >
                      <Icon size={20} />
                      <span>
                        {LEVEL_NAMES[l]}
                        <small>
                          {state.done
                            ? 'VERIFIED'
                            : `${state.evidence}/2 work cycles`}
                        </small>
                      </span>
                      <b>{state.done ? <Check size={14} /> : i + 1}</b>
                      {saved[`${phase}:${l}`] && (
                        <i aria-label="Personal best earned">
                          <Star size={9} fill="currentColor" />
                        </i>
                      )}
                    </button>
                  )
                })}
              </nav>
              <div
                className={`campaign-status ${metrics.blocked ? 'is-blocked' : ''}`}
                role="status"
              >
                <span>
                  <Zap size={13} />
                  {metrics.blocked
                    ? 'ADMISSION BLOCKED'
                    : s.status === 'won'
                      ? 'OPERATION COMPLETE'
                      : s.status === 'running'
                        ? 'WORK IN FLIGHT'
                        : 'PLAN → RUN → VERIFY'}
                </span>
                <strong>{metrics.blocked || s.feedback}</strong>
                {metrics.blocked && (
                  <button
                    onClick={() => {
                      visit(phase === 'inference' ? 'gpu' : 'rack')
                      setPanel(true)
                    }}
                  >
                    Inspect the residency bottleneck
                    <ArrowRight size={12} />
                  </button>
                )}
              </div>
              <nav
                className="campaign-camera"
                aria-label="Campaign camera controls"
              >
                <button
                  aria-label="Campaign isometric camera"
                  onClick={() => scene.current?.view('isometric')}
                >
                  <Box size={17} />
                </button>
                <button
                  aria-label="Campaign top down camera"
                  onClick={() => scene.current?.view('top')}
                >
                  <Layers3 size={17} />
                </button>
                <button
                  aria-label="Zoom campaign in"
                  onClick={() => scene.current?.zoom(1)}
                >
                  <Plus size={17} />
                </button>
                <button
                  aria-label="Zoom campaign out"
                  onClick={() => scene.current?.zoom(-1)}
                >
                  <Minus size={17} />
                </button>
                <button
                  aria-label="Toggle campaign labels"
                  aria-pressed={labels}
                  onClick={() => setLabels((v) => !v)}
                >
                  <Gauge size={17} />
                </button>
                <button
                  aria-label="Campaign cinema mode"
                  onClick={() => setCinema(true)}
                >
                  <Maximize2 size={17} />
                </button>
              </nav>
              {panel && (
                <aside
                  ref={workshop}
                  className="campaign-panel"
                  aria-label="Level performance workshop"
                >
                  <div className="campaign-panel-top">
                    <span>
                      {LEVEL_NAMES[level].toUpperCase()} /{' '}
                      {PHASE_NAMES[phase].toUpperCase()}
                    </span>
                    <button
                      onClick={() => setPanel(false)}
                      aria-label="Close performance workshop"
                    >
                      <X size={17} />
                    </button>
                  </div>
                  {metrics.blocked && (
                    <div className="campaign-admission-notice">
                      <strong>{metrics.blocked}</strong>
                      <button
                        onClick={() =>
                          visit(phase === 'inference' ? 'gpu' : 'rack')
                        }
                      >
                        Inspect{' '}
                        {phase === 'inference' ? 'GPU memory' : 'Server state'}
                        <ArrowRight size={12} />
                      </button>
                    </div>
                  )}
                  <h2>{lesson.title}</h2>
                  <p className="campaign-goal">{lesson.goal}</p>
                  <details className="campaign-explanation">
                    <summary>How this level works</summary>
                    <p>{lesson.process}</p>
                  </details>
                  {phase === 'posttrain' && (
                    <>
                      <label className="campaign-method">
                        Learning method
                        <select
                          aria-label="Post-training game method"
                          value={s.method}
                          onChange={(event) =>
                            dispatch({
                              type: 'method',
                              method: event.target.value as PostMethod,
                            })
                          }
                        >
                          {(['sft', 'dpo', 'grpo'] as PostMethod[]).map(
                            (method) => (
                              <option key={method} value={method}>
                                {method.toUpperCase()}
                              </option>
                            ),
                          )}
                        </select>
                      </label>
                      <p>{METHOD_NOTES[s.method]}</p>
                      {level === 'pod' && (
                        <p className="campaign-roles">
                          {s.method === 'sft' ? (
                            'Offline SFT: eight learner GPU workers; no rollout generation.'
                          ) : s.method === 'dpo' ? (
                            'Offline DPO: two frozen reference workers and six learner workers; no rollout generation.'
                          ) : (
                            <>
                              <span style={{ color: '#c4abe9' }}>
                                Purple: {s.config.roles} rollout workers.
                              </span>{' '}
                              <span style={{ color: '#b5d79b' }}>
                                Green: {8 - Number(s.config.roles)} learner
                                workers.
                              </span>
                            </>
                          )}
                        </p>
                      )}
                    </>
                  )}
                  <div
                    className="campaign-local-metrics"
                    aria-label="Level performance readout"
                  >
                    {localMetrics.map(([label, value]) => (
                      <div key={label}>
                        <small>{label}</small>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  {DECISIONS[phase]
                    .filter((d) => d.level === level)
                    .map((decision) => (
                      <section className="campaign-decision" key={decision.id}>
                        <h3>{decision.title}</h3>
                        <details className="campaign-explanation">
                          <summary>Why this intervention matters</summary>
                          <p>{decision.detail}</p>
                        </details>
                        <div role="group" aria-label={decision.title}>
                          {decision.options.map((option) => {
                            const owned = s.unlocked.includes(
                                `${decision.id}:${option.id}`,
                              ),
                              cost = owned ? 0 : option.cost
                            return (
                              <button
                                key={option.id}
                                aria-label={`Set ${decision.title}: ${option.title}`}
                                aria-pressed={
                                  s.config[decision.id] === option.id
                                }
                                disabled={
                                  s.status === 'won' ||
                                  s.status === 'lost' ||
                                  (decision.id === 'roles' &&
                                    s.method !== 'grpo') ||
                                  cost > s.credits
                                }
                                onClick={() =>
                                  dispatch({
                                    type: 'choose',
                                    decision: decision.id,
                                    option: option.id,
                                  })
                                }
                              >
                                <span>
                                  {option.title}
                                  <b>
                                    {decision.id === 'roles' &&
                                    s.method !== 'grpo'
                                      ? 'GRPO ONLY'
                                      : s.config[decision.id] === option.id
                                        ? 'ACTIVE'
                                        : cost
                                          ? `${cost} CREDITS`
                                          : 'AVAILABLE'}
                                  </b>
                                </span>
                                <small>{option.consequence}</small>
                              </button>
                            )
                          })}
                        </div>
                      </section>
                    ))}
                  <div
                    className="campaign-comparison"
                    aria-label="Baseline versus configured performance"
                  >
                    <small>UNCHANGED WORKLOAD · BASELINE → CONFIGURED</small>
                    <strong>
                      <span>{comparison[0]}</span>
                      <ArrowRight size={13} />
                      <span>{comparison[1]}</span>
                    </strong>
                    {baseline.blocked && (
                      <p>
                        Baseline residency does not fit; its timing is an
                        unconstrained estimate.
                      </p>
                    )}
                    <p>
                      Observed: {s.produced} committed{' '}
                      {phase === 'inference' ? 'requests' : 'updates'} /{' '}
                      {s.time.toFixed(1)} game seconds ={' '}
                      {compact(s.time ? s.produced / s.time : 0)} work / game
                      second.
                    </p>
                  </div>
                  <div
                    className={`campaign-contract ${contract.done ? 'is-complete' : ''}`}
                  >
                    <span>
                      <ShieldCheck size={14} />
                      {contract.done
                        ? 'VERIFIED WITH COMPLETED WORK'
                        : 'PERFORMANCE CONTRACT'}
                    </span>
                    <p>{lesson.goal}</p>
                    <div>
                      <b>{contract.evidence} / 2</b>
                      <small>
                        {contract.eligible
                          ? 'Configuration qualifies. Run work to verify it.'
                          : 'Change the limiting resource, then run work.'}
                      </small>
                    </div>
                  </div>
                  {phase === 'posttrain' && level === 'gpu' && (
                    <div className="campaign-objective-readout">
                      <strong>
                        {s.method === 'grpo'
                          ? 'Actual group-relative advantages'
                          : s.method === 'dpo'
                            ? 'Illustrative DPO objective'
                            : 'Loss-mask ownership'}
                      </strong>
                      <p>
                        {s.method === 'grpo'
                          ? `[${metrics.advantages.map((x) => x.toFixed(2)).join(', ')}]`
                          : s.method === 'dpo'
                            ? `softplus(−β × (policy gap − reference gap)) = ${metrics.dpo.toFixed(4)}`
                            : s.config.objective === 'valid'
                              ? 'Prompt: masked · Assistant: supervised'
                              : 'Prompt and assistant both included: objective rejected'}
                      </p>
                      <small>
                        These values illustrate objective mechanics. They do not
                        predict model quality.
                      </small>
                    </div>
                  )}
                  <button
                    className="campaign-source-button"
                    onClick={() => {
                      dispatch({ type: 'pause' })
                      setSources(true)
                    }}
                  >
                    <BookOpen size={14} />
                    Sources and model assumptions
                    <ChevronRight size={13} />
                  </button>
                  <small className="campaign-replan-note">
                    Reconfiguring pauses and restarts unfinished work. Completed
                    work stays. Unlocked configurations remain free to revisit.
                  </small>
                </aside>
              )}
            </>
          )}
          <div className="campaign-dock">
            <div className="campaign-live-stage">
              <span>
                <i />
                {s.status === 'running'
                  ? 'LIVE'
                  : s.status.toUpperCase()} / {LEVEL_NAMES[current.layer]}
              </span>
              <strong>{current.title}</strong>
              <small>{Math.floor(s.progress * 100)}%</small>
              <div
                role="progressbar"
                aria-label="Actual operation stage progress"
                aria-valuenow={Math.floor(s.progress * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <i style={{ width: `${s.progress * 100}%` }} />
              </div>
            </div>
            <p className="campaign-payload">{current.payload}</p>
            <nav
              aria-label="Operation work stages"
              className="campaign-stages"
              style={
                {
                  '--stage-count': metrics.stages.length,
                } as React.CSSProperties
              }
            >
              {metrics.stages.map((item, i) => (
                <button
                  key={item.id}
                  aria-label={`Inspect work stage ${i + 1}: ${item.title}`}
                  aria-current={s.stage === i ? 'step' : undefined}
                  onClick={() => visit(item.layer)}
                >
                  <b>{String(i + 1).padStart(2, '0')}</b>
                  <span>
                    {item.title}
                    <small>{LEVEL_NAMES[item.layer]}</small>
                  </span>
                </button>
              ))}
            </nav>
            <div className="campaign-transport">
              <button
                className="campaign-run"
                onClick={toggle}
                disabled={s.status === 'won' || s.status === 'lost'}
                aria-label={
                  s.status === 'running'
                    ? 'Pause operation'
                    : s.status === 'ready'
                      ? 'Start operation'
                      : 'Resume operation'
                }
              >
                {s.status === 'running' ? (
                  <Pause size={16} />
                ) : (
                  <Play size={16} />
                )}
                <span>
                  {s.status === 'running' ? 'Pause' : 'Run operation'}
                </span>
              </button>
              <button
                aria-label="Change operation speed"
                onClick={() =>
                  setSpeed((value) => (value === 1 ? 2 : value === 2 ? 4 : 1))
                }
              >
                {speed}×
              </button>
              <button
                aria-label="Follow work across levels"
                aria-pressed={follow}
                onClick={toggleRide}
              >
                <Network size={15} />
                <span>Ride the work</span>
              </button>
              <span className="campaign-transport-space" />
              <button
                aria-label={
                  panel
                    ? 'Hide performance workshop'
                    : 'Show performance workshop'
                }
                onClick={() => {
                  setPanel((value) => !value)
                  setCinema(false)
                  setFollow(false)
                }}
              >
                <HardDrive size={15} />
                <span>{panel ? 'World' : 'Workshop'}</span>
              </button>
              <button aria-label="Restart current operation" onClick={reset}>
                <RotateCcw size={15} />
              </button>
              {phase === 'pretrain' && (
                <button
                  aria-label="Simulate training worker fault"
                  onClick={() => dispatch({ type: 'fault' })}
                >
                  <Zap size={15} />
                  <span>Recovery drill</span>
                </button>
              )}
              {cinema && (
                <button
                  aria-label="Exit campaign cinema"
                  onClick={() => setCinema(false)}
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
          <span className="campaign-scope-note">
            REFERENCE HARDWARE · ANALYTICAL BYTES · GAME TIMING & CREDITS · NO
            MODEL-QUALITY PREDICTION
          </span>
          {(s.status === 'won' || s.status === 'lost') && (
            <div
              className="campaign-result"
              role="region"
              aria-label={
                s.status === 'won'
                  ? 'Lifecycle operation complete'
                  : 'Lifecycle operation ended'
              }
            >
              <ShieldCheck size={28} />
              <span>
                {s.status === 'won'
                  ? 'FOUR LEVELS. VERIFIED.'
                  : 'REPLAN THE LIMITING RESOURCE'}
              </span>
              <h2>
                {PHASE_NAMES[phase]}{' '}
                {s.status === 'won'
                  ? 'operation complete.'
                  : 'needs another shift.'}
              </h2>
              <p>
                {s.produced}{' '}
                {phase === 'inference'
                  ? 'requests delivered'
                  : 'updates committed'}{' '}
                · {s.time.toFixed(1)} game seconds · {done}/4 contracts verified
              </p>
              <button
                onClick={() =>
                  selectPhase(
                    CAMPAIGN_PHASES[(CAMPAIGN_PHASES.indexOf(phase) + 1) % 3],
                  )
                }
              >
                Next lifecycle phase
                <ArrowRight size={15} />
              </button>
              <button onClick={reset}>
                Replay and compare another strategy
              </button>
            </div>
          )}
          {(help || sources) && (
            <CampaignDialog
              title={
                help
                  ? 'How to play Lifecycle Command'
                  : 'Campaign sources and assumptions'
              }
              onClose={() => {
                setHelp(false)
                setSources(false)
              }}
            >
              {help ? (
                <>
                  <p>
                    Play pre-training, post-training and inference at all four
                    scales. Every phase has four performance contracts; earn
                    each with two actual completed work cycles after a
                    qualifying intervention.
                  </p>
                  <ol>
                    <li>
                      Choose a level or click hardware to inspect its workshop.
                    </li>
                    <li>
                      Buy an intervention with engineering credits. A valid
                      completed cycle earns 35 credits.
                    </li>
                    <li>
                      Run the work. Follow its payload through the pipeline, or
                      keep the camera at one scale.
                    </li>
                    <li>
                      Compare the baseline readouts, live work count and
                      contract evidence. A toggle or a camera visit cannot
                      finish an operation.
                    </li>
                  </ol>
                  <p>
                    Pre-training starts with an HBM bottleneck: try ZeRO-2 and
                    eight microbatches at Server level. Post-training needs
                    valid objective inputs and state that fits. Inference needs
                    balanced batching, memory and token service.
                  </p>
                  <p>
                    Keys 1–4 select scale, Space runs/pauses, F follows work, H
                    hides/restores the workshop. Switching phases or modes
                    pauses work and retains each run. Personal contract medals
                    are stored in this browser.
                  </p>
                  <VisualSettings />
                </>
              ) : (
                <>
                  <p>
                    Tensor/state bytes, DP/TP/PP ownership, the GPipe bubble,
                    K/V accounting and the objective toys reuse the sourced
                    Learning models. Rates are hypothetical coefficients for a
                    playable reference architecture, not GPU benchmarks or
                    capacity-planning predictions.
                  </p>
                  <p>
                    Training uses a 70B job with DP 8 × TP 4 × PP 2;
                    post-training uses 7B and eight GPU workers; inference uses
                    TP 8 per replica and a 64-GPU quota. The displayed fleet is
                    a reference, not the operation’s literal allocation.
                  </p>
                  <p>
                    Declared timing inputs: training 250 TFLOP/s × 35% per GPU;
                    learner 200 TFLOP/s × 35%; prefill 350 TFLOP/s × 50%; useful
                    wire rate 70%; checkpoint storage 80 GB/s. All are toy
                    assumptions. Game stages take 0.35 + 0.18 × modeled seconds.
                    Kernel factors, padding fractions, rewards, currency and
                    deadlines are game rules.
                  </p>
                  <p>
                    Activation residency approximates six BF16 saved tensors per
                    layer plus 2 GiB workspace. The model excludes framework
                    allocator peaks, kernel traces, packet routing, failures
                    during checkpoint writes, optimizer convergence and measured
                    accuracy. LoRA and KV quantization can change quality; this
                    game does not score it.
                  </p>
                  <div className="campaign-source-list">
                    {lesson.sources
                      .map((id) => lifecycleSources[id])
                      .filter(Boolean)
                      .map((source) => (
                        <a
                          key={source.url}
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <strong>{source.title}</strong>
                          <small>
                            {source.org} · {source.supports}
                          </small>
                        </a>
                      ))}
                  </div>
                  <p>
                    For complete formulas and research, use Learning mode.
                    Cohort throughput differs from single-request latency.
                    Shared handoff bytes include all split replicas;
                    colocated/chunked serving sends zero inter-pool KV bytes.
                  </p>
                </>
              )}
            </CampaignDialog>
          )}
        </>
      )}
      {active && cloudMode && (
        <ProviderUI
          c={cloud}
          level={level}
          visit={visit}
          scene={scene}
          onScenario={selectScenario}
          onServing={back}
          onLearn={learn}
          panel={panel}
          setPanel={setPanel}
          labels={labels}
          setLabels={setLabels}
          cinema={cinema}
          setCinema={setCinema}
        />
      )}
    </section>
  )
}
function CampaignDialog({
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
    const element = ref.current
    return () => element?.close()
  }, [])
  return (
    <dialog
      className="campaign-dialog"
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <header>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="Close campaign dialog">
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  )
}
