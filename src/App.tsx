import { useEffect, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Box,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Cpu,
  ExternalLink,
  Gauge,
  Gamepad2,
  GitBranch,
  Globe2,
  HardDrive,
  Layers3,
  Maximize2,
  Menu,
  Minus,
  MousePointer2,
  Network,
  Pause,
  Play,
  Plus,
  Radio,
  RotateCcw,
  Route,
  Search,
  Server,
  Settings2,
  ShieldCheck,
  Sparkles,
  Waypoints,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  details,
  glossary,
  journey,
  layerDefaults,
  layerNodes,
  layers,
  sources,
} from './content'
import type { Layer, Page, Traffic } from './content'
import { defaults, duration, formatNumber, kvBytes, simulate } from './model'
import type { Parameters, Strategy } from './model'
import { InfrastructureScene } from './components/InfrastructureScene'
import type { SceneHandle } from './components/InfrastructureScene'
import CollectivePlayground from './components/CollectivePlayground'
import MotionTransport from './components/MotionTransport'
import { chapterTime, motionChapters } from './motion'
import type { MotionFrame } from './motion'
import FleetGame from './game/Game'
import LearningFusion from './learning/LearningFusion'
import { ModelReferenceSection } from './examples/ModelExamples'
import { LifecycleReferenceSection } from './lifecycle/Lifecycle'
import { journeyScene } from './learning/model'

const layerIcons: Record<Layer, LucideIcon> = {
  fleet: Globe2,
  pod: Network,
  rack: Server,
  gpu: Cpu,
}
const strategyLabels: Record<Strategy, string> = {
  static: 'Static batching',
  continuous: 'Continuous batching',
  disaggregated: 'Split prefill & decode',
}
const strategies: Strategy[] = ['static', 'continuous', 'disaggregated']
const navigation: {
  id: Page
  title: string
  icon: LucideIcon
  caption: string
}[] = [
  {
    id: 'game',
    title: 'Fleet Command',
    icon: Gamepad2,
    caption: 'Play the infrastructure game',
  },
  {
    id: 'explore',
    title: 'Infrastructure explorer',
    icon: Layers3,
    caption: 'See the whole system',
  },
  {
    id: 'journey',
    title: 'Follow a request',
    icon: Route,
    caption: 'From prompt to response',
  },
  {
    id: 'lab',
    title: 'Trade-off lab',
    icon: Settings2,
    caption: 'Change it. Understand it.',
  },
  {
    id: 'guide',
    title: 'Field guide',
    icon: BookOpen,
    caption: 'Go a little deeper',
  },
]

function initialParameters(): Parameters {
  const search = new URLSearchParams(window.location.search)
  const result = { ...defaults }
  const bounds: Record<keyof Parameters, [number, number]> = {
    gpus: [80, 100000],
    arrivalRate: [100, 50000],
    inputTokens: [128, 32768],
    outputTokens: [32, 2048],
    batchSize: [1, 256],
    networkGbps: [25, 800],
    prefixHit: [0, 90],
    prefillShare: [10, 90],
  }
  for (const key of Object.keys(defaults) as (keyof Parameters)[]) {
    const value = search.get(key)
    if (value !== null && Number.isFinite(Number(value)))
      result[key] = Math.min(
        bounds[key][1],
        Math.max(bounds[key][0], Math.round(Number(value))),
      )
  }
  result.gpus = Math.max(80, Math.round(result.gpus / 8) * 8)
  return result
}

function initialPage(): Page {
  const search = new URLSearchParams(window.location.search)
  const view = search.get('view')
  return view && ['game', 'explore', 'journey', 'lab', 'guide'].includes(view)
    ? (view as Page)
    : search.has('gpus')
      ? 'lab'
      : 'game'
}

