import { useEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Box,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  Cpu,
  Crosshair,
  Eye,
  EyeOff,
  FlaskConical,
  Flame,
  Globe2,
  Grid2X2,
  HardDrive,
  Layers3,
  Maximize2,
  Minus,
  Network,
  Orbit,
  Pause,
  Play,
  Plus,
  Route,
  Scan,
  Search,
  Server,
  Settings2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import { details, journey, layerNodes, layers } from '../content'
import type { Layer, Page, Traffic } from '../content'
import { formatNumber, kvBytes, simulate } from '../model'
import type { Parameters, Strategy } from '../model'
import {
  ANIMATION_DURATION,
  getMotionFrame,
  motionChapters,
  payloadDescriptions,
} from '../motion'
import type { CameraView, MotionFrame } from '../motion'
import { InfrastructureScene } from '../components/InfrastructureScene'
import type { SceneHandle } from '../components/InfrastructureScene'
import type { PayloadInspection } from '../scene/engine'
import type { SpatialPin } from '../spatial'
import {
  adjacentJourneyStage,
  collectiveTime,
  journeyPayload,
  pinLearningCard,
} from './model'
import LearningLab from './LearningLab'
import LearningLibrary from './LearningLibrary'
import type { LibraryTab } from './LearningLibrary'
import './learning.css'
import { ExampleHUD, ModelComparison } from '../examples/ModelExamples'
import {
  defaultExampleInputs,
  exampleStage,
  exampleUrl,
  parseExampleLocation,
  sanitizeExampleInputs,
} from '../examples/model'
import type { ExampleView } from '../examples/model'
import { findExample } from '../examples/catalog'
import type { ExampleId } from '../examples/catalog'
import { LifecycleHUD, LifecycleComparison } from '../lifecycle/Lifecycle'
import {
  clearLifecycleParams,
  defaultLifecycleView,
  lifecycleStage,
  lifecycleUrl,
  parseLifecycleLocation,
  sanitizeLifecycleInputs,
} from '../lifecycle/model'
import type { LifecycleView } from '../lifecycle/model'
import { phaseInfo } from '../lifecycle/catalog'
import { hotIssues } from '../issues/catalog'
import { HotIssuesHUD, HotIssuesMethodology } from '../issues/HotIssues'
import {
  clearIssueParams,
  defaultIssueView,
  issueIndex,
  issueUrl,
  parseIssueLocation,
  sanitizeIssueInputs,
  selectIssue,
} from '../issues/model'
import type { IssueView } from '../issues/model'
import { VisualSettings, useEffectsQuality } from '../components/VisualSettings'

export type LearningPage = Exclude<Page, 'game'>
type Panel =
  | 'lab'
  | 'guide'
  | 'chapters'
  | 'components'
  | 'experiment'
  | 'payload'
  | 'collective'
  | 'journey'
  | null
interface Props {
  active: boolean
  page: LearningPage
  sceneRef: RefObject<SceneHandle | null>
  layer: Layer
  traffic: Traffic
  selected: string
  params: Parameters
  strategy: Strategy
  paused: boolean
  speed: number
  exploded: boolean
  heatmap: boolean
  orbit: boolean
  guided: boolean
  journeyStep: number
  onNavigate: (page: Page) => void
  onClassic: () => void
  onLayer: (layer: Layer) => void
  onTraffic: (traffic: Traffic) => void
  onSelect: (node: string) => void
  onPaused: (paused: boolean) => void
  onSpeed: (speed: number) => void
  onExploded: (v: boolean) => void
  onHeatmap: (v: boolean) => void
  onOrbit: (v: boolean) => void
  onGuided: () => void
  onFollowing: () => void
  onManual: () => void
  onChapter: (index: number) => void
  onFrame: (frame: MotionFrame) => void
  onParameters: (p: Parameters) => void
  onStrategy: (s: Strategy) => void
  onPreset: (id: string) => void
  onJourneyStep: (step: number) => void
  onJourneyScene: (step: number, animate: boolean) => void
  onLocate: (layer: Layer, traffic: Traffic, node: string) => void
  advancedLab: ReactNode
  advancedGuide: ReactNode
}
const layerIcons = { fleet: Globe2, pod: Network, rack: Server, gpu: Cpu }
const lensIcons = {
  requests: Route,
  kv: HardDrive,
  collectives: Network,
  tensors: Cpu,
}
const lensNames: Record<Traffic, string> = {
  requests: 'Requests',
  kv: 'KV cache',
  collectives: 'Collectives',
  tensors: 'Tensor flow',
}
const pages: { id: LearningPage; title: string; Icon: typeof Box }[] = [
  { id: 'explore', title: 'Explore', Icon: Globe2 },
  { id: 'journey', title: 'Request journey', Icon: Route },
  { id: 'lab', title: 'Trade-off lab', Icon: FlaskConical },
  { id: 'guide', title: 'Field guide', Icon: BookOpen },
]

function LearningDialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
    const node = ref.current
    return () => node?.close()
  }, [])
  return (
    <dialog
      className="learn-dialog"
      ref={ref}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="learn-dialog-bar">
        <span>
          <Layers3 size={15} />
          {title}
        </span>
        <button onClick={onClose} aria-label="Close learning dialog">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  )
}