function App() {
  const [page, setPage] = useState<Page>(initialPage)
  const [learningFusion, setLearningFusion] = useState(
    () => new URLSearchParams(location.search).get('learn') !== 'classic',
  )
  const [resumeTime, setResumeTime] = useState(0)
  const [labStrategy, setLabStrategy] = useState<Strategy>(() => {
    const value = new URLSearchParams(location.search).get(
      'strategy',
    ) as Strategy
    return strategies.includes(value) ? value : 'continuous'
  })
  const [layer, setLayer] = useState<Layer>('fleet')
  const [selected, setSelected] = useState('scheduler')
  const [traffic, setTraffic] = useState<Traffic>('requests')
  const [paused, setPaused] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(1)
  const [exploded, setExploded] = useState(false)
  const [heatmap, setHeatmap] = useState(false)
  const [orbit, setOrbit] = useState(false)
  const [guided, setGuided] = useState(false)
  const guidedRef = useRef(false)
  const lastGuidedChapter = useRef('')
  const [help, setHelp] = useState(false)
  const [mobileNav, setMobileNav] = useState(false)
  const [params, setParams] = useState<Parameters>(initialParameters)
  const [scenario, setScenario] = useState(
    new URLSearchParams(window.location.search).has('gpus')
      ? 'custom'
      : 'baseline',
  )
  const [journeyStep, setJourneyStep] = useState(0)
  const classicSceneRef = useRef<SceneHandle>(null)
  const fusionSceneRef = useRef<SceneHandle>(null)
  const sceneRef = learningFusion ? fusionSceneRef : classicSceneRef
  const sceneFrameRef = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const model = simulate(params, labStrategy)

  const navigate = (next: Page) => {
    setPage(next)
    const url = new URL(window.location.href)
    url.searchParams.set('view', next)
    window.history.pushState({}, '', url)
    setMobileNav(false)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }
  const selectLayer = (next: Layer) => {
    guidedRef.current = false
    setGuided(false)
    if (traffic === 'requests' || (traffic === 'tensors' && next !== 'gpu')) {
      if (traffic === 'tensors') setTraffic('requests')
      const representative = { fleet: 0, pod: 4, rack: 3, gpu: 5 }[next]
      sceneRef.current?.seek(chapterTime('requests', representative))
    } else if (traffic === 'kv') {
      sceneRef.current?.seek(chapterTime('kv', next === 'pod' ? 2 : 1))
    }
    setLayer(next)
    setSelected(layerDefaults[next])
  }
  const selectTraffic = (next: Traffic) => {
    guidedRef.current = false
    setGuided(false)
    setTraffic(next)
    if (next === 'tensors') {
      setLayer('gpu')
      setSelected('tensor')
    } else if (next === 'collectives') {
      setLayer('rack')
      setSelected('nvlink')
    } else if (next === 'kv') {
      setLayer('pod')
      setSelected('fabric')
    } else if (next === 'requests') {
      setLayer('fleet')
      setSelected('scheduler')
    }
    sceneRef.current?.seek(next === 'kv' ? chapterTime('kv', 2) : 0)
  }
  const selectAnimationChapter = (index: number) => {
    const chapter = motionChapters[traffic][index]
    guidedRef.current = false
    setGuided(false)
    setPaused(true)
    setLayer(chapter.layer)
    setSelected(chapter.node)
    sceneRef.current?.seek(chapterTime(traffic, index))
  }
  const handleMotionFrame = (frame: MotionFrame) => {
    if (!guidedRef.current) return
    const key = `${frame.mode}:${frame.chapterIndex}`
    if (lastGuidedChapter.current === key) return
    lastGuidedChapter.current = key
    setLayer(frame.chapter.layer)
    setSelected(frame.chapter.node)
  }
  const followStage = (id: string) => {
    const index = journey.findIndex((s) => s.node === id)
    setJourneyStep(index < 0 ? 3 : index)
    navigate('journey')
  }
  const applyScenario = (id: string) => {
    setScenario(id)
    setParams(
      id === 'burst'
        ? { ...defaults, arrivalRate: 36000 }
        : id === 'context'
          ? { ...defaults, inputTokens: 16384, arrivalRate: 4000 }
          : id === 'network'
            ? { ...defaults, networkGbps: 25 }
            : { ...defaults },
    )
  }

  const toggleLearningLayout = () => {
    const time = sceneRef.current?.getFrame().time ?? resumeTime
    setResumeTime(time)
    guidedRef.current = false
    setGuided(false)
    setOrbit(false)
    if (!learningFusion) fusionSceneRef.current?.seek(time)
    setLearningFusion(!learningFusion)
    const url = new URL(location.href)
    url.searchParams.set('learn', learningFusion ? 'classic' : 'fusion')
    history.replaceState({}, '', url)
    if (document.fullscreenElement)
      void document.exitFullscreen?.().catch(() => {})
  }
  const toggleGuided = () => {
    if (guided) {
      guidedRef.current = false
      setGuided(false)
      return
    }
    lastGuidedChapter.current = ''
    guidedRef.current = true
    setGuided(true)
    setPaused(false)
    sceneRef.current?.seek(0)
  }
  const manualLearning = () => {
    guidedRef.current = false
    setGuided(false)
    setOrbit(false)
  }

  useEffect(() => {
    const listener = () => setFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', listener)
    return () => document.removeEventListener('fullscreenchange', listener)
  }, [])
  useEffect(() => {
    document.title = `${navigation.find((n) => n.id === page)!.title} — Strata`
  }, [page])
  useEffect(() => {
    const onPop = () => setPage(initialPage())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <>
      <FleetGame active={page === 'game'} onLearn={() => navigate('explore')} />
      <LearningFusion
        active={page !== 'game' && learningFusion}
        page={page === 'game' ? 'explore' : page}
        sceneRef={fusionSceneRef}
        layer={layer}
        traffic={traffic}
        selected={selected}
        params={params}
        strategy={labStrategy}
        paused={paused}
        speed={animationSpeed}
        exploded={exploded}
        heatmap={heatmap}
        orbit={orbit}
        guided={guided}
        journeyStep={journeyStep}
        onNavigate={navigate}
        onClassic={toggleLearningLayout}
        onLayer={selectLayer}
        onTraffic={selectTraffic}
        onSelect={(id) => {
          manualLearning()
          setSelected(id)
        }}
        onPaused={setPaused}
        onSpeed={setAnimationSpeed}
        onExploded={setExploded}
        onHeatmap={setHeatmap}
        onOrbit={setOrbit}
        onGuided={toggleGuided}
        onManual={manualLearning}
        onChapter={selectAnimationChapter}
        onFrame={handleMotionFrame}
        onFollowing={() => {
          lastGuidedChapter.current = ''
          guidedRef.current = true
          setGuided(true)
          setPaused(false)
          const frame = fusionSceneRef.current?.getFrame()
          if (frame) {
            setLayer(frame.chapter.layer)
            setSelected(frame.chapter.node)
          }
        }}
        onParameters={(next) => {
          setParams(next)
          setScenario('custom')
        }}
        onStrategy={setLabStrategy}
        onPreset={(id) => {
          applyScenario(id)
          setHeatmap(true)
        }}
        onJourneyStep={setJourneyStep}
        onJourneyScene={(step, animate) => {
          const world = journeyScene(step)
          manualLearning()
          setLayer(world.layer)
          setTraffic(world.traffic)
          setSelected(world.node)
          setPaused(!animate)
          fusionSceneRef.current?.seek(world.time)
        }}
        onLocate={(nextLayer, nextTraffic, node) => {
          manualLearning()
          setLayer(nextLayer)
          setTraffic(nextTraffic)
          setSelected(node)
          setPaused(true)
          fusionSceneRef.current?.seek(
            chapterTime(nextTraffic, nextTraffic === 'kv' ? 1 : 0),
          )
        }}
        advancedLab={
          <LabView
            params={params}
            setParams={(next) => {
              setParams(next)
              setScenario('custom')
            }}
            onPreset={applyScenario}
            scenario={scenario}
            strategy={labStrategy}
            onStrategy={setLabStrategy}
          />
        }
        advancedGuide={
          <GuideView
            onExplore={(next) => {
              selectLayer(next)
              navigate('explore')
            }}
          />
        }
      />
      <div className="app-shell" hidden={page === 'game' || learningFusion}>
        <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
          <a
            className="brand"
            href={import.meta.env.BASE_URL}
            onClick={(e) => {
              e.preventDefault()
              navigate('game')
            }}
            aria-label="Strata home"
          >
            <span className="brand-mark">
              <Layers3 size={24} strokeWidth={1.8} />
            </span>
            strata<span className="brand-period">.</span>
          </a>
          <div className="sidebar-intro">
            An inside look at
            <br />
            AI infrastructure.
          </div>
          <div className="nav-caption">THE WORKSPACE</div>
          <nav aria-label="Main navigation">
            {navigation.map((n) => (
              <button
                key={n.id}
                className={`nav-item ${page === n.id ? 'active' : ''}`}
                onClick={() => navigate(n.id)}
                aria-current={page === n.id ? 'page' : undefined}
              >
                <n.icon size={19} />
                <span>
                  {n.title}
                  <small>{n.caption}</small>
                </span>
                {page === n.id && <span className="nav-active-dot" />}
              </button>
            ))}
          </nav>
          <div className="sidebar-divider" />
          <div className="nav-caption">ZOOM INTO A LAYER</div>
          <div className="layer-navigation">
            {layers.map((l, i) => {
              const Icon = layerIcons[l.id]
              return (
                <button
                  key={l.id}
                  className={
                    layer === l.id && page === 'explore' ? 'active' : ''
                  }
                  onClick={() => {
                    selectLayer(l.id)
                    navigate('explore')
                  }}
                >
                  <span className="layer-nav-index">0{i + 1}</span>
                  <Icon size={16} />
                  <span>{l.name}</span>
                  <ChevronRight size={14} />
                </button>
              )
            })}
          </div>
          <div className="sidebar-bottom">
            <div className="fleet-note">
              <span className="tiny-dot" />
              REFERENCE ARCHITECTURE
              <strong>
                100,000 <span>GPUs</span>
              </strong>
              <div className="mini-fleet">
                {Array.from({ length: 30 }, (_, i) => (
                  <i key={i} className={i % 6 < 2 ? 'purple' : ''} />
                ))}
              </div>
              <p>
                A big system, made explorable.
                <br />
                No cluster required.
              </p>
              <button onClick={() => navigate('guide')}>
                Meet the reference fleet <ArrowUpRight size={14} />
              </button>
            </div>
            <button className="help-link" onClick={() => setHelp(true)}>
              <CircleHelp size={16} /> How to explore <span>?</span>
            </button>
            <div className="sidebar-footnote">
              BUILT FOR CURIOUS MINDS <Sparkles size={12} />
            </div>
          </div>
        </aside>
        {mobileNav && (
          <button
            className="nav-backdrop"
            aria-label="Close navigation"
            onClick={() => setMobileNav(false)}
          />
        )}
        <div className="main-shell">
          <header className="topbar">
            <div className="topbar-left">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMobileNav(true)}
              >
                <Menu size={20} />
              </button>
              <span className="breadcrumb">
                THE WORKSPACE <ChevronRight size={12} />{' '}
                <strong>{navigation.find((n) => n.id === page)!.title}</strong>
              </span>
            </div>
            <div className="topbar-right">
              <button
                className="icon-button"
                onClick={toggleLearningLayout}
                aria-label="Switch to immersive learning layout"
                title="Enter 3D UI Fusion"
              >
                <Layers3 size={18} />
              </button>
              <span className="learning-tag">
                <span className="tiny-dot" /> INTERACTIVE FIELD GUIDE
              </span>
              <a
                className="repository-link"
                href="https://github.com/sloth-os/AI-Infra"
                target="_blank"
                rel="noreferrer"
              >
                View project <ArrowUpRight size={15} />
              </a>
            </div>
          </header>
          <main id="main-content" className="main-content">
            {page === 'explore' && !learningFusion && (
              <>
                <section className="page-heading">
                  <div>
                    <div className="eyebrow">
                      <span className="eyebrow-line" /> THE INFRASTRUCTURE
                      EXPLORER
                    </div>
                    <h1>
                      Behind every answer.
                      <br />
                      <span>A whole world of infrastructure.</span>
                    </h1>
                    <p>
                      From a single token to a 100,000-GPU fleet.
                      <br className="mobile-break" /> See the system. Follow the
                      data. Find the bottleneck.
                    </p>
                  </div>
                  <button
                    className="button button-dark heading-cta"
                    onClick={() => {
                      setJourneyStep(0)
                      navigate('journey')
                    }}
                  >
                    Follow a request <ArrowRight size={17} />
                  </button>
                </section>
                <section
                  className="stats-grid"
                  aria-label="Reference fleet overview"
                >
                  <Stat
                    icon={Cpu}
                    label="GPUs IN THE FLEET"
                    value="100,000"
                    suffix="H100-class"
                    foot="A reference-scale architecture"
                  />
                  <Stat
                    icon={Box}
                    label="MODEL REPLICAS"
                    value="12,500"
                    suffix="TP = 8"
                    foot="8 accelerators working as one"
                  />
                  <Stat
                    icon={Waypoints}
                    label="LAB REQUEST RATE"
                    value={formatNumber(params.arrivalRate)}
                    suffix="req / sec"
                    foot="Adjustable in the trade-off lab"
                  />
                  <Stat
                    icon={Zap}
                    label="FIRST TOKEN · LAB ESTIMATE"
                    value={duration(model.ttftMs)}
                    suffix=""
                    foot={`For ${formatNumber(params.gpus)} modeled GPUs · not a benchmark`}
                    accent
                  />
                </section>
                <section
                  className="explorer-card motion-explorer"
                  aria-label="Interactive infrastructure explorer"
                  ref={sceneFrameRef}
                >
                  <div className="explorer-toolbar">
                    <div className="section-title">
                      <Box size={18} />
                      <h2>Explore the infrastructure</h2>
                      <span className="subtle-tag">3D</span>
                    </div>
                    <div
                      className="traffic-tabs"
                      role="group"
                      aria-label="Traffic type"
                    >
                      {(
                        [
                          { id: 'requests', name: 'Requests' },
                          { id: 'kv', name: 'KV cache' },
                          { id: 'collectives', name: 'Collectives' },
                          { id: 'tensors', name: 'Tensor flow' },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          className={traffic === t.id ? 'active' : ''}
                          onClick={() => selectTraffic(t.id)}
                          aria-pressed={traffic === t.id}
                        >
                          <span className={`traffic-dot ${t.id}`} />
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="explorer-body">
                    <div className="scene-column">
                      <div className="scene-frame">
                        <InfrastructureScene
                          ref={classicSceneRef}
                          initialTime={resumeTime}
                          strategy={labStrategy}
                          layer={layer}
                          traffic={traffic}
                          paused={paused}
                          selected={selected}
                          onSelect={(id) => {
                            guidedRef.current = false
                            setGuided(false)
                            setSelected(id)
                          }}
                          speed={animationSpeed}
                          exploded={exploded}
                          heatmap={heatmap}
                          orbit={orbit}
                          params={params}
                          onFrame={handleMotionFrame}
                        />
                        <div className="scene-topline">
                          <div>
                            <span className="scene-overline">
                              {layer === 'fleet'
                                ? 'THE BIG PICTURE'
                                : 'A CLOSER LOOK'}
                            </span>
                            <h3>
                              {layers.find((l) => l.id === layer)!.scale}
                              <span className="scene-live-dot" />
                            </h3>
                          </div>
                          <div className="scene-top-buttons">
                            <button
                              className="scene-icon-button"
                              aria-label={
                                paused ? 'Resume animation' : 'Pause animation'
                              }
                              onClick={() => setPaused(!paused)}
                            >
                              {paused ? (
                                <Play size={15} />
                              ) : (
                                <Pause size={15} />
                              )}
                            </button>
                            <button
                              className="scene-icon-button fullscreen-button"
                              aria-label={
                                fullscreen
                                  ? 'Exit fullscreen'
                                  : 'Expand explorer'
                              }
                              onClick={() => {
                                if (document.fullscreenElement)
                                  void document.exitFullscreen()
                                else
                                  void sceneFrameRef.current
                                    ?.requestFullscreen()
                                    .catch(() => setHelp(true))
                              }}
                            >
                              <Maximize2 size={15} />
                            </button>
                          </div>
                        </div>
                        <div className="scene-bottomline">
                          <span>
                            <MousePointer2 size={13} /> Drag to orbit <i />{' '}
                            Scroll to zoom <i /> Click to inspect
                          </span>
                          <div>
                            <button
                              className="scene-icon-button"
                              aria-label="Zoom out"
                              onClick={() => sceneRef.current?.zoom(-1)}
                            >
                              <Minus size={16} />
                            </button>
                            <button
                              className="scene-icon-button"
                              aria-label="Zoom in"
                              onClick={() => sceneRef.current?.zoom(1)}
                            >
                              <Plus size={16} />
                            </button>
                            <button
                              className="scene-icon-button"
                              aria-label="Reset camera"
                              onClick={() => sceneRef.current?.reset()}
                            >
                              <RotateCcw size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="scene-scale">
                          <i />
                          <span>
                            {layer === 'fleet'
                              ? 'Each group = a logical pool of 5,000 GPUs'
                              : layer === 'gpu'
                                ? 'Conceptual chip layout · not to scale'
                                : 'Representative architecture · not a floor plan'}
                          </span>
                        </div>
                      </div>
                      <div
                        className="layer-strip"
                        aria-label="Infrastructure scale"
                      >
                        {layers.map((l, i) => {
                          const Icon = layerIcons[l.id]
                          return (
                            <button
                              key={l.id}
                              className={layer === l.id ? 'active' : ''}
                              onClick={() => selectLayer(l.id)}
                              aria-pressed={layer === l.id}
                            >
                              <span className="layer-number">0{i + 1}</span>
                              <Icon size={19} />
                              <span>
                                {l.name}
                                <small>{l.scale}</small>
                              </span>
                              {i < 3 && (
                                <ChevronRight
                                  className="layer-strip-chevron"
                                  size={13}
                                />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <Inspector
                      id={selected}
                      onFollow={() => followStage(selected)}
                      params={params}
                      onParameters={(next) => {
                        setParams(next)
                        setScenario('custom')
                      }}
                    />
                  </div>
                  <MotionTransport
                    sceneRef={sceneRef}
                    mode={traffic}
                    paused={paused}
                    onPaused={setPaused}
                    onChapter={selectAnimationChapter}
                    speed={animationSpeed}
                    onSpeed={setAnimationSpeed}
                    exploded={exploded}
                    onExploded={setExploded}
                    heatmap={heatmap}
                    onHeatmap={setHeatmap}
                    orbit={orbit}
                    onOrbit={setOrbit}
                    guided={guided}
                    onGuided={toggleGuided}
                  />
                  <div className="component-picker">
                    <span>INSPECT</span>
                    {layerNodes[layer].map((id) => (
                      <button
                        key={id}
                        className={selected === id ? 'active' : ''}
                        onClick={() => {
                          guidedRef.current = false
                          setGuided(false)
                          setSelected(id)
                          sceneRef.current?.focus(id)
                        }}
                        aria-pressed={selected === id}
                      >
                        <span style={{ background: details[id].color }} />
                        {id === 'scheduler'
                          ? 'Scheduler'
                          : id === 'storage'
                            ? 'Storage'
                            : id === 'tensor'
                              ? 'Compute'
                              : id === 'fabric'
                                ? 'Network fabric'
                                : id === 'nvlink'
                                  ? 'NVLink'
                                  : details[id].title.replace(' workers', '')}
                      </button>
                    ))}
                  </div>
                </section>
                <div className="traffic-explainer">
                  <span className={`traffic-dot ${traffic}`} />
                  <p>
                    {traffic === 'requests' ? (
                      <>
                        <strong>North–south traffic.</strong> Requests enter
                        through the gateway, route to a replica, and return as
                        streamed tokens.
                      </>
                    ) : traffic === 'kv' ? (
                      <>
                        <strong>State moves, too.</strong> Separate prefill and
                        decode workers transfer per-request KV blocks. In a
                        colocated worker, the cache stays local.
                      </>
                    ) : traffic === 'tensors' ? (
                      <>
                        <strong>Follow the tensors.</strong> Embedding rows
                        become Q, K, and V; causal attention combines context,
                        ranks synchronize, and the final state produces a
                        sampled token. Shapes refer to the illustrative 70B
                        model.
                      </>
                    ) : (
                      <>
                        <strong>GPUs talk to GPUs.</strong> Tensor-parallel
                        ranks exchange partial results; MoE adds expert
                        all-to-all. Fleet lines are conceptual, not a single
                        collective group.
                      </>
                    )}
                  </p>
                  <span className="simulation-label">ILLUSTRATIVE FLOW</span>
                </div>
                {traffic === 'collectives' && <CollectivePlayground />}
                <section className="below-explorer">
                  <div className="bottleneck-panel">
                    <div className="card-eyebrow">
                      <span className="tiny-dot" /> AT THIS LAYER
                    </div>
                    <h2>{layers.find((l) => l.id === layer)!.question}</h2>
                    <div className="problem-solution">
                      <div>
                        <span className="small-label">THE CHALLENGE</span>
                        <p>{details[selected].problem}</p>
                      </div>
                      <div>
                        <span className="small-label green-text">
                          THE APPROACH
                        </span>
                        <p>{details[selected].solution}</p>
                      </div>
                    </div>
                    <div className="tradeoff-note">
                      <GitBranch size={17} />
                      <p>{details[selected].tradeoff}</p>
                    </div>
                  </div>
                  <div className="experiment-panel">
                    <span className="card-eyebrow">A LITTLE EXPERIMENT</span>
                    <h2>What happens when…</h2>
                    <div className="scenario-buttons">
                      {[
                        { id: 'baseline', name: 'Normal traffic', icon: Radio },
                        { id: 'burst', name: 'Traffic doubles', icon: Zap },
                        {
                          id: 'context',
                          name: 'Prompts get longer',
                          icon: HardDrive,
                        },
                      ].map((s) => (
                        <button
                          key={s.id}
                          className={scenario === s.id ? 'active' : ''}
                          onClick={() => applyScenario(s.id)}
                        >
                          <s.icon size={16} />
                          {s.name}
                          {scenario === s.id ? (
                            <Check size={15} />
                          ) : (
                            <ArrowUpRight size={15} />
                          )}
                        </button>
                      ))}
                    </div>
                    <div
                      className={`experiment-result ${!model.stable ? 'warning' : ''}`}
                      aria-live="polite"
                    >
                      <span className="tiny-dot" />
                      <div>
                        <strong>
                          {!model.stable
                            ? 'The queue can no longer drain.'
                            : scenario === 'context'
                              ? 'More context, more KV memory.'
                              : 'The fleet has room to breathe.'}
                        </strong>
                        <p>
                          {!model.stable
                            ? `Demand exceeds the modeled ${formatNumber(model.capacity)} req/s capacity. Add capacity or control admission.`
                            : `${formatNumber(model.utilization * 100)}% modeled load · ${duration(model.ttftMs)} to first token`}
                        </p>
                      </div>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => navigate('lab')}
                    >
                      Take it to the trade-off lab <ArrowRight size={15} />
                    </button>
                  </div>
                </section>
                <section className="journey-banner">
                  <div className="journey-banner-icon">
                    <Route size={26} />
                  </div>
                  <div>
                    <span className="small-label">THE LIFE OF A REQUEST</span>
                    <h2>One prompt. A remarkable journey.</h2>
                    <p>
                      Follow the transformations that turn your question into an
                      answer.
                    </p>
                  </div>
                  <button
                    className="button button-light"
                    onClick={() => {
                      setJourneyStep(0)
                      navigate('journey')
                    }}
                  >
                    Take the tour <ArrowRight size={17} />
                  </button>
                </section>
              </>
            )}
            {page === 'journey' && !learningFusion && (
              <JourneyView step={journeyStep} setStep={setJourneyStep} />
            )}
            {page === 'lab' && !learningFusion && (
              <LabView
                params={params}
                setParams={(next) => {
                  setParams(next)
                  setScenario('custom')
                }}
                onPreset={applyScenario}
                scenario={scenario}
                strategy={labStrategy}
                onStrategy={setLabStrategy}
              />
            )}
            {page === 'guide' && !learningFusion && (
              <GuideView
                onExplore={(next) => {
                  selectLayer(next)
                  navigate('explore')
                }}
              />
            )}
            <footer className="page-footer">
              <span className="footer-brand">
                <Layers3 size={16} /> strata.
              </span>
              <span>Complex systems. Clearer understanding.</span>
              <button onClick={() => navigate('guide')}>
                Sources & model assumptions <ArrowUpRight size={13} />
              </button>
            </footer>
          </main>
        </div>
        {help && !learningFusion && (
          <HelpModal
            onClose={() => setHelp(false)}
            onGuide={() => {
              setHelp(false)
              navigate('guide')
            }}
          />
        )}
      </div>
    </>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  suffix,
  foot,
  accent = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  suffix: string
  foot: string
  accent?: boolean
}) {
  return (
    <div className={`stat-card ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-top">
        <span>{label}</span>
        <Icon size={16} />
      </div>
      <div className="stat-value">
        {value}
        <span>{suffix}</span>
      </div>
      <p>{foot}</p>
    </div>
  )
}

function Inspector({
  id,
  onFollow,
  params,
  onParameters,
}: {
  id: string
  onFollow: () => void
  params: Parameters
  onParameters: (p: Parameters) => void
}) {
  const d = details[id]
  return (
    <aside
      className="inspector"
      aria-label="Component details"
      aria-live="polite"
    >
      <div className="inspector-heading">
        <span className="tiny-dot" style={{ background: d.color }} />
        {d.tag}
        <ArrowDownLeft size={15} />
      </div>
      <h3>{d.title}</h3>
      <p className="inspector-description">{d.description}</p>
      <div className="inspector-metric">
        <span className="metric-orbit">
          <Box size={18} />
        </span>
        <strong>{d.metric}</strong>
        <span>{d.metricLabel}</span>
      </div>
      <dl className="inspector-facts">
        {d.facts.map((f) => (
          <div key={f.label}>
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
      <div className="scene-experiment">
        <span className="small-label">
          <Settings2 size={12} /> EXPERIMENT IN 3D
        </span>
        <label className="scene-prompt-control">
          <span>
            Prompt length
            <strong>
              {formatNumber(params.inputTokens)} <small>tokens</small>
            </strong>
          </span>
          <input
            aria-label="3D prompt length"
            type="range"
            min={128}
            max={32768}
            step={128}
            value={params.inputTokens}
            onChange={(e) =>
              onParameters({ ...params, inputTokens: Number(e.target.value) })
            }
          />
        </label>
        <label className="scene-network-control">
          <span>Fabric endpoint</span>
          <select
            aria-label="3D fabric bandwidth"
            value={params.networkGbps}
            onChange={(e) =>
              onParameters({ ...params, networkGbps: Number(e.target.value) })
            }
          >
            {Array.from(new Set([25, 100, 400, 800, params.networkGbps]))
              .sort((a, b) => a - b)
              .map((n) => (
                <option key={n} value={n}>
                  {n} Gb/s
                </option>
              ))}
          </select>
        </label>
        <button
          className={params.arrivalRate >= 36000 ? 'burst-active' : ''}
          onClick={() =>
            onParameters({
              ...params,
              arrivalRate: params.arrivalRate >= 36000 ? 18000 : 36000,
            })
          }
        >
          <Zap size={12} />
          {params.arrivalRate >= 36000
            ? 'Restore baseline traffic'
            : 'Inject a traffic burst'}
          <ArrowRight size={12} />
        </button>
        <p>
          Changes feed the animation and trade-off lab. Estimates assume a
          uniform workload.
        </p>
      </div>
      <button className="inspector-follow" onClick={onFollow}>
        Follow this stage <ArrowRight size={16} />
      </button>
    </aside>
  )
}

function JourneyView({
  step,
  setStep,
}: {
  step: number
  setStep: (n: number) => void
}) {
  const [playing, setPlaying] = useState(false)
  const [rag, setRag] = useState(true)
  const [prompt, setPrompt] = useState(
    'Explain black holes to a curious ten-year-old.',
  )
  const [showPayload, setShowPayload] = useState(false)
  const s = journey[step]
  const journeySceneLayer = step === 3 ? 'gpu' : s.layer
  const next = () => setStep(step === 0 && !rag ? 2 : Math.min(6, step + 1))
  const previous = () => setStep(step === 2 && !rag ? 0 : Math.max(0, step - 1))
  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      if (step >= 6) setPlaying(false)
      else setStep(step === 0 && !rag ? 2 : step + 1)
    }, 6500)
    return () => window.clearTimeout(timer)
  }, [playing, step, rag, setStep])

  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE LIFE OF A REQUEST
          </div>
          <h1>
            One prompt.
            <br />
            <span>Seven transformations.</span>
          </h1>
          <p>
            Follow the data from the first API call to the last generated token.
          </p>
        </div>
        <span className="outline-badge">
          <ShieldCheck size={15} /> Everything stays in your browser
        </span>
      </section>
      <section className="request-composer">
        <div className="request-composer-label">
          <Route size={20} />
          <div>
            <strong>Start with a question</strong>
            <span>An animated walkthrough, without real inference</span>
          </div>
        </div>
        <div className="prompt-input">
          <label className="sr-only" htmlFor="prompt">
            Example prompt
          </label>
          <input
            id="prompt"
            maxLength={500}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask something you’re curious about…"
          />
          <button
            className="button button-dark"
            disabled={!prompt.trim()}
            onClick={() => {
              setStep(0)
              setPlaying(true)
            }}
          >
            <Play size={15} />
            Trace request
          </button>
        </div>
        <label className="rag-toggle">
          <input
            type="checkbox"
            checked={rag}
            onChange={(e) => {
              setRag(e.target.checked)
              if (!e.target.checked && step === 1) setStep(2)
            }}
          />
          <span>Include retrieval (RAG)</span>
          <span className="subtle-tag">OPTIONAL</span>
        </label>
      </section>
      <div className="journey-workspace">
        <nav className="journey-steps" aria-label="Request stages">
          {journey.map((j, i) => (
            <button
              key={j.short}
              disabled={i === 1 && !rag}
              className={`${step === i ? 'active' : ''} ${i < step ? 'complete' : ''}`}
              onClick={() => {
                setStep(i)
                setPlaying(false)
              }}
              aria-current={step === i ? 'step' : undefined}
            >
              <span className="step-circle">
                {i < step ? <Check size={15} /> : `0${i + 1}`}
              </span>
              <span>
                <strong>{j.short}</strong>
                <small>
                  {i === 1 && !rag
                    ? 'Skipped'
                    : i === step
                      ? 'You are here'
                      : j.time}
                </small>
              </span>
              {step === i && <ArrowRight size={15} />}
            </button>
          ))}
        </nav>
        <section className="journey-stage" aria-label="Current request stage">
          <div className="stage-top">
            <span className="small-label">STEP 0{step + 1} / 07</span>
            <span className="outline-badge">
              <span className="tiny-dot" style={{ background: s.color }} />
              {s.time}
            </span>
          </div>
          <h2 aria-live="polite">{s.title}</h2>
          <p className="stage-description">{s.text}</p>
          <div className="data-transformation">
            <div>
              <span className="small-label">INPUT</span>
              <code>{step === 0 ? `“${prompt}”` : s.input}</code>
            </div>
            <span className="transformation-arrow">
              <ArrowRight size={21} />
            </span>
            <div>
              <span className="small-label">OUTPUT</span>
              <code>{s.output}</code>
            </div>
          </div>
          <div className="journey-mini-scene">
            <InfrastructureScene
              layer={journeySceneLayer}
              traffic={step === 4 ? 'kv' : step === 3 ? 'tensors' : 'requests'}
              paused={!playing}
              selected={s.node}
              onSelect={() => setShowPayload(true)}
              compact
              initialTime={
                step === 4
                  ? chapterTime('kv', 2)
                  : step === 3
                    ? 0
                    : chapterTime('requests', step)
              }
            />
            <div className="mini-scene-caption">
              <span className="tiny-dot" />
              {layers
                .find((l) => l.id === journeySceneLayer)!
                .name.toUpperCase()}{' '}
              VIEW <span>Conceptual topology</span>
            </div>
          </div>
          <div className="stage-explanation">
            <span className="small-label">
              <Sparkles size={14} /> THE DETAIL THAT MATTERS
            </span>
            <p>{s.detail}</p>
          </div>
          <div className="stage-bottom">
            <button
              className="button button-light"
              onClick={() => {
                previous()
                setPlaying(false)
              }}
              disabled={step === 0}
            >
              <ChevronLeft size={16} />
              Previous
            </button>
            <button
              className="text-button"
              onClick={() => {
                if (step === 6) setStep(0)
                setPlaying(!playing)
              }}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing ? 'Pause walkthrough' : 'Play walkthrough'}
            </button>
            <button
              className="button button-dark"
              onClick={() => {
                if (step === 6) setStep(0)
                else next()
                setPlaying(false)
              }}
            >
              {step === 6 ? 'Start again' : 'Next stage'}
              <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </div>
      <section className="journey-bottom-grid">
        <div className="white-card">
          <span className="card-eyebrow">BOTTLENECK → RESPONSE</span>
          <h2>Every stage has a trade-off.</h2>
          <div className="problem-solution">
            <div>
              <span className="small-label">WHAT GOES WRONG</span>
              <p>{s.problem}</p>
            </div>
            <div>
              <span className="small-label green-text">HOW TO HANDLE IT</span>
              <p>{s.solution}</p>
            </div>
          </div>
        </div>
        <div className="payload-card">
          <span className="card-eyebrow">DATA ON THE WIRE</span>
          <h2>{s.payload}</h2>
          <p>
            {step === 4
              ? 'Tensor state is orders of magnitude larger than the API text that started it.'
              : 'The representation changes at each boundary. The request ID follows it through the entire system.'}
          </p>
          <button
            className="text-button"
            onClick={() => setShowPayload(!showPayload)}
          >
            {showPayload ? 'Hide' : 'Inspect'} example payload{' '}
            <ChevronDown size={15} />
          </button>
          {showPayload && (
            <pre className="payload-code">
              {JSON.stringify(
                {
                  request_id: 'req_strata_001',
                  stage: s.short.toLowerCase(),
                  representation: s.payload,
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
                          prompt_tokens: 2048,
                          total_bytes: kvBytes(2048),
                          sharding: '8 TP ranks',
                        }
                      : {
                          example: s.output,
                          note: 'Illustrative representation; not an executed model result',
                        }),
                },
                null,
                2,
              )}
            </pre>
          )}
        </div>
      </section>
      <section className="concurrency-section white-card">
        <div>
          <span className="card-eyebrow">NOW MULTIPLY BY THOUSANDS</span>
          <h2>Many users. Shared compute. Separate state.</h2>
          <p>
            Continuous batching combines work across requests at each iteration.
            Each user keeps a separate KV cache, deadline, and output stream.
          </p>
        </div>
        <div className="concurrency-demo">
          {[
            {
              name: 'User A',
              blocks: ['P', 'D', 'D', 'D', 'D', '✓'],
              offset: 0,
            },
            {
              name: 'User B',
              blocks: ['P', 'P', 'D', 'D', 'D', 'D'],
              offset: 1,
            },
            { name: 'User C', blocks: ['P', 'D', 'D', '✓'], offset: 2 },
          ].map((user) => (
            <div className="user-lane" key={user.name}>
              <span>{user.name}</span>
              {Array.from({ length: user.offset }, (_, i) => (
                <i key={`empty${i}`} />
              ))}
              {user.blocks.map((block, i) => (
                <span
                  className={`request-block ${block === 'P' ? 'prefill' : block === '✓' ? 'done' : 'decode'}`}
                  key={i}
                >
                  {block}
                </span>
              ))}
            </div>
          ))}
          <div className="concurrency-key">
            <span>
              <i className="purple" />P · Prefill chunk
            </span>
            <span>
              <i className="green" />D · Decode iteration
            </span>
            <span>Conceptual scheduling timeline →</span>
          </div>
        </div>
      </section>
    </>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  note,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit: string
  note?: string
  onChange: (n: number) => void
}) {
  return (
    <label className="slider-control">
      <span>
        {label}
        <strong>
          {formatNumber(value)} <small>{unit}</small>
        </strong>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label}
        style={
          {
            '--range-fill': `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
      />
      {note && <small>{note}</small>}
    </label>
  )
}

function LabView({
  params,
  setParams,
  onPreset,
  scenario,
  strategy: controlledStrategy,
  onStrategy,
}: {
  params: Parameters
  setParams: (p: Parameters) => void
  onPreset: (id: string) => void
  scenario: string
  strategy?: Strategy
  onStrategy?: (s: Strategy) => void
}) {
  const [ownStrategy, setOwnStrategy] = useState<Strategy>(() => {
    const value = new URLSearchParams(window.location.search).get('strategy')
    return strategies.includes(value as Strategy)
      ? (value as Strategy)
      : 'continuous'
  })
  const strategy = controlledStrategy || ownStrategy,
    setStrategy = onStrategy || setOwnStrategy
  const [copied, setCopied] = useState(false)
  const result = simulate(params, strategy)
  const outcomes = strategies.map((s) => ({
    strategy: s,
    result: simulate(params, s),
  }))
  const update = (key: keyof Parameters, value: number) =>
    setParams({ ...params, [key]: value })
  const maxCapacity =
    Math.max(params.arrivalRate, ...outcomes.map((o) => o.result.capacity)) *
    1.15
  const copyLink = async () => {
    const url = new URL(window.location.href)
    url.search = new URLSearchParams([
      ...Object.entries(params).map(([key, value]) => [key, String(value)]),
      ['strategy', strategy],
      ...(new URLSearchParams(location.search).get('learn') === 'classic'
        ? [['learn', 'classic']]
        : []),
    ]).toString()
    window.history.replaceState({}, '', url)
    try {
      await navigator.clipboard.writeText(url.toString())
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2500)
    } catch {
      setCopied(false)
    }
  }
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE TRADE-OFF LAB
          </div>
          <h1>
            There is no free lunch.
            <br />
            <span>But there are better trade-offs.</span>
          </h1>
          <p>
            Change the workload. Compare the strategies. See which bottleneck
            moves.
          </p>
        </div>
        <button className="button button-light" onClick={() => void copyLink()}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Link copied' : 'Share scenario'}
        </button>
      </section>
      <div className="model-disclaimer">
        <Sparkles size={17} />
        <p>
          <strong>A reasoning tool, not a benchmark.</strong> All results are
          synthetic estimates for one dense 70B BF16 model on 8-GPU replicas.
          Inspect the assumptions below before drawing conclusions.
        </p>
      </div>
      <div className="lab-presets">
        <span className="small-label">TRY A SCENARIO</span>
        {[
          { id: 'baseline', name: 'Balanced workload' },
          { id: 'burst', name: 'Traffic spike' },
          { id: 'context', name: 'Long-context prompts' },
          { id: 'network', name: 'Constrained network' },
        ].map((p) => (
          <button
            key={p.id}
            className={scenario === p.id ? 'active' : ''}
            onClick={() => onPreset(p.id)}
          >
            {p.name}
            {scenario === p.id && <Check size={13} />}
          </button>
        ))}
        <button className="reset-lab" onClick={() => onPreset('baseline')}>
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
      <div className="lab-workspace">
        <section className="lab-controls">
          <div className="section-title">
            <Settings2 size={18} />
            <h2>Your system</h2>
          </div>
          <div className="controls-group">
            <span className="small-label">FLEET & DEMAND</span>
            <Slider
              label="Fleet size"
              value={params.gpus}
              min={80}
              max={100000}
              step={80}
              unit="GPUs"
              note={`${formatNumber(result.replicas)} model replicas · TP = 8`}
              onChange={(n) => update('gpus', n)}
            />
            <Slider
              label="Incoming traffic"
              value={params.arrivalRate}
              min={100}
              max={50000}
              step={100}
              unit="req/s"
              onChange={(n) => update('arrivalRate', n)}
            />
          </div>
          <div className="controls-group">
            <span className="small-label">REQUEST SHAPE</span>
            <Slider
              label="Prompt length"
              value={params.inputTokens}
              min={128}
              max={32768}
              step={128}
              unit="tokens"
              onChange={(n) => update('inputTokens', n)}
            />
            <Slider
              label="Output length"
              value={params.outputTokens}
              min={32}
              max={2048}
              step={32}
              unit="tokens"
              onChange={(n) => update('outputTokens', n)}
            />
            <Slider
              label="Maximum active batch"
              value={params.batchSize}
              min={1}
              max={256}
              unit="sequences"
              onChange={(n) => update('batchSize', n)}
            />
          </div>
          <div className="controls-group">
            <span className="small-label">OPTIMIZATION & FABRIC</span>
            <Slider
              label="Reusable prompt fraction"
              value={params.prefixHit}
              min={0}
              max={90}
              step={5}
              unit="%"
              note="Assumes an exact compatible prefix hit for every request"
              onChange={(n) => update('prefixHit', n)}
            />
            <Slider
              label="Endpoint network"
              value={params.networkGbps}
              min={25}
              max={800}
              step={25}
              unit="Gb/s"
              note="70% useful throughput · split pools only"
              onChange={(n) => update('networkGbps', n)}
            />
            <Slider
              label="Prefill pool allocation"
              value={params.prefillShare}
              min={10}
              max={90}
              step={5}
              unit="%"
              note="Of TP=8 replicas · split pools only"
              onChange={(n) => update('prefillShare', n)}
            />
          </div>
        </section>
        <div className="lab-results">
          <section
            className="strategy-comparison"
            aria-label="Serving strategy comparison"
          >
            {outcomes.map(({ strategy: id, result: r }, i) => (
              <button
                className={`strategy-card ${strategy === id ? 'active' : ''}`}
                key={id}
                onClick={() => setStrategy(id)}
                aria-pressed={strategy === id}
              >
                <div className="strategy-card-top">
                  <span className="small-label">0{i + 1} / STRATEGY</span>
                  <span
                    className={`radio-select ${strategy === id ? 'checked' : ''}`}
                  />
                </div>
                <h3>{strategyLabels[id]}</h3>
                <p>
                  {id === 'static'
                    ? 'Fixed cohorts, padding and idle slots.'
                    : id === 'continuous'
                      ? 'Admit new work between iterations.'
                      : 'Dedicated workers for each phase.'}
                </p>
                <div className="strategy-main-metric">
                  <strong>{formatNumber(r.capacity)}</strong>
                  <span>modeled max req/s</span>
                </div>
                <div className={`capacity-status ${r.stable ? '' : 'warning'}`}>
                  <span className="tiny-dot" />
                  {r.stable
                    ? `${Math.round(r.utilization * 100)}% modeled load`
                    : 'Demand exceeds capacity'}
                </div>
              </button>
            ))}
          </section>
          <div
            className={`lab-load-banner ${result.stable ? '' : 'overloaded'}`}
            aria-live="polite"
          >
            {result.stable ? <CheckCircle2 size={20} /> : <Gauge size={20} />}
            <div>
              <strong>
                {result.stable
                  ? 'A stable queue, under these assumptions.'
                  : 'Overloaded: the queue grows without bound.'}
              </strong>
              <span>
                {result.stable
                  ? `${formatNumber(result.capacity - params.arrivalRate)} req/s of modeled headroom. Real tail latency needs workload measurements.`
                  : 'There is no finite steady-state latency estimate. Add replicas, reduce demand, or reject work.'}
              </span>
            </div>
          </div>
          <section className="lab-metrics">
            <div>
              <span className="small-label">TIME TO FIRST TOKEN</span>
              <strong>{duration(result.ttftMs)}</strong>
              <small>Mean heuristic · excludes retrieval</small>
            </div>
            <div>
              <span className="small-label">PER OUTPUT TOKEN</span>
              <strong>{duration(result.tpotMs)}</strong>
              <small>Modeled stream interval</small>
            </div>
            <div>
              <span className="small-label">KV / SEQUENCE</span>
              <strong>
                {((result.cacheGB * 1e9) / 2 ** 20).toFixed(0)} <span>MiB</span>
              </strong>
              <small>Prompt + all output tokens · TP group</small>
            </div>
            <div>
              <span className="small-label">COST / 1M OUTPUT TOKENS</span>
              <strong>${result.costPerMillion.toFixed(2)}</strong>
              <small>$2.50 / GPU-hour assumed</small>
            </div>
          </section>
          <section className="capacity-chart white-card">
            <div className="chart-heading">
              <div>
                <span className="card-eyebrow">CAPACITY VS. DEMAND</span>
                <h2>Which strategy keeps up?</h2>
              </div>
              <span className="chart-unit">REQUESTS / SECOND</span>
            </div>
            <div className="bar-chart">
              {outcomes.map(({ strategy: id, result: r }) => (
                <div className="chart-row" key={id}>
                  <span>{strategyLabels[id]}</span>
                  <div className="chart-track">
                    <div
                      className={`chart-bar ${id}`}
                      style={{ width: `${(r.capacity / maxCapacity) * 100}%` }}
                    />
                    <div
                      className="demand-marker"
                      style={{
                        left: `${(params.arrivalRate / maxCapacity) * 100}%`,
                      }}
                    />
                    <strong>{formatNumber(r.capacity)}</strong>
                  </div>
                </div>
              ))}
              <div className="chart-key">
                <span>
                  <i /> Modeled capacity
                </span>
                <span>
                  <b /> Incoming demand: {formatNumber(params.arrivalRate)}{' '}
                  req/s
                </span>
              </div>
            </div>
          </section>
          <section className="lab-insights">
            <div className="white-card">
              <span className="small-label">
                <HardDrive size={15} /> MEMORY BUDGET
              </span>
              <h3>{result.batch} active sequences / replica</h3>
              <p>
                {result.memorySlots < params.batchSize
                  ? `Requested batch ${params.batchSize} is clamped to ${result.memorySlots} by KV memory. `
                  : ''}
                {formatNumber(result.weightGB)} GB weights + 48 GB runtime
                reserve + 452 GB available KV across 8 GPUs. This is a
                simplified peak-memory bound.
              </p>
            </div>
            <div className="white-card">
              <span className="small-label">
                <Network size={15} /> STATE TRANSFER
              </span>
              <h3>
                {strategy === 'disaggregated'
                  ? `${duration(result.transferMs)} per handoff`
                  : 'KV stays on the worker'}
              </h3>
              <p>
                {strategy === 'disaggregated'
                  ? `${formatNumber(result.prefillReplicas)} prefill replicas / ${formatNumber(result.decodeReplicas)} decode replicas. Aggregate accepted KV traffic: ${formatNumber(result.networkLoadGBps, 1)} GB/s. Contention is not modeled.`
                  : 'Colocated prefill and decode avoid a network handoff. They compete for the same GPU resources; the model applies a load-dependent decode interference penalty.'}
              </p>
            </div>
          </section>
        </div>
      </div>
      <details className="assumptions-panel">
        <summary>
          <span>
            <BookOpen size={18} />
            Open the model. Inspect every assumption.
          </span>
          <ChevronDown size={18} />
        </summary>
        <div className="assumptions-content">
          <div>
            <h3>Hardware & model</h3>
            <p>
              Dense 70B parameters, BF16 weights (140 GB), 80 layers, 8 KV
              heads, head dimension 128, BF16 KV. Each replica has 8× 80 GB
              GPUs; 6 GB/GPU is reserved for runtime. No model quantization,
              speculative decoding, or failures are modeled.
            </p>
            <code>KV bytes/token = 2 × 80 × 8 × 128 × 2 = 327,680</code>
          </div>
          <div>
            <h3>Serving coefficients</h3>
            <p>
              Assumed prefill rate: 6,000 input tokens/s per TP=8 replica.
              Decode step: 12 + 0.4 × batch + 1.5 × average context/1,024 ms.
              Static batching uses 68% of the corresponding token rates. These
              are chosen teaching coefficients, not measured performance.
            </p>
            <code>
              Colocated capacity = replicas / (input/rate + output/rate)
            </code>
          </div>
          <div>
            <h3>Queue, network & limits</h3>
            <p>
              Below saturation, a queueing heuristic adds 0.25 × service demand
              × ρ/(1−ρ). Split-pool capacity is the smaller phase capacity. Its
              handoff adds KV bytes / (line rate × 0.7). We assume balanced
              routing and no fabric contention. Costs include all allocated GPUs
              and output tokens only.
            </p>
            <code>At ρ ≥ 1: no finite steady-state TTFT</code>
          </div>
        </div>
      </details>
    </>
  )
}

function GuideView({ onExplore }: { onExplore: (layer: Layer) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<
    'all' | 'memory' | 'network' | 'serving'
  >('all')
  const entries = glossary.filter(
    ([term, definition]) =>
      `${term} ${definition}`.toLowerCase().includes(query.toLowerCase()) &&
      (category === 'all' ||
        (category === 'memory'
          ? /cache|memory|quantization/i
          : category === 'network'
            ? /parallelism|reduce|all-to-all|rdma/i
            : /prefill|decode|batching|ttft|tpot|goodput|embedding/i
        ).test(term)),
  )
  return (
    <>
      <section className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE FIELD GUIDE
          </div>
          <h1>
            Build your mental model.
            <br />
            <span>One layer at a time.</span>
          </h1>
          <p>
            The problems, the solutions, and the trade-offs behind modern AI
            serving.
          </p>
        </div>
        <span className="outline-badge">
          <BookOpen size={15} /> Source-backed. Openly modeled.
        </span>
      </section>
      <section className="reference-architecture">
        <div>
          <span className="card-eyebrow">OUR REFERENCE SYSTEM</span>
          <h2>A fleet is not one giant GPU.</h2>
          <p>
            Think of a city: a fleet contains neighborhoods, each neighborhood
            contains buildings, and each building has machines working together.
            Most requests touch a small slice of the fleet.
          </p>
        </div>
        <div className="architecture-chain">
          {[
            { n: '100,000', label: 'GPUs in the fleet' },
            { n: '20', label: 'Logical serving pods' },
            { n: '12,500', label: 'Independent replicas' },
            { n: '8', label: 'GPUs per replica' },
          ].map((item, i) => (
            <div key={item.label}>
              <strong>{item.n}</strong>
              <span>{item.label}</span>
              {i < 3 && <ArrowRight size={17} />}
            </div>
          ))}
        </div>
        <p className="architecture-caveat">
          A homogeneous teaching architecture. Each logical pod has 5,000 GPUs
          (625 TP=8 replicas); rendered blocks aggregate machines. Actual fleets
          mix hardware, models, replicas, and training jobs.
        </p>
      </section>
      <LifecycleReferenceSection />
      <ModelReferenceSection />
      <section className="layer-guide-grid">
        {layers.map((l, i) => {
          const Icon = layerIcons[l.id]
          const d = details[layerDefaults[l.id]]
          return (
            <article className="layer-guide-card" key={l.id}>
              <div className="guide-card-top">
                <span className="layer-icon">
                  <Icon size={22} />
                </span>
                <span className="small-label">LAYER 0{i + 1}</span>
              </div>
              <h2>{l.title}</h2>
              <p>{l.question}</p>
              <dl>
                <dt>The problem</dt>
                <dd>{d.problem}</dd>
                <dt>The solution</dt>
                <dd>{d.solution}</dd>
                <dt>The performance trade-off</dt>
                <dd>{d.tradeoff}</dd>
              </dl>
              <button className="text-button" onClick={() => onExplore(l.id)}>
                Explore this layer <ArrowRight size={15} />
              </button>
            </article>
          )
        })}
      </section>
      <section className="parallelism-section white-card">
        <span className="card-eyebrow">FOUR WAYS TO DIVIDE THE WORK</span>
        <h2>Parallelism solves different problems.</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Strategy</th>
                <th>What is divided?</th>
                <th>Main benefit</th>
                <th>Communication & cost</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>
                  <span className="table-tag purple">TP</span>Tensor parallel
                </th>
                <td>Weights and operations inside a layer</td>
                <td>Fit a large model; reduce per-rank work</td>
                <td>Frequent collectives; latency-sensitive fabric</td>
              </tr>
              <tr>
                <th>
                  <span className="table-tag blue">PP</span>Pipeline parallel
                </th>
                <td>Transformer layers across stages</td>
                <td>Fit deeper models across nodes</td>
                <td>Stage-boundary activations; pipeline bubbles</td>
              </tr>
              <tr>
                <th>
                  <span className="table-tag green">DP</span>Data parallel
                </th>
                <td>Independent requests across replicas</td>
                <td>Scale total serving throughput</td>
                <td>More weight copies; routing and balancing</td>
              </tr>
              <tr>
                <th>
                  <span className="table-tag orange">EP</span>Expert parallel
                </th>
                <td>Mixture-of-experts networks</td>
                <td>Distribute expert parameters and compute</td>
                <td>All-to-all token dispatch; skewed expert load</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="table-note">
          These strategies can be combined. Inference data replicas do not need
          to all-reduce each request; training data replicas synchronize
          gradients.
        </p>
      </section>
      <section className="network-guide white-card">
        <div>
          <span className="card-eyebrow">FOLLOW THE BYTES</span>
          <h2>Three networks, three very different jobs.</h2>
        </div>
        <div className="network-guide-grid">
          <article>
            <span className="network-number">01</span>
            <h3>User → service</h3>
            <span className="outline-badge">HTTPS / SSE</span>
            <p>
              Small prompts, metadata, and streamed tokens. Optimize connection
              handling, timeouts, admission, and user-visible latency.
            </p>
          </article>
          <article>
            <span className="network-number">02</span>
            <h3>Server → server</h3>
            <span className="outline-badge">InfiniBand / RoCE</span>
            <p>
              KV blocks, checkpoint loads, cross-node collectives, and expert
              dispatch. Watch congestion, incast, bisection bandwidth, and
              tails.
            </p>
          </article>
          <article>
            <span className="network-number">03</span>
            <h3>GPU → GPU / HBM</h3>
            <span className="outline-badge">NVLink / memory bus</span>
            <p>
              Local collectives move activations; HBM supplies weight and cache
              data. Optimize locality, kernel IO, and useful work per byte.
            </p>
          </article>
        </div>
        <div className="unit-note">
          <Gauge size={18} />
          <p>
            <strong>Mind the units.</strong> A 400 Gb/s NIC is 50 GB/s before
            overhead. H100’s 900 GB/s NVLink figure is aggregate bidirectional;
            3.35 TB/s HBM bandwidth describes a different interface. These
            figures are not interchangeable application goodput.
          </p>
        </div>
      </section>
      <section className="training-card">
        <div>
          <span className="card-eyebrow">AND WHAT ABOUT TRAINING?</span>
          <h2>
            Same infrastructure.
            <br />A different traffic pattern.
          </h2>
          <p>
            This explorer focuses on inference. Training adds backward passes,
            optimizer state, gradient synchronization, checkpoint writes, and
            job-level recovery. Long synchronous jobs care deeply about
            stragglers and sustained collective bandwidth.
          </p>
        </div>
        <div className="training-flow">
          <span>Token batches</span>
          <ArrowDown size={18} />
          <span>Forward → loss → backward</span>
          <ArrowDown size={18} />
          <span>Gradient reduce / shard</span>
          <ArrowDown size={18} />
          <span>Optimizer update → checkpoint</span>
        </div>
      </section>
      <section className="glossary-section">
        <div className="glossary-heading">
          <div>
            <span className="card-eyebrow">THE LANGUAGE OF THE SYSTEM</span>
            <h2>A jargon-to-understanding dictionary.</h2>
          </div>
          <label className="search-input">
            <Search size={17} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search concepts…"
              aria-label="Search glossary"
            />
            {query && (
              <button
                aria-label="Clear glossary search"
                onClick={() => setQuery('')}
              >
                <X size={15} />
              </button>
            )}
          </label>
        </div>
        <div
          className="guide-filters"
          role="group"
          aria-label="Concept category"
        >
          {(['all', 'serving', 'memory', 'network'] as const).map((c) => (
            <button
              key={c}
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
              aria-pressed={category === c}
            >
              {c === 'all'
                ? 'All concepts'
                : c.charAt(0).toUpperCase() + c.slice(1)}
            </button>
          ))}
          <span>{entries.length} concepts</span>
        </div>
        <div className="glossary-grid">
          {entries.map(([term, def]) => (
            <article key={term}>
              <h3>{term}</h3>
              <p>{def}</p>
            </article>
          ))}
          {entries.length === 0 && (
            <p className="empty-search">
              No matching concepts. Try “cache”, “parallelism”, or “token”.
            </p>
          )}
        </div>
      </section>
      <section className="sources-section">
        <div className="section-header">
          <div>
            <span className="card-eyebrow">THE READING ROOM</span>
            <h2>Go straight to the source.</h2>
            <p>
              Primary research and official documentation behind the
              explanations. Paper results are workload-specific; they are not
              used as universal speedup factors.
            </p>
          </div>
          <BookOpen size={30} />
        </div>
        <div className="source-list">
          {sources.map((source, i) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="source-index">0{i + 1}</span>
              <div>
                <h3>{source.title}</h3>
                <span>{source.org}</span>
                <p>{source.note}</p>
              </div>
              <ArrowUpRight size={18} />
            </a>
          ))}
        </div>
      </section>
    </>
  )
}

function HelpModal({
  onClose,
  onGuide,
}: {
  onClose: () => void
  onGuide: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    dialog.current?.showModal()
    const el = dialog.current
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="help-modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <button
        className="modal-close icon-button"
        aria-label="Close help"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <span className="modal-symbol">
        <Layers3 size={30} />
      </span>
      <div className="eyebrow">WELCOME TO STRATA</div>
      <h2>Get a feel for the whole system.</h2>
      <p>
        Strata is a 3D field guide to AI serving. The architecture and traffic
        animations are conceptual; the lab uses an explicit teaching model, not
        live cluster telemetry.
      </p>
      <div className="help-instructions">
        <div>
          <MousePointer2 size={20} />
          <span>
            <strong>Move around</strong>Drag to orbit. Scroll to zoom. Use reset
            to find your way back.
          </span>
        </div>
        <div>
          <Box size={20} />
          <span>
            <strong>Look closer</strong>Click a component or its button to
            inspect it. Switch layers to zoom from fleet to GPU.
          </span>
        </div>
        <div>
          <Route size={20} />
          <span>
            <strong>Follow the work</strong>Trace a request, then change the
            workload in the lab to see the trade-offs.
          </span>
        </div>
      </div>
      <div className="modal-actions">
        <button className="button button-light" onClick={onGuide}>
          Sources & field guide <ExternalLink size={15} />
        </button>
        <button className="button button-dark" onClick={onClose}>
          Let’s explore <ArrowRight size={15} />
        </button>
      </div>
    </dialog>
  )
}

export default App