export default function LearningFusion(p: Props) {
  const effects = useEffectsQuality()
  const root = useRef<HTMLElement>(null),
    card = useRef<HTMLElement>(null),
    cardHeight = useRef(360),
    pin = useRef<SpatialPin | null>(null)
  const [frame, setFrame] = useState(() =>
    getMotionFrame(0, p.traffic, p.params, p.strategy),
  )
  const [panel, setPanel] = useState<Panel>(() =>
    p.page === 'explore' ? null : p.page,
  )
  const [inspector, setInspector] = useState(
    p.page === 'explore' && window.innerWidth >= 700,
  )
  const [inspectorTab, setInspectorTab] = useState<
    'overview' | 'problem' | 'experiment'
  >('overview')
  const [snapshot, setSnapshot] = useState<PayloadInspection | null>(null)
  const [follow, setFollow] = useState(false),
    [labels, setLabels] = useState(true),
    [theater, setTheater] = useState(false),
    [webgl, setWebgl] = useState(true)
  const [camera, setCamera] = useState<CameraView>('isometric'),
    [reader, setReader] = useState<
      'lab' | 'guide' | 'examples' | 'lifecycle' | 'issues' | null
    >(null),
    [help, setHelp] = useState(false)
  const [query, setQuery] = useState(''),
    [libraryTab, setLibraryTab] = useState<LibraryTab>(() =>
      parseIssueLocation(location.href)
        ? 'hot'
        : parseLifecycleLocation(location.href)
          ? 'lifecycle'
          : parseExampleLocation(location.href) ||
              new URLSearchParams(location.search).get('examples') === 'all'
            ? 'models'
            : 'concepts',
    )
  const [example, setExample] = useState<ExampleView | null>(() =>
    parseExampleLocation(location.href),
  )
  const [lifecycle, setLifecycle] = useState<LifecycleView>(
    () => parseLifecycleLocation(location.href) || defaultLifecycleView(),
  )
  const [issue, setIssue] = useState<IssueView>(
    () => parseIssueLocation(location.href) || defaultIssueView(),
  )
  const issueActive = p.active && p.page === 'guide' && libraryTab === 'hot'
  const lifecycleActive =
    p.active && p.page === 'guide' && libraryTab === 'lifecycle'
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const exampleActive =
    p.active && p.page === 'guide' && libraryTab === 'models' && !!example
  const teachingActive = exampleActive || lifecycleActive || issueActive
  const activeLesson = issueActive
    ? issue
    : lifecycleActive
      ? lifecycle
      : exampleActive
        ? example
        : null
  const clearLifecycleUrl = () => {
    const url = new URL(location.href)
    clearLifecycleParams(url)
    history.replaceState({}, '', url)
  }
  const clearIssueUrl = () => {
    const url = new URL(location.href)
    clearIssueParams(url)
    history.replaceState({}, '', url)
  }
  const changeIssue = (v: IssueView) => {
    clearLifecycleUrl()
    clearExampleUrl()
    closeContext()
    setFollow(false)
    setJourneyAuto(false)
    p.onManual()
    const stage = issueIndex(v.stage)
    if (
      stage !== issue.stage ||
      (v.panel !== issue.panel && ['brief', 'lab'].includes(v.panel))
    )
      p.sceneRef.current?.focus(`issue-stage-${stage}`)
    setIssue({
      ...v,
      stage,
      playing: reduced ? false : v.playing,
      inputs: sanitizeIssueInputs(hotIssues[stage].id, v.inputs),
    })
  }
  const selectIssueStage = (stage: number, automatic = false) => {
    const index = issueIndex(stage)
    if (!automatic) p.sceneRef.current?.focus(`issue-stage-${index}`)
    setIssue((v) => selectIssue(v, index, automatic))
  }
  const changeLifecycle = (v: LifecycleView) => {
    clearIssueUrl()
    closeContext()
    setFollow(false)
    setJourneyAuto(false)
    p.onManual()
    setLifecycle({
      ...v,
      stage: lifecycleStage(v.stage),
      playing: reduced ? false : v.playing,
      inputs: sanitizeLifecycleInputs(v.inputs),
    })
  }
  const selectLifecycleStage = (stage: number, automatic = false) =>
    setLifecycle((v) => ({
      ...v,
      stage: lifecycleStage(stage),
      playing: automatic ? v.playing : false,
    }))
  const toggleLesson = () => {
    if (reduced) return
    if (issueActive) setIssue((v) => ({ ...v, playing: !v.playing }))
    else if (lifecycleActive)
      setLifecycle((v) => ({ ...v, playing: !v.playing }))
    else if (exampleActive)
      setExample((v) => (v ? { ...v, playing: !v.playing } : null))
  }
  const clearExampleUrl = () => {
    const url = new URL(location.href)
    for (const key of [...url.searchParams.keys()])
      if (
        key === 'example' ||
        key === 'examples' ||
        key === 'stage' ||
        key.startsWith('ex_')
      )
        url.searchParams.delete(key)
    history.replaceState({}, '', url)
  }
  const changeExample = (view: ExampleView | null) => {
    clearIssueUrl()
    clearLifecycleUrl()
    closeContext()
    setFollow(false)
    setJourneyAuto(false)
    p.onManual()
    setExample(
      view
        ? {
            ...view,
            stage: exampleStage(view.stage),
            inputs: sanitizeExampleInputs(view.id, view.inputs),
          }
        : null,
    )
    if (!view) clearExampleUrl()
  }
  const selectExample = (id: ExampleId) =>
    changeExample({
      id,
      stage: 0,
      playing: false,
      inputs: defaultExampleInputs(id),
    })
  const selectExampleStage = (stage: number, playing?: boolean) =>
    setExample((previous) =>
      previous
        ? {
            ...previous,
            stage: exampleStage(stage),
            playing: playing ?? previous.playing,
          }
        : null,
    )
  const chooseLibraryTab = (tab: LibraryTab) => {
    setLibraryTab(tab)
    if (tab !== 'models') clearExampleUrl()
    if (tab !== 'lifecycle') clearLifecycleUrl()
    if (tab !== 'hot') clearIssueUrl()
  }
  useEffect(() => {
    if (!p.active || p.page !== 'guide') return
    const clean = new URL(location.href)
    if (libraryTab !== 'hot') clearIssueParams(clean)
    if (libraryTab === 'hot')
      history.replaceState({}, '', issueUrl(location.href, issue))
    else if (libraryTab === 'lifecycle')
      history.replaceState({}, '', lifecycleUrl(clean.toString(), lifecycle))
    else if (libraryTab === 'models') {
      const url = clean
      clearLifecycleParams(url)
      if (example)
        history.replaceState({}, '', exampleUrl(url.toString(), example))
      else {
        url.searchParams.set('examples', 'all')
        history.replaceState({}, '', url)
      }
    }
  }, [p.active, p.page, libraryTab, example, lifecycle, issue])
  useEffect(() => {
    setCamera('isometric')
    if (!exampleActive)
      setExample((v) => (v?.playing ? { ...v, playing: false } : v))
    if (!issueActive)
      setIssue((v) => (v.playing ? { ...v, playing: false } : v))
    if (!lifecycleActive)
      setLifecycle((v) => (v.playing ? { ...v, playing: false } : v))
  }, [exampleActive, lifecycleActive, issueActive])
  useEffect(() => {
    const onPop = () => {
      const hot = parseIssueLocation(location.href),
        life = parseLifecycleLocation(location.href),
        next = parseExampleLocation(location.href)
      setExample(next)
      if (hot) {
        setIssue(hot)
        setLibraryTab('hot')
      } else if (life) {
        setLifecycle(life)
        setLibraryTab('lifecycle')
      } else if (
        next ||
        new URLSearchParams(location.search).get('examples') === 'all'
      )
        setLibraryTab('models')
      else setLibraryTab('concepts')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  useEffect(() => {
    if (!p.active || theater) return
    const reveal = () =>
      root.current
        ?.querySelector('.learn-header nav button[aria-current="page"]')
        ?.scrollIntoView({
          block: 'nearest',
          inline: 'nearest',
          behavior: 'instant',
        })
    reveal()
    window.addEventListener('resize', reveal)
    return () => window.removeEventListener('resize', reveal)
  }, [p.active, p.page, libraryTab, theater])
  const [rank, setRank] = useState(0),
    [prompt, setPrompt] = useState(
      'Explain black holes to a curious ten-year-old.',
    ),
    [rag, setRag] = useState(true),
    [journeyAuto, setJourneyAuto] = useState(false),
    [payloadVisible, setPayloadVisible] = useState(false)
  const detail = details[p.selected] || details.scheduler,
    scope = layers.find((l) => l.id === p.layer)!,
    model = simulate(p.params, p.strategy)
  const chapters = motionChapters[p.traffic],
    context = inspector || panel === 'payload',
    contextKey =
      panel === 'payload' ? `payload-${p.traffic}` : `${p.layer}-${p.selected}`
  const latest = useRef(p)
  latest.current = p
  const refreshAnchor = useRef<(() => void) | null>(null)
  const closeContext = () => {
    setInspector(false)
    if (panel === 'payload') setPanel(null)
    pin.current = null
    root.current?.style.setProperty('--learn-ready', '0')
  }
  const onProject = (key: string, x: number, y: number, visible: boolean) => {
    if (
      !root.current ||
      !context ||
      theater ||
      key !== (panel === 'payload' ? 'payload-anchor' : 'selection-anchor')
    )
      return
    const host = root.current,
      layout = pinLearningCard(
        pin.current,
        contextKey,
        x,
        y,
        host.clientWidth,
        host.clientHeight,
        cardHeight.current,
      )
    pin.current = layout
    for (const [name, value] of Object.entries({
      '--learn-x': `${layout.x}px`,
      '--learn-y': `${layout.y}px`,
      '--learn-width': `${layout.width}px`,
      '--learn-world-x': `${x}px`,
      '--learn-world-y': `${y}px`,
      '--learn-tether-length': `${layout.tetherLength}px`,
      '--learn-tether-angle': `${layout.tetherAngle}deg`,
      '--learn-anchor-visible': visible ? '1' : '0',
      '--learn-ready': '1',
    }))
      host.style.setProperty(name, value)
  }
  refreshAnchor.current = () => {
    if (!webgl && root.current)
      onProject(
        panel === 'payload' ? 'payload-anchor' : 'selection-anchor',
        root.current.clientWidth / 2,
        root.current.clientHeight * 0.45,
        false,
      )
  }
  useEffect(() => {
    if (!context || !card.current) return
    setInspectorTab('overview')
    card.current.focus({ preventScroll: true })
    const observer = new ResizeObserver(() => {
      cardHeight.current = card.current?.offsetHeight || 360
      refreshAnchor.current?.()
    })
    observer.observe(card.current)
    return () => observer.disconnect()
  }, [context, contextKey, theater, p.active])
  useEffect(() => {
    refreshAnchor.current?.()
  }, [webgl, contextKey, context, p.active])
  useEffect(() => {
    if (!p.active) {
      setJourneyAuto(false)
      return
    }
    setReader(null)
    if (p.page === 'journey') {
      setPanel('journey')
      setInspector(false)
      setFollow(false)
      p.onJourneyScene(p.journeyStep, journeyAuto)
    } else {
      setJourneyAuto(false)
      setPanel(p.page === 'lab' ? 'lab' : p.page === 'guide' ? 'guide' : null)
      if (p.page === 'lab') {
        setInspector(false)
        p.onHeatmap(true)
      }
      if (p.page === 'guide') setInspector(false)
    }
  }, [p.active, p.page, p.journeyStep])
  useEffect(() => {
    if (!journeyAuto || !p.active || p.page !== 'journey') return
    const timer = setTimeout(() => {
      if (p.journeyStep >= 6) {
        setJourneyAuto(false)
        p.onPaused(true)
      } else p.onJourneyStep(adjacentJourneyStage(p.journeyStep, 1, rag))
    }, 6500)
    return () => clearTimeout(timer)
  }, [journeyAuto, p.active, p.page, p.journeyStep, rag])
  const go = (page: Page) => {
    if (page !== 'guide') {
      clearExampleUrl()
      clearLifecycleUrl()
      clearIssueUrl()
    }
    setIssue((v) => (v.playing ? { ...v, playing: false } : v))
    setLifecycle((v) => (v.playing ? { ...v, playing: false } : v))
    setExample((previous) =>
      previous ? { ...previous, playing: false } : null,
    )
    closeContext()
    setFollow(false)
    setTheater(false)
    p.onManual()
    if (page === 'journey') {
      setJourneyAuto(false)
      p.onJourneyScene(p.journeyStep, false)
    }
    setPanel(
      page === 'journey'
        ? 'journey'
        : page === 'lab'
          ? 'lab'
          : page === 'guide'
            ? 'guide'
            : null,
    )
    p.onNavigate(page)
    if (page === 'game' && document.fullscreenElement === root.current)
      void document.exitFullscreen?.().catch(() => {})
  }
  const inspect = (node: string) => {
    setTheater(false)
    setFollow(false)
    setInspector(true)
    setPanel(null)
    pin.current = null
    p.onSelect(node)
    p.onPaused(true)
  }
  const view = (v: CameraView) => {
    setCamera(v)
    setFollow(false)
    p.onManual()
    p.sceneRef.current?.view(v)
  }
  const toggleFollow = () => {
    const next = !follow
    setFollow(next)
    closeContext()
    setPanel(null)
    setJourneyAuto(false)
    if (next) {
      if (p.page === 'journey') p.onNavigate('explore')
      p.onFollowing()
    } else p.onManual()
  }
  const inspectData = () => {
    if (webgl) p.sceneRef.current?.inspectPacket()
    else {
      setSnapshot({
        ...payloadDescriptions[p.traffic],
        time: frame.time,
        size:
          p.traffic === 'kv'
            ? `${(kvBytes(p.params.inputTokens) / 2 ** 20).toFixed(0)} MiB total · ${(kvBytes(p.params.inputTokens) / 2 ** 20 / 8).toFixed(1)} MiB / rank`
            : p.traffic === 'collectives'
              ? `Exchange ${frame.collectiveStep}/14 · rank ${rank} [${frame.buffers[rank].join(', ')}]`
              : frame.chapter.payload,
        explanation: frame.chapter.explanation,
      })
      setInspector(false)
      setPanel('payload')
      p.onPaused(true)
    }
  }
  useEffect(() => {
    if (!p.active) return
    const key = (e: KeyboardEvent) => {
      if (
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(
          (e.target as HTMLElement).tagName,
        ) ||
        reader ||
        help
      )
        return
      if (teachingActive && activeLesson) {
        const select = (stage: number) =>
          issueActive
            ? selectIssueStage(stage)
            : lifecycleActive
              ? selectLifecycleStage(stage)
              : selectExampleStage(stage, false)
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault()
          select(
            (issueActive ? issueIndex : lifecycleStage)(
              activeLesson.stage + (e.key === 'ArrowRight' ? 1 : -1),
            ),
          )
          return
        }
        if (
          (issueActive
            ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
            : ['1', '2', '3', '4', '5', '6']
          ).includes(e.key)
        ) {
          select(e.key === '0' ? 9 : Number(e.key) - 1)
          return
        }
        if (
          e.code === 'Space' &&
          (e.target as HTMLElement).tagName !== 'BUTTON'
        ) {
          e.preventDefault()
          toggleLesson()
          return
        }
        if (e.key.toLowerCase() === 'f') {
          p.sceneRef.current?.focus(
            `${issueActive ? 'issue' : lifecycleActive ? 'lifecycle' : 'example'}-stage-${activeLesson.stage}`,
          )
          setPanel(null)
          return
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        if (theater) setTheater(false)
        else {
          closeContext()
          setPanel(null)
        }
        return
      }
      if (e.key.toLowerCase() === 'h') {
        setTheater(!theater)
        closeContext()
        setPanel(null)
        return
      }
      if (
        e.code === 'Space' &&
        (e.target as HTMLElement).tagName !== 'BUTTON'
      ) {
        e.preventDefault()
        p.onPaused(!p.paused)
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        closeContext()
        setPanel(null)
        p.onLayer(layers[Number(e.key) - 1].id)
      } else if (e.key.toLowerCase() === 'l') setLabels(!labels)
      else if (e.key.toLowerCase() === 'r') view('isometric')
      else if (['q', 'e'].includes(e.key.toLowerCase())) {
        p.onManual()
        setFollow(false)
        p.sceneRef.current?.rotate(e.key.toLowerCase() === 'q' ? -1 : 1)
      } else if (e.key.toLowerCase() === 'f') toggleFollow()
      else if (e.key === '?') setHelp(true)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  const setStep = (step: number) => {
    setJourneyAuto(false)
    p.onJourneyStep(step)
  }
  const open = (next: Panel) => {
    closeContext()
    setPanel(panel === next ? null : next)
  }
  const panelTitle =
    panel === 'lab'
      ? 'Experiment with the service'
      : panel === 'guide'
        ? 'The learning library'
        : panel === 'journey'
          ? 'The life of a request'
          : panel === 'collective'
            ? 'Eight ranks. One shared answer.'
            : panel === 'chapters'
              ? 'Choose a transformation'
              : panel === 'experiment'
                ? 'Change the workload'
                : 'Locate a component'
  const changeParameters = (next: Parameters) => p.onParameters(next)
  const experimentControls = (
    <div className="learn-experiment-controls">
      <label>
        <span>
          Prompt length
          <strong>{p.params.inputTokens.toLocaleString()} tokens</strong>
        </span>
        <input
          type="range"
          min={128}
          max={32768}
          step={128}
          aria-label="3D prompt length"
          value={p.params.inputTokens}
          onChange={(e) =>
            changeParameters({
              ...p.params,
              inputTokens: Number(e.target.value),
            })
          }
        />
      </label>
      <label>
        <span>Fabric endpoint</span>
        <select
          aria-label="3D fabric bandwidth"
          value={p.params.networkGbps}
          onChange={(e) =>
            changeParameters({
              ...p.params,
              networkGbps: Number(e.target.value),
            })
          }
        >
          {Array.from(new Set([25, 100, 400, 800, p.params.networkGbps]))
            .sort((a, b) => a - b)
            .map((n) => (
              <option key={n} value={n}>
                {n} Gb/s
              </option>
            ))}
        </select>
      </label>
      <button
        onClick={() => {
          p.onHeatmap(true)
          changeParameters({
            ...p.params,
            arrivalRate: p.params.arrivalRate >= 36000 ? 18000 : 36000,
          })
        }}
      >
        <Zap size={14} />
        {p.params.arrivalRate >= 36000
          ? 'Restore baseline traffic'
          : 'Inject a traffic burst'}
      </button>
      <p>
        Shapes and heatmaps are illustrative. Memory sizes and load use the
        shared analytical model.
      </p>
      <button className="learn-text-link" onClick={() => go('lab')}>
        Compare serving strategies
        <ArrowRight size={14} />
      </button>
    </div>
  )
  return (
    <section
      ref={root}
      className={`learning-fusion ${theater ? 'learn-cinema' : ''} ${teachingActive ? 'is-model-example' : ''} ${lifecycleActive ? 'is-lifecycle' : ''} ${issueActive ? 'is-hot-issue' : ''}`}
      style={
        {
          '--model-accent': issueActive
            ? hotIssues[issue.stage].color
            : lifecycleActive
              ? phaseInfo(lifecycle.phase).color
              : example
                ? findExample(example.id)!.color
                : '#c6dea0',
        } as React.CSSProperties
      }
      hidden={!p.active}
      aria-label="Immersive Learning workspace"
    >
      <div className="learning-world">
        <InfrastructureScene
          ref={p.sceneRef}
          effects={effects}
          active={p.active}
          immersive
          layer={p.layer}
          traffic={p.traffic}
          selected={p.selected}
          paused={p.paused}
          params={p.params}
          strategy={p.strategy}
          speed={p.speed}
          exploded={p.exploded}
          heatmap={p.heatmap}
          orbit={p.orbit}
          showLabels={labels && !theater}
          followPayload={follow}
          issue={issueActive ? issue : null}
          onIssueStage={(stage, automatic) => {
            selectIssueStage(stage, automatic)
            if (!automatic) setPanel('guide')
          }}
          lifecycle={lifecycleActive ? lifecycle : null}
          onLifecycleStage={(stage, automatic) => {
            selectLifecycleStage(stage, automatic)
            if (!automatic) setPanel('guide')
          }}
          example={exampleActive ? example : null}
          onExampleStage={(stage, automatic) => {
            selectExampleStage(stage, automatic ? undefined : false)
            if (!automatic) setPanel('guide')
          }}
          onSelect={inspect}
          onCameraRelease={() => {
            setFollow(false)
            p.onManual()
          }}
          onProject={onProject}
          onUnavailable={() => setWebgl(false)}
          onRank={(n) => {
            setRank(n)
            setInspector(false)
            setPanel('collective')
            p.onPaused(true)
          }}
          onFrame={(next) => {
            setFrame(next)
            p.onFrame(next)
          }}
          onInspection={(next) => {
            setSnapshot(next)
            if (next) {
              setPanel('payload')
              setInspector(false)
              pin.current = null
              p.onPaused(true)
            }
          }}
        />
      </div>
      {p.active && (
        <>
          <div className="learn-vignette" />
          {theater ? (
            <div className="learn-cinema-controls">
              <button onClick={() => setTheater(false)}>
                <Eye size={16} />
                Show learning controls<kbd>H</kbd>
              </button>
              <button
                onClick={() => {
                  if (teachingActive) toggleLesson()
                  else p.onPaused(!p.paused)
                }}
                aria-label={
                  teachingActive && activeLesson
                    ? activeLesson.playing
                      ? issueActive
                        ? 'Pause hot issues tour'
                        : lifecycleActive
                          ? 'Pause lifecycle walkthrough'
                          : 'Pause model walkthrough'
                      : issueActive
                        ? 'Play hot issues tour'
                        : lifecycleActive
                          ? 'Play lifecycle walkthrough'
                          : 'Play model walkthrough'
                    : p.paused
                      ? 'Play timeline'
                      : 'Pause timeline'
                }
              >
                {(
                  teachingActive && activeLesson
                    ? !activeLesson.playing
                    : p.paused
                ) ? (
                  <Play size={16} />
                ) : (
                  <Pause size={16} />
                )}
              </button>
            </div>
          ) : (
            <>
              <header className="learn-header">
                <button
                  className="learn-brand"
                  onClick={() => go('game')}
                  aria-label="Fleet Command Play the infrastructure game"
                >
                  <span>
                    <Layers3 size={23} />
                  </span>
                  <b>strata.</b>
                  <small>LEARNING WORLDS</small>
                </button>
                <nav aria-label="Learning workspace navigation">
                  {pages.map(({ id, title, Icon }) => (
                    <button
                      key={id}
                      onClick={() => {
                        if (id === 'guide') chooseLibraryTab('concepts')
                        go(id)
                      }}
                      aria-current={
                        p.page === id &&
                        !(
                          id === 'guide' &&
                          ['models', 'lifecycle', 'hot'].includes(libraryTab)
                        )
                          ? 'page'
                          : undefined
                      }
                      aria-label={title}
                    >
                      <Icon size={15} />
                      <span>{title}</span>
                    </button>
                  ))}
                  <button
                    aria-label="Real models"
                    aria-current={
                      p.page === 'guide' && libraryTab === 'models'
                        ? 'page'
                        : undefined
                    }
                    onClick={() => {
                      go('guide')
                      chooseLibraryTab('models')
                      setQuery('')
                    }}
                  >
                    <Boxes size={15} />
                    <span>Real models</span>
                  </button>
                  <button
                    aria-label="AI lifecycle"
                    aria-current={
                      p.page === 'guide' && libraryTab === 'lifecycle'
                        ? 'page'
                        : undefined
                    }
                    onClick={() => {
                      go('guide')
                      chooseLibraryTab('lifecycle')
                      setQuery('')
                    }}
                  >
                    <Layers3 size={15} />
                    <span>AI lifecycle</span>
                  </button>
                  <button
                    aria-label="Hot issues"
                    aria-current={
                      p.page === 'guide' && libraryTab === 'hot'
                        ? 'page'
                        : undefined
                    }
                    onClick={() => {
                      go('guide')
                      chooseLibraryTab('hot')
                      setQuery('')
                    }}
                  >
                    <Flame size={15} />
                    <span>Hot issues</span>
                  </button>
                </nav>
                <div className="learn-header-tools">
                  <VisualSettings />
                  <button
                    onClick={() => {
                      go('guide')
                      chooseLibraryTab('glossary')
                    }}
                    aria-label="Search learning library"
                  >
                    <Search size={17} />
                  </button>
                  <button
                    onClick={p.onClassic}
                    aria-label="Switch to classic learning layout"
                    title="Classic reading layout"
                  >
                    <Grid2X2 size={17} />
                  </button>
                  <button
                    onClick={() => setHelp(true)}
                    aria-label="Learning controls and help"
                  >
                    <CircleHelp size={17} />
                  </button>
                </div>
              </header>
              {issueActive && (
                <HotIssuesHUD
                  view={issue}
                  onChange={changeIssue}
                  onStage={(stage) => selectIssueStage(stage)}
                  reduced={reduced}
                  panelOpen={panel === 'guide'}
                  onOpen={() => setPanel(panel === 'guide' ? null : 'guide')}
                  onFocus={() => {
                    p.sceneRef.current?.focus(`issue-stage-${issue.stage}`)
                    setPanel(null)
                  }}
                  onExit={() => go('explore')}
                />
              )}
              {lifecycleActive && (
                <LifecycleHUD
                  view={lifecycle}
                  onChange={changeLifecycle}
                  onStage={selectLifecycleStage}
                  reduced={reduced}
                  panelOpen={panel === 'guide'}
                  onOpen={() => setPanel(panel === 'guide' ? null : 'guide')}
                  onFocus={() =>
                    p.sceneRef.current?.focus(
                      `lifecycle-stage-${lifecycle.stage}`,
                    )
                  }
                  onExit={() => go('explore')}
                />
              )}
              {exampleActive && example && (
                <ExampleHUD
                  view={example}
                  panelOpen={panel === 'guide'}
                  reduced={reduced}
                  onStage={(stage) => {
                    selectExampleStage(stage, false)
                    if (panel === 'guide') setPanel('guide')
                  }}
                  onPlay={() =>
                    setExample({ ...example, playing: !example.playing })
                  }
                  onOpen={() => setPanel(panel === 'guide' ? null : 'guide')}
                  onFocus={() => {
                    p.sceneRef.current?.focus(`example-stage-${example.stage}`)
                    setPanel(null)
                  }}
                  onExit={() => go('explore')}
                />
              )}
              <div className="learn-scope">
                <span>
                  <i />{' '}
                  {p.page === 'explore'
                    ? 'THE INFRASTRUCTURE EXPLORER'
                    : p.page === 'journey'
                      ? 'ONE PROMPT. SEVEN TRANSFORMATIONS.'
                      : p.page === 'lab'
                        ? 'CHANGE THE WORKLOAD'
                        : 'KNOWLEDGE IN CONTEXT'}
                </span>
                <h1>
                  {p.page === 'explore'
                    ? scope.title
                    : p.page === 'journey'
                      ? 'Follow the state.'
                      : p.page === 'lab'
                        ? 'Make the trade-offs visible.'
                        : 'Build your mental model.'}
                </h1>
                <p>
                  {p.page === 'explore'
                    ? scope.question
                    : p.page === 'journey'
                      ? 'From API text to the last output token.'
                      : p.page === 'lab'
                        ? 'Synthetic estimates. One world. Many strategies.'
                        : 'Every concept has a place in the world.'}
                </p>
              </div>
              <div
                className="learn-metrics"
                aria-label="Learning model metrics"
              >
                <div>
                  <Cpu size={14} />
                  <span>
                    Modeled GPUs<strong>{formatNumber(p.params.gpus)}</strong>
                  </span>
                </div>
                <div>
                  <HardDrive size={14} />
                  <span>
                    Prompt KV / TP group
                    <strong>
                      {(kvBytes(p.params.inputTokens) / 2 ** 20).toFixed(0)}
                      <small> MiB</small>
                    </strong>
                  </span>
                </div>
                <div>
                  <Activity size={14} />
                  <span>
                    Offered model load
                    <strong
                      className={model.utilization >= 1 ? 'overloaded' : ''}
                    >
                      {Math.round(model.utilization * 100)}
                      <small>%</small>
                    </strong>
                  </span>
                </div>
              </div>
              <nav
                className="learn-scale-rail"
                aria-label="Infrastructure scale"
              >
                {layers.map((l, i) => {
                  const Icon = layerIcons[l.id]
                  return (
                    <button
                      key={l.id}
                      aria-pressed={p.layer === l.id}
                      aria-label={`${i + 1} ${l.name} ${l.scale}`}
                      onClick={() => {
                        closeContext()
                        setFollow(false)
                        p.onLayer(l.id)
                      }}
                    >
                      <Icon size={20} />
                      <span>
                        {l.name}
                        <small>{l.scale}</small>
                      </span>
                      <kbd>{i + 1}</kbd>
                    </button>
                  )
                })}
              </nav>
              <aside
                className="learn-narration"
                aria-label="Current 3D transformation"
              >
                <div>
                  <i style={{ background: frame.chapter.color }} />
                  <span>
                    0{frame.chapterIndex + 1} /{' '}
                    {String(chapters.length).padStart(2, '0')} ·{' '}
                    {lensNames[p.traffic].toUpperCase()}
                  </span>
                  <button
                    onClick={() => p.onPaused(!p.paused)}
                    aria-label={
                      p.paused ? 'Resume explanation' : 'Pause to read'
                    }
                  >
                    {p.paused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                </div>
                <h2>{frame.chapter.title}</h2>
                <code>{frame.chapter.payload}</code>
                <p>{frame.chapter.explanation}</p>
                <span className="learn-constraint">
                  <Zap size={12} />
                  {frame.chapter.constraint}
                </span>
              </aside>
              <nav
                className="learn-camera"
                aria-label="Learning camera controls"
              >
                {(['isometric', 'top', 'front'] as CameraView[]).map((v, i) => {
                  const Icon = [Box, Layers3, Scan][i]
                  return (
                    <button
                      key={v}
                      onClick={() => view(v)}
                      aria-label={
                        ['Isometric view', 'Top down', 'Front view'][i]
                      }
                      aria-pressed={camera === v && !follow}
                    >
                      <Icon size={17} />
                    </button>
                  )
                })}
                <i />
                <button
                  aria-label="Zoom learning world in"
                  onClick={() => {
                    setFollow(false)
                    p.onManual()
                    p.sceneRef.current?.zoom(1)
                  }}
                >
                  <Plus size={17} />
                </button>
                <button
                  aria-label="Zoom learning world out"
                  onClick={() => {
                    setFollow(false)
                    p.onManual()
                    p.sceneRef.current?.zoom(-1)
                  }}
                >
                  <Minus size={17} />
                </button>
                {!teachingActive && (
                  <>
                    <button
                      onClick={() => p.onExploded(!p.exploded)}
                      aria-label="Explode hardware"
                      aria-pressed={p.exploded}
                    >
                      <Layers3 size={17} />
                    </button>
                    <button
                      onClick={() => p.onHeatmap(!p.heatmap)}
                      aria-label="Toggle load heatmap"
                      aria-pressed={p.heatmap}
                    >
                      <Activity size={17} />
                    </button>
                  </>
                )}
                <button
                  onClick={() => setLabels(!labels)}
                  aria-label={
                    labels ? 'Hide learning labels' : 'Show learning labels'
                  }
                >
                  {labels ? <Eye size={17} /> : <EyeOff size={17} />}
                </button>
                <button
                  onClick={() => {
                    closeContext()
                    setPanel(null)
                    setTheater(true)
                  }}
                  aria-label="Learning cinema mode"
                >
                  <Maximize2 size={17} />
                </button>
              </nav>
              {context && (
                <>
                  <div className="learn-reticle" aria-hidden="true" />
                  <div className="learn-tether" aria-hidden="true" />
                  <section
                    ref={card}
                    tabIndex={-1}
                    className="learn-object-card"
                    aria-label={
                      panel === 'payload'
                        ? 'Learning payload inspection'
                        : 'Learning object inspector'
                    }
                    style={
                      { '--detail-color': detail.color } as React.CSSProperties
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.stopPropagation()
                        closeContext()
                      }
                    }}
                  >
                    <div className="learn-card-overline">
                      <span>
                        <i />
                        {panel === 'payload'
                          ? 'PAYLOAD / TEACHING SNAPSHOT'
                          : detail.tag}
                      </span>
                      <button
                        onClick={closeContext}
                        aria-label="Close learning inspection"
                      >
                        <X size={17} />
                      </button>
                    </div>
                    {panel === 'payload' && snapshot ? (
                      <>
                        <h2>{snapshot.title}</h2>
                        <strong className="learn-payload-size">
                          {snapshot.size}
                        </strong>
                        <span className="learn-payload-transport">
                          <Network size={13} />
                          {snapshot.transport}
                        </span>
                        <p>{snapshot.explanation}</p>
                        <pre>{snapshot.formula}</pre>
                        <span className="learn-snapshot-time">
                          Snapshot at {snapshot.time.toFixed(1)} teaching
                          seconds
                        </span>
                        <button
                          className="learn-primary"
                          onClick={() => {
                            closeContext()
                            if (follow) p.onFollowing()
                            else toggleFollow()
                          }}
                        >
                          <Orbit size={15} />
                          {follow ? 'Resume the ride' : 'Ride with the payload'}
                        </button>
                      </>
                    ) : (
                      <>
                        <h2>{detail.title}</h2>
                        <nav
                          className="learn-inspector-tabs"
                          aria-label="Inspector sections"
                        >
                          {(['overview', 'problem', 'experiment'] as const).map(
                            (t) => (
                              <button
                                key={t}
                                aria-pressed={inspectorTab === t}
                                onClick={() => setInspectorTab(t)}
                              >
                                {t === 'overview'
                                  ? 'Understand'
                                  : t === 'problem'
                                    ? 'Trade-offs'
                                    : 'Experiment'}
                              </button>
                            ),
                          )}
                        </nav>
                        {inspectorTab === 'overview' ? (
                          <>
                            <p>{detail.description}</p>
                            <div className="learn-detail-metric">
                              <strong>{detail.metric}</strong>
                              <span>{detail.metricLabel}</span>
                            </div>
                            <dl>
                              {detail.facts.map((f) => (
                                <div key={f.label}>
                                  <dt>{f.label}</dt>
                                  <dd>{f.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </>
                        ) : inspectorTab === 'problem' ? (
                          <div className="learn-problem-sequence">
                            <span>WHAT GOES WRONG</span>
                            <p>{detail.problem}</p>
                            <span>HOW TO RESPOND</span>
                            <p>{detail.solution}</p>
                            <span>WHAT IT COSTS</span>
                            <p>{detail.tradeoff}</p>
                          </div>
                        ) : (
                          experimentControls
                        )}
                        <div className="learn-object-actions">
                          <button
                            className="learn-primary"
                            onClick={() => {
                              closeContext()
                              p.sceneRef.current?.focus(p.selected)
                            }}
                          >
                            <Crosshair size={15} />
                            Focus in the world
                          </button>
                          <button
                            className="learn-square"
                            aria-label="Follow this stage"
                            onClick={() => {
                              const i = journey.findIndex(
                                (j) => j.node === p.selected,
                              )
                              setStep(i < 0 ? 3 : i)
                              go('journey')
                            }}
                          >
                            <Route size={16} />
                          </button>
                        </div>
                      </>
                    )}
                  </section>
                </>
              )}
              {panel && panel !== 'payload' && (
                <aside
                  className={`learn-panel ${panel === 'lab' || panel === 'guide' ? 'learn-panel-wide' : ''}`}
                  aria-label={panelTitle}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      e.stopPropagation()
                      setPanel(null)
                    }
                  }}
                >
                  <div className="learn-panel-top">
                    <span>
                      <i />
                      {panelTitle}
                    </span>
                    <button
                      onClick={() => setPanel(null)}
                      aria-label="Close learning panel"
                    >
                      <X size={19} />
                    </button>
                  </div>
                  {panel === 'lab' ? (
                    <LearningLab
                      params={p.params}
                      strategy={p.strategy}
                      onStrategy={p.onStrategy}
                      onParameters={changeParameters}
                      onPreset={p.onPreset}
                      onWorkbench={() => setReader('lab')}
                      onChallengeWorld={(c) => {
                        closeContext()
                        p.onLocate(c.world.layer, c.world.traffic, c.world.node)
                        p.onHeatmap(true)
                      }}
                    />
                  ) : panel === 'guide' ? (
                    <LearningLibrary
                      query={query}
                      onQuery={setQuery}
                      tab={libraryTab}
                      onTab={chooseLibraryTab}
                      example={example}
                      onExample={changeExample}
                      onChooseExample={selectExample}
                      onCompare={() => setReader('examples')}
                      issue={issue}
                      onIssue={changeIssue}
                      onIssueMethodology={() => setReader('issues')}
                      lifecycle={lifecycle}
                      onLifecycle={changeLifecycle}
                      onLifecycleCompare={() => setReader('lifecycle')}
                      onReading={() => setReader('guide')}
                      onLocate={(layer, traffic, node) => {
                        p.onLocate(layer, traffic, node)
                        setPanel(null)
                        setInspector(true)
                        pin.current = null
                        p.onNavigate('explore')
                      }}
                    />
                  ) : panel === 'experiment' ? (
                    <>
                      <h2>A small change. A different constraint.</h2>
                      {experimentControls}
                    </>
                  ) : panel === 'components' ? (
                    <>
                      <h2>Every part has a job.</h2>
                      <p>
                        Choose a component to open its explanation in the world.
                      </p>
                      <div className="learn-component-list">
                        {layerNodes[p.layer].map((id) => (
                          <button key={id} onClick={() => inspect(id)}>
                            <i style={{ background: details[id].color }} />
                            <span>
                              {details[id].title}
                              <small>{details[id].tag}</small>
                            </span>
                            <ArrowRight size={14} />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : panel === 'chapters' ? (
                    <>
                      <h2>Pause at the interesting part.</h2>
                      <div className="learn-chapter-list">
                        {chapters.map((c, i) => (
                          <button
                            key={c.title}
                            aria-current={
                              frame.chapterIndex === i ? 'step' : undefined
                            }
                            aria-label={`Animation chapter ${i + 1}: ${c.title}`}
                            onClick={() => {
                              closeContext()
                              p.onChapter(i)
                              setPanel(null)
                            }}
                          >
                            <span>{String(i + 1).padStart(2, '0')}</span>
                            <div>
                              <strong>{c.title}</strong>
                              <small>
                                {c.layer.toUpperCase()} · {c.payload}
                              </small>
                            </div>
                            <ArrowUpRight size={13} />
                          </button>
                        ))}
                      </div>
                    </>
                  ) : panel === 'collective' ? (
                    <>
                      <div className="learn-surface-kicker">
                        <Network size={14} />
                        THE ACTUAL RING ALGORITHM
                      </div>
                      <h2>Eight ranks. One shared answer.</h2>
                      <p>
                        Every rank starts with eight copies of its rank + 1.
                        Reduce-scatter and all-gather leave each rank with the
                        vector [36, …, 36].
                      </p>
                      <div className="learn-exchange-control">
                        <button
                          aria-label="Previous exchange"
                          disabled={!frame.collectiveStep}
                          onClick={() => {
                            p.onPaused(true)
                            p.sceneRef.current?.seek(
                              collectiveTime(frame.collectiveStep - 1),
                            )
                          }}
                        >
                          <ChevronLeft size={17} />
                        </button>
                        <strong>Exchange {frame.collectiveStep} / 14</strong>
                        <button
                          aria-label="Next exchange"
                          disabled={frame.collectiveStep >= 14}
                          onClick={() => {
                            p.onPaused(true)
                            p.sceneRef.current?.seek(
                              collectiveTime(frame.collectiveStep + 1),
                            )
                          }}
                        >
                          <ChevronRight size={17} />
                        </button>
                      </div>
                      <label className="learn-exchange-slider">
                        <span>Completed exchanges</span>
                        <input
                          type="range"
                          min={0}
                          max={14}
                          step={1}
                          aria-label="Completed ring exchanges"
                          value={frame.collectiveStep}
                          onChange={(e) => {
                            p.onPaused(true)
                            p.sceneRef.current?.seek(
                              collectiveTime(Number(e.target.value)),
                            )
                          }}
                        />
                      </label>
                      <div className="learn-ranks">
                        {frame.buffers.map((_, i) => (
                          <button
                            key={i}
                            aria-pressed={rank === i}
                            onClick={() => setRank(i)}
                          >
                            GPU {i}
                          </button>
                        ))}
                      </div>
                      <div
                        className="learn-rank-chunks"
                        aria-label={`GPU ${rank} chunk values`}
                      >
                        {frame.buffers[rank].map((value, i) => (
                          <div
                            key={i}
                            className={
                              frame.contributions[rank][i] === 8
                                ? 'complete'
                                : ''
                            }
                          >
                            <span>C{i}</span>
                            <strong>{value === null ? '—' : value}</strong>
                            <small>
                              {frame.contributions[rank][i]}/8 ranks
                            </small>
                          </div>
                        ))}
                      </div>
                      <p>
                        {frame.collectiveStep === 14
                          ? 'All-reduce complete. Every rank has the same fully reduced vector.'
                          : frame.collectiveStep < 7
                            ? 'Reduce-scatter: each exchange adds a neighbor’s partial contribution.'
                            : 'All-gather: distribute the fully reduced chunks to every rank.'}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="learn-surface-kicker">
                        <Route size={14} />
                        ONE REQUEST, SEPARATE STATE
                      </div>
                      <h2>{journey[p.journeyStep].title}</h2>
                      <label className="learn-prompt-label">
                        Example prompt
                        <input
                          aria-label="Example prompt"
                          maxLength={500}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                        />
                      </label>
                      <label className="learn-rag">
                        <input
                          type="checkbox"
                          checked={rag}
                          onChange={(e) => {
                            setRag(e.target.checked)
                            if (!e.target.checked && p.journeyStep === 1)
                              setStep(2)
                          }}
                        />
                        Include retrieval (RAG)
                      </label>
                      <div
                        className="learn-journey-steps"
                        aria-label="Request stages"
                      >
                        {journey.map((j, i) => (
                          <button
                            key={j.short}
                            aria-current={
                              i === p.journeyStep ? 'step' : undefined
                            }
                            disabled={i === 1 && !rag}
                            onClick={() => setStep(i)}
                            aria-label={`Stage ${i + 1}: ${j.short}`}
                          >
                            <span>
                              {i < p.journeyStep ? (
                                <Check size={12} />
                              ) : (
                                String(i + 1).padStart(2, '0')
                              )}
                            </span>
                            {j.short}
                          </button>
                        ))}
                      </div>
                      <p>{journey[p.journeyStep].text}</p>
                      <div className="learn-representation">
                        <span>INPUT</span>
                        <code>
                          {p.journeyStep === 0
                            ? `“${prompt}”`
                            : journey[p.journeyStep].input}
                        </code>
                        <ArrowRight size={17} />
                        <span>OUTPUT</span>
                        <code>
                          {p.journeyStep === 4
                            ? `${(kvBytes(p.params.inputTokens) / 2 ** 20).toFixed(0)} MiB of prompt KV across 8 ranks`
                            : journey[p.journeyStep].output}
                        </code>
                      </div>
                      <div className="learn-stage-detail">
                        <Sparkles size={14} />
                        <p>{journey[p.journeyStep].detail}</p>
                      </div>
                      <div className="learn-journey-actions">
                        <button
                          disabled={p.journeyStep === 0}
                          onClick={() =>
                            setStep(
                              adjacentJourneyStage(p.journeyStep, -1, rag),
                            )
                          }
                        >
                          <ChevronLeft size={14} />
                          Previous
                        </button>
                        <button
                          onClick={() => {
                            setJourneyAuto(!journeyAuto)
                            p.onPaused(journeyAuto)
                          }}
                        >
                          {journeyAuto ? (
                            <Pause size={14} />
                          ) : (
                            <Play size={14} />
                          )}{' '}
                          {journeyAuto
                            ? 'Pause walkthrough'
                            : 'Play walkthrough'}
                        </button>
                        <button
                          onClick={() =>
                            setStep(
                              p.journeyStep === 6
                                ? 0
                                : adjacentJourneyStage(p.journeyStep, 1, rag),
                            )
                          }
                        >
                          {p.journeyStep === 6 ? 'Start again' : 'Next stage'}
                          <ChevronRight size={14} />
                        </button>
                      </div>
                      <button
                        className="learn-text-link"
                        onClick={() => setPayloadVisible(!payloadVisible)}
                      >
                        {payloadVisible ? 'Hide' : 'Inspect'} example payload
                        <ChevronRight size={13} />
                      </button>
                      {payloadVisible && (
                        <pre className="learn-journey-payload">
                          {journeyPayload(p.journeyStep, prompt, p.params)}
                        </pre>
                      )}
                      <div className="learn-stage-response">
                        <span>BOTTLENECK</span>
                        <p>{journey[p.journeyStep].problem}</p>
                        <span>RESPONSE</span>
                        <p>{journey[p.journeyStep].solution}</p>
                      </div>
                      <button
                        className="learn-text-link"
                        onClick={() => {
                          go('explore')
                          p.onTraffic(
                            p.journeyStep === 4
                              ? 'kv'
                              : p.journeyStep === 3
                                ? 'tensors'
                                : 'requests',
                          )
                        }}
                      >
                        Explore this transformation
                        <ArrowUpRight size={14} />
                      </button>
                      <p className="learn-assumption-note">
                        Local educational walkthrough. No inference is executed
                        and your prompt is never sent anywhere.
                      </p>
                    </>
                  )}
                </aside>
              )}
              {follow && (
                <div className="learn-follow-status">
                  <Orbit size={14} />
                  RIDING THE DATA PATH
                  <button
                    onClick={() => {
                      setFollow(false)
                      p.onManual()
                    }}
                  >
                    Leave ride
                    <X size={13} />
                  </button>
                </div>
              )}
              {!panel && !inspector && p.page !== 'explore' && (
                <button className="learn-reopen" onClick={() => go(p.page)}>
                  <BookOpen size={15} />
                  Return to{' '}
                  {p.page === 'lab'
                    ? 'the lab'
                    : p.page === 'guide'
                      ? 'the library'
                      : 'the request'}
                  <ArrowUpRight size={14} />
                </button>
              )}
              <div className="learn-command-deck">
                <div
                  className="learn-lens-dock"
                  aria-label="Learning data lenses"
                >
                  {(Object.keys(lensNames) as Traffic[]).map((mode) => {
                    const Icon = lensIcons[mode]
                    return (
                      <button
                        key={mode}
                        aria-pressed={p.traffic === mode}
                        onClick={() => {
                          closeContext()
                          setFollow(false)
                          setPanel(null)
                          p.onTraffic(mode)
                        }}
                      >
                        <Icon size={17} />
                        <span>{lensNames[mode]}</span>
                      </button>
                    )
                  })}
                  <i />
                  <button
                    onClick={() => open('components')}
                    aria-label="Learning component picker"
                  >
                    <Grid2X2 size={17} />
                  </button>
                  <button
                    onClick={() => open('experiment')}
                    aria-label="World experiment controls"
                  >
                    <Settings2 size={17} />
                  </button>
                  <button onClick={inspectData} aria-label="Inspect data">
                    <Scan size={17} />
                  </button>
                  {p.traffic === 'collectives' && (
                    <button
                      onClick={() => open('collective')}
                      aria-label="Open synchronized ring playground"
                    >
                      <Network size={17} />
                    </button>
                  )}
                </div>
                <div className="learn-timeline-row">
                  <button
                    className="learn-play"
                    onClick={() => p.onPaused(!p.paused)}
                    aria-label={p.paused ? 'Play timeline' : 'Pause timeline'}
                  >
                    {p.paused ? <Play size={16} /> : <Pause size={16} />}
                  </button>
                  <button
                    onClick={() => {
                      closeContext()
                      p.onChapter(Math.max(0, frame.chapterIndex - 1))
                    }}
                    aria-label="Previous animation chapter"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <label className="learn-timeline">
                    <input
                      type="range"
                      min={0}
                      max={ANIMATION_DURATION}
                      step={0.1}
                      aria-label="Animation timeline"
                      aria-valuetext={`${frame.time.toFixed(1)} teaching seconds: ${frame.chapter.title}`}
                      value={frame.time}
                      onChange={(e) => {
                        p.onPaused(true)
                        p.sceneRef.current?.seek(Number(e.target.value))
                      }}
                      style={
                        {
                          '--learn-progress': `${frame.progress * 100}%`,
                        } as React.CSSProperties
                      }
                    />
                    <span>
                      {frame.time.toFixed(1)}s / {ANIMATION_DURATION}s <i />
                      {frame.chapter.short}
                    </span>
                  </label>
                  <button
                    onClick={() => {
                      closeContext()
                      p.onChapter(
                        Math.min(chapters.length - 1, frame.chapterIndex + 1),
                      )
                    }}
                    aria-label="Next animation chapter"
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="learn-speed"
                    onClick={() =>
                      p.onSpeed(p.speed === 1 ? 2 : p.speed === 2 ? 0.5 : 1)
                    }
                    aria-label="Change learning playback speed"
                  >
                    {p.speed}×
                  </button>
                  <button
                    onClick={() => open('chapters')}
                    aria-label="Open animation chapters"
                  >
                    <Layers3 size={17} />
                  </button>
                  <button
                    onClick={() => {
                      closeContext()
                      setFollow(false)
                      setPanel(null)
                      setJourneyAuto(false)
                      if (p.page !== 'explore') p.onNavigate('explore')
                      p.onGuided()
                    }}
                    aria-pressed={p.guided}
                    aria-label="Guided camera tour"
                  >
                    <Compass size={17} />
                    <span>Tour</span>
                  </button>
                  <button
                    onClick={toggleFollow}
                    aria-pressed={follow}
                    aria-label="Ride with learning payload"
                  >
                    <Orbit size={17} />
                    <span>Ride</span>
                  </button>
                </div>
              </div>
              <span className="learn-footnote">
                {exampleActive
                  ? 'PRIMARY SOURCES · PROPOSED PLACEMENT · DERIVED BUDGETS · TEACHING ANIMATION'
                  : 'REFERENCE ARCHITECTURE · TEACHING TIME · SYNTHETIC PERFORMANCE'}
              </span>
              <button
                className="learn-fullscreen"
                aria-label="Fullscreen learning world"
                onClick={() => {
                  if (document.fullscreenElement)
                    void document.exitFullscreen?.().catch(() => {})
                  else void root.current?.requestFullscreen?.().catch(() => {})
                }}
              >
                <Maximize2 size={12} />
                EXPAND THE WORLD
              </button>
            </>
          )}
          {reader && (
            <LearningDialog
              title={
                reader === 'lab'
                  ? 'Complete performance workbench'
                  : reader === 'guide'
                    ? 'Complete field guide'
                    : reader === 'issues'
                      ? 'Top ten AI infrastructure issues'
                      : reader === 'lifecycle'
                        ? 'Pre-training, post-training and inference'
                        : 'Six real model workloads'
              }
              onClose={() => setReader(null)}
            >
              <div className="learn-reading-desk">
                {reader === 'lab' ? (
                  p.advancedLab
                ) : reader === 'guide' ? (
                  p.advancedGuide
                ) : reader === 'issues' ? (
                  <HotIssuesMethodology />
                ) : reader === 'lifecycle' ? (
                  <LifecycleComparison />
                ) : (
                  <ModelComparison />
                )}
              </div>
            </LearningDialog>
          )}
          {help && (
            <LearningDialog
              title="Learning controls and help"
              onClose={() => setHelp(false)}
            >
              <div className="learn-help">
                <span className="learn-surface-kicker">
                  THE WORLD IS THE WORKSPACE
                </span>
                <h2>Find the part. Follow the data.</h2>
                <p>
                  AI lifecycle follows pre-training, post-training and
                  inference, with SFT, DPO and GRPO recipes. Real models opens
                  six source-backed pipeline field trips. In a field trip, use
                  1–6 or the arrow keys to select a stage, Space to play
                  teaching stages, and F to focus. Data budgets use each model’s
                  formats; the worlds are schematics and do not execute model
                  weights.
                </p>
                <p>
                  Select hardware to open its explanation. Understand its role,
                  inspect the trade-offs, and change the workload while staying
                  in the same 3D world.
                </p>
                <p>
                  The four scales move from a 100,000-GPU reference fleet to one
                  accelerator. The four data lenses show requests, retained KV,
                  exact ring exchanges, and a transformer pass. Tour follows
                  chapters across scales; Ride follows the teaching payload.
                </p>
                <div>
                  {[
                    ['1–4', 'Infrastructure scale'],
                    ['SPACE', 'Pause or play outside buttons'],
                    ['Q / E', 'Rotate the view'],
                    ['R', 'Isometric overview'],
                    ['H', 'Cinema / show controls'],
                    ['L', 'World labels'],
                    ['F', 'Ride the data path'],
                    ['ESC', 'Dismiss the current surface'],
                  ].map(([key, value]) => (
                    <span key={key}>
                      <kbd>{key}</kbd>
                      {value}
                    </span>
                  ))}
                </div>
                <p>
                  Memory and tensor dimensions use the declared 70B GQA
                  reference. Layout, motion, timing, and performance estimates
                  are educational. Read the model assumptions in the lab or full
                  field guide.
                </p>
                <button
                  className="learn-primary"
                  onClick={() => setHelp(false)}
                >
                  Back to the world
                  <ArrowRight size={15} />
                </button>
              </div>
            </LearningDialog>
          )}
        </>
      )}
    </section>
  )
}
