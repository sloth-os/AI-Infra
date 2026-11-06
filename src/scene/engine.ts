import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Layer, Traffic } from '../content'
import { defaults } from '../model'
import type { Parameters, Strategy } from '../model'
import {
  ANIMATION_DURATION,
  collectiveTransfer,
  getMotionFrame,
  payloadDescriptions,
} from '../motion'
import type { CameraView, MotionFrame } from '../motion'
import { buildArchitecture, trafficColors } from './architecture'
import type { Architecture, Box, SceneLabel } from './architecture'
import { buildTensorArchitecture } from './tensors'
import { FlowEffects, signalMaterial } from './effects'
import type { EffectsQuality } from './effects'
import { ContextOverlay } from './context'
import { contextRole, hardwareAnchor } from '../learning/infrastructure/context'
import type { ContextFrame } from '../learning/infrastructure/context'

export interface SceneOptions {
  layer: Layer
  traffic: Traffic
  paused: boolean
  selected: string
  effects?: EffectsQuality
  speed?: number
  exploded?: boolean
  heatmap?: boolean
  orbit?: boolean
  params?: Parameters
  strategy?: Strategy
  active?: boolean
  immersive?: boolean
  showLabels?: boolean
  followPayload?: boolean
  onCameraRelease?: () => void
  onRank?: (rank: number) => void
  context?: ContextFrame | null
  contextProgress?: number
  onContextStep?: (step: number, automatic?: boolean) => void
  onSelect: (id: string) => void
}
export interface PayloadInspection {
  title: string
  transport: string
  size: string
  explanation: string
  formula: string
  time: number
}
export interface EngineHooks {
  labels: (labels: SceneLabel[]) => void
  frame: (frame: MotionFrame) => void
  project: (key: string, x: number, y: number, visible: boolean) => void
  inspect: (inspection: PayloadInspection | null) => void
  contextLost: () => void
}
type WorldKey = Layer | 'tensor'
interface World extends Architecture {
  fade: number
  key: WorldKey
}
interface CameraFlight {
  position: THREE.Vector3
  target: THREE.Vector3
  zoom: number
}

const chunkColors = [
  '#b9a0df',
  '#91b9da',
  '#72beb6',
  '#b3c880',
  '#d5c17b',
  '#d7a783',
  '#cb98ae',
  '#9fa1d3',
].map((c) => new THREE.Color(c))
const up = new THREE.Vector3(0, 1, 0)

export class InfrastructureEngine {
  private scene = new THREE.Scene()
  private camera = new THREE.OrthographicCamera(-15, 15, 10, -10, 0.1, 180)
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private worlds: World[]
  private current: World
  private flight: CameraFlight | null = null
  private viewPreset: CameraView = 'isometric'
  private elapsed = 0
  private frame: MotionFrame
  private lastMode: Traffic
  private lastSelection = ''
  private explosion = 0
  private lastExplosion = -1
  private lastHeat = false
  private lastStep = -1
  private lastChapter = -1
  private narrow = false
  private raf = 0
  private lastTime = performance.now()
  private lastEmit = 0
  private visible = true
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    .matches
  private resizeObserver: ResizeObserver
  private visibilityObserver: IntersectionObserver
  private packets: THREE.InstancedMesh
  private signals = new FlowEffects(96)
  private signalChapter = ''
  private trails: THREE.Points
  private trailArray = new Float32Array(96 * 8 * 3)
  private trailColors = new Float32Array(96 * 8 * 3)
  private arrows: THREE.InstancedMesh
  private halo: THREE.Sprite
  private selectionRing: THREE.Mesh
  private focusPosition = new THREE.Vector3()
  private payloadLabel: SceneLabel
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private down = { x: 0, y: 0 }
  private dragging = false
  private disposed = false
  private tempPosition = new THREE.Vector3()
  private tempScale = new THREE.Vector3()
  private tempRotation = new THREE.Quaternion()
  private tempMatrix = new THREE.Matrix4()
  private tempColor = new THREE.Color()
  private tempTangent = new THREE.Vector3()
  private trailPosition = new THREE.Vector3()
  private projected = new THREE.Vector3()
  private activeRoutes: number[] = []
  private cameraOffset = new THREE.Vector3()
  private followTarget = new THREE.Vector3()
  private pixelRatio = Math.min(window.devicePixelRatio, 1.5)
  private qualityFrames = 0
  private qualityTime = 0
  private texture: THREE.CanvasTexture
  private contextPaintDirty = true
  private contextPaintFrame: ContextFrame | null = null
  private contextPaintState = ''
  private contextPaintCount = 0
  private contextWasFading = false
  private cameraChanged = () => {
    this.contextPaintDirty = true
  }
  private contextOverlay = new ContextOverlay()
  private resetVisibilityClock = () => {
    this.lastTime = performance.now()
  }
  private contextClock = 0
  private contextKey = ''
  private contextEmitted = false
  private contextWasPlaying = false

  constructor(
    private container: HTMLDivElement,
    private options: () => SceneOptions,
    private hooks: EngineHooks,
  ) {
    const o = options()
    this.frame = getMotionFrame(0, o.traffic, o.params, o.strategy)
    this.lastMode = o.traffic
    this.scene.add(this.contextOverlay.group)
    this.contextOverlay.group.visible = false
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setClearColor(o.immersive ? '#0b121c' : '#121e24')
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.35
    const canvas = this.renderer.domElement
    canvas.setAttribute('role', 'img')
    canvas.setAttribute(
      'aria-label',
      'Interactive 3D AI infrastructure. Drag to orbit, scroll to zoom, select hardware or a moving data parcel. The timeline and component buttons provide keyboard access.',
    )
    container.prepend(canvas)

    this.scene.fog = new THREE.FogExp2(
      o.immersive ? '#0b121c' : '#121e24',
      0.011,
    )
    this.scene.add(new THREE.AmbientLight('#dce9ed', 1.5))
    const sun = new THREE.DirectionalLight('#e4f0ed', 3.5)
    sun.position.set(-7, 20, 12)
    this.scene.add(sun)
    const rim = new THREE.DirectionalLight('#aa92f4', 3)
    rim.position.set(12, 10, -10)
    this.scene.add(rim)
    const fill = new THREE.PointLight('#c2eca6', 90, 40)
    fill.position.set(-7, 6, 7)
    this.scene.add(fill)
    const grid = new THREE.GridHelper(90, 90, '#87a59d', '#4a6a71')
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.14
    grid.position.y = -0.07
    this.scene.add(grid)

    this.camera.position.set(20, 23, 27)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.target.set(0, 0.7, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.075
    this.controls.minPolarAngle = 0.035
    this.controls.maxPolarAngle = Math.PI / 2.12
    this.controls.minZoom = 0.6
    this.controls.maxZoom = 3.5
    this.controls.autoRotateSpeed = 0.45
    this.controls.addEventListener('start', this.interactionStart)
    this.controls.addEventListener('change', this.cameraChanged)

    this.worlds = (['fleet', 'pod', 'rack', 'gpu'] as Layer[]).map((key) => ({
      ...buildArchitecture(key),
      key,
      fade: 0,
    }))
    this.worlds.push({ ...buildTensorArchitecture(), key: 'tensor', fade: 0 })
    for (const world of this.worlds) {
      world.group.visible = false
      for (const mesh of world.pickable) {
        ;(mesh.material as THREE.MeshStandardMaterial).color.set('#ffffff')
        if (mesh.boundingSphere) mesh.boundingSphere.radius += 6
      }
      this.scene.add(world.group)
    }
    this.current = this.worlds.find(
      (w) => w.key === (o.traffic === 'tensors' ? 'tensor' : o.layer),
    )!
    this.current.fade = 1
    this.current.group.visible = true
    this.payloadLabel = {
      id: this.frame.chapter.node,
      key: 'moving-payload',
      title: 'Traced data parcel',
      subtitle: 'Click to inspect the representation',
      position: new THREE.Vector3(),
    }

    this.packets = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.15, 0.15, 0.32),
      new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      96,
    )
    this.packets.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.packets.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50)
    this.packets.frustumCulled = false
    this.scene.add(this.packets)
    const trailGeometry = new THREE.BufferGeometry()
    trailGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailArray, 3),
    )
    trailGeometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.trailColors, 3),
    )
    const trailMaterial = signalMaterial(6)
    this.trails = new THREE.Points(trailGeometry, trailMaterial)
    this.trails.frustumCulled = false
    this.scene.add(this.trails, this.signals.group)
    this.arrows = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.09, 0.25, 6),
      new THREE.MeshBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.48,
      }),
      120,
    )
    this.arrows.frustumCulled = false
    this.scene.add(this.arrows)

    const glowCanvas = document.createElement('canvas')
    glowCanvas.width = 64
    glowCanvas.height = 64
    const ctx = glowCanvas.getContext('2d')!
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.12, 'rgba(255,255,255,0.7)')
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.12)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)
    this.texture = new THREE.CanvasTexture(glowCanvas)
    this.halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this.texture,
        color: trafficColors[o.traffic],
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    )
    this.halo.scale.set(1.1, 1.1, 1.1)
    this.scene.add(this.halo)
    this.selectionRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.018, 6, 64),
      new THREE.MeshBasicMaterial({
        color: '#d4eeb0',
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
      }),
    )
    this.selectionRing.rotation.x = -Math.PI / 2
    this.selectionRing.position.y = 0.07
    this.scene.add(this.selectionRing)

    canvas.addEventListener('pointerdown', this.pointerDown)
    canvas.addEventListener('pointerup', this.pointerUp)
    canvas.addEventListener('pointermove', this.pointerMove)
    canvas.addEventListener('webglcontextlost', this.contextLost)
    this.raycaster.params.Line.threshold = 0.18
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(container)
    document.addEventListener('visibilitychange', this.resetVisibilityClock)
    this.visibilityObserver = new IntersectionObserver((entries) => {
      if (!this.visible && entries[0].isIntersecting)
        this.resetVisibilityClock()
      this.visible = entries[0].isIntersecting
    })
    this.visibilityObserver.observe(container)
    this.resize()
    this.updateRoutes()
    this.publishLabels()
    this.emit()
    this.raf = requestAnimationFrame(this.animate)
  }

  private interactionStart = () => {
    this.flight = null
    this.options().onCameraRelease?.()
    this.renderer.domElement.dataset.cameraMoving = 'false'
  }
  private pointerDown = (event: PointerEvent) => {
    this.down = { x: event.clientX, y: event.clientY }
    this.dragging = true
  }
  private pointerMove = (event: PointerEvent) => {
    if (this.dragging) return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(
      this.options().context
        ? this.current.pickable
        : [...this.current.pickable, this.packets],
      false,
    )[0]
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'
  }
  private pointerUp = (event: PointerEvent) => {
    this.dragging = false
    if (event.button !== 0 || !event.isPrimary) return
    if (
      Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > 7
    )
      return
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      (-(event.clientY - rect.top) / rect.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hit = this.raycaster.intersectObjects(
      this.options().context
        ? this.current.pickable
        : [...this.current.pickable, this.packets],
      false,
    )[0]
    if (!hit || hit.instanceId === undefined) return
    if (hit.object === this.packets) {
      this.inspectPacket(hit.instanceId)
      return
    }
    const id = hit.object.userData.ids[hit.instanceId]
    if (
      this.options().immersive &&
      !this.options().context &&
      this.options().traffic === 'collectives' &&
      this.current.key === 'rack'
    ) {
      const ranks = this.current.labels
        .filter((l) => l.rank !== undefined)
        .sort(
          (a, b) =>
            a.position.distanceToSquared(hit.point) -
            b.position.distanceToSquared(hit.point),
        )
      if (ranks[0]?.rank !== undefined) {
        this.options().onRank?.(ranks[0].rank)
        return
      }
    }
    this.options().onSelect(id)
    if (!this.options().immersive) this.focus(id, hit.point)
  }
  private contextLost = (event: Event) => {
    event.preventDefault()
    this.hooks.contextLost()
  }

  private resize = () => {
    const { width, height } = this.container.getBoundingClientRect()
    if (!width || !height) return
    const aspect = width / height
    if (this.narrow !== width < 500) {
      this.narrow = width < 500
      this.camera.zoom = this.narrow ? 0.74 : 1
    }
    const span = this.options().immersive ? 13.5 : aspect < 0.8 ? 12.3 : 10.3
    this.camera.left = -span * aspect
    this.camera.right = span * aspect
    this.camera.top = span
    this.camera.bottom = -span
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
  private sceneLabels(): SceneLabel[] {
    const o = this.options(),
      context = o.context
    const labels = this.current.labels.filter((label) =>
      !context && o.traffic === 'collectives' && this.current.key === 'rack'
        ? label.rank !== undefined
        : label.rank === undefined,
    )
    if (!context) return [...labels, this.payloadLabel]
    const contextual = labels.map((label) => {
      const role = contextRole(label.id, context)
      return role ? { ...label, title: role[0], subtitle: role[1] } : label
    })
    const anchor = hardwareAnchor(context.layer, context.node)
    return [
      ...contextual,
      {
        id: context.node,
        key: 'context-focus',
        context: true,
        title: context.heading,
        subtitle: context.payload,
        position: new THREE.Vector3(anchor[0], anchor[1] + 0.9, anchor[2]),
      },
    ]
  }
  private publishLabels() {
    this.hooks.labels(this.sceneLabels())
  }
  private resetHardware() {
    for (const mesh of this.current.pickable) {
      const boxes = mesh.userData.boxes as Box[]
      boxes.forEach((box, i) => {
        this.tempMatrix.compose(
          this.tempPosition.set(...box.position),
          this.tempRotation.identity(),
          this.tempScale.set(...box.scale),
        )
        mesh.setMatrixAt(i, this.tempMatrix)
        mesh.setColorAt(i, this.tempColor.set(mesh.userData.baseColor))
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    this.lastExplosion = -1
  }
  private updateRoutes() {
    const mode = this.flowMode()
    this.activeRoutes = this.current.kinds
      .map((_, i) => i)
      .filter((i) => this.current.kinds[i] === mode)
    if (this.current.key === 'tensor')
      this.activeRoutes = this.activeRoutes.filter(
        (i) => this.current.routeStages?.[i] === this.frame.chapterIndex,
      )
    if (this.current.key === 'rack' && mode === 'collectives')
      this.activeRoutes = this.activeRoutes.slice(-8)
    this.arrows.count = Math.min(120, this.activeRoutes.length * 2)
    let index = 0
    for (const routeIndex of this.activeRoutes) {
      const curve = this.current.curves[routeIndex]
      for (const t of [0.28, 0.72]) {
        this.tempPosition.copy(curve.getPoint(t))
        this.tempRotation.setFromUnitVectors(
          up,
          curve.getTangent(t).normalize(),
        )
        this.tempMatrix.compose(
          this.tempPosition,
          this.tempRotation,
          new THREE.Vector3(1, 1, 1),
        )
        this.arrows.setMatrixAt(index, this.tempMatrix)
        this.arrows.setColorAt(index, new THREE.Color(trafficColors[mode]))
        index++
      }
    }
    this.arrows.instanceMatrix.needsUpdate = true
    if (this.arrows.instanceColor) this.arrows.instanceColor.needsUpdate = true
    ;(this.halo.material as THREE.SpriteMaterial).color.set(trafficColors[mode])
  }
  private emit() {
    this.hooks.frame(this.frame)
  }
  private flowMode(): Traffic {
    if (this.options().traffic === 'requests') {
      if (this.frame.chapterIndex === 4) return 'kv'
      if (this.frame.chapterIndex === 3 && this.current.key === 'rack')
        return 'collectives'
      if (this.frame.chapterIndex === 5 && this.current.key === 'gpu')
        return 'kv'
    }
    return this.options().traffic
  }
  getFrame() {
    return this.frame
  }
  getView() {
    return this.viewPreset
  }
  seek(time: number) {
    this.elapsed = Math.max(0, Math.min(ANIMATION_DURATION, time))
    this.frame = getMotionFrame(
      this.elapsed,
      this.options().traffic,
      this.options().params,
      this.options().strategy,
    )
    this.lastEmit = 0
    this.emit()
  }
  zoom(direction: number) {
    this.flight = null
    this.renderer.domElement.dataset.cameraMoving = 'false'
    this.camera.zoom = THREE.MathUtils.clamp(
      this.camera.zoom * (direction > 0 ? 1.2 : 1 / 1.2),
      0.6,
      3.5,
    )
    this.camera.updateProjectionMatrix()
  }
  setView(view: CameraView) {
    this.viewPreset = view
    this.renderer.domElement.dataset.cameraView = view
    this.renderer.domElement.dataset.cameraMoving = this.reduceMotion
      ? 'false'
      : 'true'
    const position =
      view === 'top'
        ? new THREE.Vector3(0.1, 36, 1.6)
        : view === 'front'
          ? new THREE.Vector3(0, 12, 32)
          : new THREE.Vector3(this.current.key === 'tensor' ? 9 : 20, 23, 27)
    this.flight = {
      position,
      target: new THREE.Vector3(0, 0.7, 0),
      zoom: this.narrow ? 0.74 : 1,
    }
    if (this.reduceMotion) {
      this.camera.position.copy(position)
      this.controls.target.copy(this.flight.target)
      this.camera.zoom = this.flight.zoom
      this.flight = null
      this.camera.updateProjectionMatrix()
      this.controls.update()
    }
  }
  reset() {
    this.setView('isometric')
  }
  enter() {
    if (!this.reduceMotion) {
      this.camera.position.set(26, 31, 38)
      this.camera.zoom = this.narrow ? 0.62 : 0.85
      this.camera.updateProjectionMatrix()
    }
    this.setView('isometric')
  }
  rotate(direction: number) {
    this.flight = null
    this.cameraOffset
      .copy(this.camera.position)
      .sub(this.controls.target)
      .applyAxisAngle(up, (direction * Math.PI) / 4)
    this.camera.position.copy(this.controls.target).add(this.cameraOffset)
    this.controls.update()
    this.renderer.domElement.dataset.cameraMoving = 'false'
  }
  focus(id: string, point?: THREE.Vector3) {
    const annotation = this.sceneLabels().find(
      (label) => label.id === id || label.key === id,
    )
    const target = (
      point ||
      annotation?.position ||
      new THREE.Vector3()
    ).clone()
    target.y = Math.min(target.y, 2)
    const offset = this.camera.position.clone().sub(this.controls.target)
    this.flight = {
      position: target.clone().add(offset),
      target,
      zoom: Math.min(1.7, Math.max(1.2, this.camera.zoom)),
    }
    this.renderer.domElement.dataset.cameraView = 'focus'
    this.renderer.domElement.dataset.cameraMoving = this.reduceMotion
      ? 'false'
      : 'true'
  }
  inspectPacket(packetIndex = 0) {
    const o = this.options(),
      frame = this.frame,
      p = o.params || defaults,
      mode = this.flowMode(),
      description =
        mode === 'kv' &&
        (this.current.key === 'gpu' || this.current.key === 'rack')
          ? {
              title: 'A local GPU KV-cache tile',
              transport:
                this.current.key === 'gpu'
                  ? 'HBM ↔ on-chip working memory'
                  : 'Local HBM / NVLink interfaces',
              formula:
                '40,960 bytes per token per TP rank · keys and values retained per sequence',
            }
          : payloadDescriptions[mode]
    const transfer = collectiveTransfer(frame.collectiveStep, packetIndex % 8)
    const size =
      mode === 'kv'
        ? this.current.key === 'gpu' || this.current.key === 'rack'
          ? `${frame.shardMiB.toFixed(1)} MiB retained per rank · ${frame.contextTokens.toLocaleString()} positions`
          : `${((p.inputTokens * 327680) / 2 ** 20).toFixed(0)} MiB total · ${((p.inputTokens * 327680) / 2 ** 20 / 8).toFixed(1)} MiB / rank`
        : mode === 'collectives'
          ? transfer.complete
            ? 'Every rank now holds [36, 36, 36, 36, 36, 36, 36, 36]'
            : `GPU ${transfer.sender} → GPU ${transfer.receiver} · C${transfer.chunk} = ${transfer.value} · ${transfer.contributions}/8 contributions`
          : mode === 'tensors'
            ? frame.chapter.payload
            : `${p.inputTokens.toLocaleString()} prompt tokens · ${p.outputTokens} output-token budget`
    this.hooks.inspect({
      ...description,
      size,
      explanation:
        frame.chapter.explanation +
        (mode === 'collectives'
          ? ` Rank ${transfer.sender} buffer: [${frame.buffers[transfer.sender].join(', ')}].`
          : ''),
      time: frame.time,
    })
  }

  private updateWorld(delta: number) {
    const o = this.options(),
      key: WorldKey = !o.context && o.traffic === 'tensors' ? 'tensor' : o.layer
    if (key !== this.current.key) {
      this.current = this.worlds.find((w) => w.key === key)!
      this.current.group.visible = true
      this.current.fade = this.reduceMotion ? 1 : 0.015
      this.lastSelection = ''
      this.lastExplosion = -1
      this.lastStep = -1
      this.publishLabels()
      this.updateRoutes()
      this.setView(this.viewPreset)
    }
    if (o.traffic !== this.lastMode) {
      this.lastMode = o.traffic
      this.lastStep = -1
      this.updateRoutes()
      this.publishLabels()
      this.hooks.inspect(null)
    }
    if (this.frame.chapterIndex !== this.lastChapter) this.updateRoutes()
    for (const world of this.worlds) {
      if (world !== this.current && world.fade === 0) continue
      world.fade = this.reduceMotion
        ? world === this.current
          ? 1
          : 0
        : THREE.MathUtils.damp(
            world.fade,
            world === this.current ? 1 : 0,
            9,
            delta,
          )
      if (world.fade < 0.005 && world !== this.current) {
        world.fade = 0
        world.group.visible = false
        continue
      }
      if (world.fade > 0.995) world.fade = 1
      world.group.visible = true
      world.group.scale.setScalar(0.82 + world.fade * 0.18)
      world.group.position.y = (1 - world.fade) * -0.8
      world.group.traverse((object) => {
        if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
          const mats = Array.isArray(object.material)
            ? object.material
            : [object.material]
          for (const mat of mats) {
            const active =
              object.userData.kind === this.flowMode() &&
              (world.key !== 'tensor' ||
                object.userData.stage === this.frame.chapterIndex)
            const opacity =
              object instanceof THREE.Line ? (active ? 0.45 : 0.025) : 1
            mat.opacity = world.fade * opacity
            const transparent = world.fade < 1 || object instanceof THREE.Line
            if (mat.transparent !== transparent) {
              mat.transparent = transparent
              mat.needsUpdate = true
            }
            mat.depthWrite = !(object instanceof THREE.Line)
          }
        }
      })
    }
    this.explosion = this.reduceMotion
      ? o.exploded
        ? 1
        : 0
      : THREE.MathUtils.damp(this.explosion, o.exploded ? 1 : 0, 6, delta)
  }

  private animateHardware() {
    const o = this.options(),
      f = this.frame
    const explosionChanged =
      Math.abs(this.explosion - this.lastExplosion) > 0.0005
    const colorChanged =
      Boolean(o.heatmap) ||
      o.heatmap !== this.lastHeat ||
      o.selected !== this.lastSelection ||
      f.collectiveStep !== this.lastStep ||
      f.chapterIndex !== this.lastChapter
    // Dynamic cache, attention and queue geometry conveys state; static chassis
    // retain one matrix per instance and do not become separate draw calls.
    for (const mesh of this.current.pickable) {
      const boxes = mesh.userData.boxes as Box[]
      const baseColor = mesh.userData.baseColor as string
      let moved = false,
        colored = false
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i],
          role = b.role,
          index = b.index || 0
        const dynamic =
          Boolean(role) ||
          (this.current.key === 'gpu' &&
            b.id === 'tensor' &&
            b.position[1] > 1.1)
        if (!dynamic && !explosionChanged && !colorChanged) continue
        this.tempPosition.set(...b.position)
        this.tempScale.set(...b.scale)
        this.tempRotation.identity()
        if (this.current.key === 'gpu') {
          if (b.id === 'hbm')
            this.tempPosition.y += this.explosion * (1.2 + (role ? 0.6 : 0))
          else if (b.id === 'tensor' && b.position[1] > 0.9)
            this.tempPosition.y += this.explosion * 2.3
          else if (b.id === 'nvlink')
            this.tempPosition.z += this.explosion * 1.3
        } else if (this.current.key === 'rack') {
          if (b.id === 'hbm') this.tempPosition.y += this.explosion * 1.4
          if (role === 'collective') this.tempPosition.y += this.explosion * 2
        } else if (this.current.key === 'tensor') {
          if (role)
            this.tempPosition.y += this.explosion * (0.45 + (index % 4) * 0.18)
        }
        this.tempColor.set(baseColor)
        let intensity = 1
        if (role === 'cacheK' || role === 'cacheV') {
          const maxTokens =
            (o.params?.inputTokens || 2048) + (o.params?.outputTokens || 256)
          const fill = THREE.MathUtils.clamp(f.contextTokens / maxTokens, 0, 1)
          intensity = (index % 24) / 24 < fill ? 1.18 : 0.2
          this.tempScale.y *= (index % 24) / 24 < fill ? 1 : 0.25
        } else if (role === 'collective') {
          const rank = Math.floor(index / 8),
            chunk = index % 8
          intensity = 0.3 + (f.contributions[rank][chunk] / 8) * 0.9
          this.tempScale.y *= 0.5 + f.contributions[rank][chunk] / 8
        } else if (role === 'attention') {
          const row = Math.floor(index / 8)
          intensity =
            0.55 + Math.max(0, Math.sin(this.elapsed * 2 - row * 0.5)) * 0.7
          this.tempScale.y *=
            0.8 + Math.max(0, Math.sin(this.elapsed * 2 - row * 0.5)) * 1.8
        } else if (role === 'masked') {
          intensity = 0.45
        } else if (role === 'queue') {
          const visibleCount = f.load >= 1 ? 12 : Math.round(f.load * 8)
          intensity = index < visibleCount ? (f.load >= 1 ? 1.2 : 0.9) : 0.2
          if (f.load >= 1) this.tempColor.set('#edac75')
          this.tempPosition.y +=
            Math.sin(this.elapsed * 1.3 - index * 0.6) * 0.06
        } else if (
          role === 'request' ||
          role === 'embedding' ||
          role === 'mlp' ||
          role === 'qkv' ||
          role === 'rank' ||
          role === 'sample' ||
          role === 'output'
        ) {
          this.tempPosition.y +=
            Math.sin(this.elapsed * 1.8 - index * 0.35) * 0.09
          intensity =
            0.8 + Math.max(0, Math.sin(this.elapsed * 2 - index * 0.4)) * 0.45
          if (role === 'sample')
            this.tempRotation.setFromAxisAngle(up, this.elapsed * 0.35)
        } else if (
          this.current.key === 'gpu' &&
          b.id === 'tensor' &&
          b.position[1] > 1.1
        ) {
          const wave = Math.max(
            0,
            Math.sin(
              this.elapsed * 2.2 - b.position[0] * 0.7 - b.position[2] * 0.5,
            ),
          )
          intensity = 0.65 + wave * 0.55
          this.tempScale.y *= 1 + wave * 0.55
        }
        if (o.heatmap && !role) {
          const load = THREE.MathUtils.clamp(
            f.load *
              (0.65 +
                0.3 *
                  Math.sin(
                    b.position[0] * 0.4 +
                      b.position[2] * 0.2 +
                      this.elapsed * 0.12,
                  )),
            0,
            1.3,
          )
          this.tempColor.set(
            load > 0.9 ? '#ecac71' : load > 0.6 ? '#c5dd8e' : '#72bdb7',
          )
        } else if (!role && b.id === o.selected) {
          intensity = 1.12
        }
        if (this.current.key === 'tensor' && b.stage !== undefined)
          intensity *= b.stage === f.chapterIndex ? 1.3 : 0.57
        this.tempColor.multiplyScalar(intensity)
        mesh.setColorAt(i, this.tempColor)
        this.tempMatrix.compose(
          this.tempPosition,
          this.tempRotation,
          this.tempScale,
        )
        mesh.setMatrixAt(i, this.tempMatrix)
        moved = true
        colored = true
      }
      if (moved) mesh.instanceMatrix.needsUpdate = true
      if (colored && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    this.lastExplosion = this.explosion
    this.lastHeat = Boolean(o.heatmap)
    this.lastSelection = o.selected
    this.lastStep = f.collectiveStep
    this.lastChapter = f.chapterIndex
  }

  private animatePackets() {
    const o = this.options(),
      mode = this.flowMode()
    this.signals.begin(
      this.elapsed,
      o.effects || 'balanced',
      this.reduceMotion,
      this.pixelRatio,
    )
    if (!this.activeRoutes.length) {
      this.packets.visible = false
      this.trails.visible = false
      this.halo.visible = false
      this.signals.end()
      return
    }
    this.packets.visible = true
    this.trails.visible = true
    this.halo.visible = true
    const speed =
      mode === 'kv'
        ? 0.08 * Math.pow((o.params?.networkGbps || 400) / 400, 0.36)
        : mode === 'collectives'
          ? 0.18
          : 0.105
    const baseColor = new THREE.Color(
      mode === 'tensors' ? this.frame.chapter.color : trafficColors[mode],
    )
    const forward = new THREE.Vector3(0, 0, 1)
    const count = mode === 'collectives' ? 8 : mode === 'tensors' ? 32 : 96
    this.packets.count = count
    this.trails.geometry.setDrawRange(0, count * 8)
    for (let i = 0; i < count; i++) {
      let routeIndex = this.activeRoutes[i % this.activeRoutes.length]
      if (i === 0 && this.current.key === 'fleet' && o.traffic === 'requests') {
        const phase = this.frame.chapterIndex
        const preferred = this.activeRoutes.find((index) => {
          const from = this.current.curves[index].points[0]
          return phase === 0
            ? from.x < -10
            : phase === 1
              ? from.x > 6 && from.z > 6
              : phase === 2
                ? Math.abs(from.x + 7.8) < 0.1
                : phase === 6
                  ? from.x > 5 && from.z < 4
                  : false
        })
        if (preferred !== undefined) routeIndex = preferred
      }
      const curve = this.current.curves[routeIndex]
      const exchangeProgress =
        this.frame.progress === 1
          ? 1
          : this.frame.progress * 14 - this.frame.collectiveStep
      const t =
        mode === 'collectives'
          ? THREE.MathUtils.smoothstep(exchangeProgress, 0.08, 0.92)
          : (this.elapsed * speed + ((i * 0.61803398875) % 1)) % 1
      this.tempPosition.copy(curve.getPoint(t))
      this.tempTangent.copy(curve.getTangent(t)).normalize()
      this.tempRotation.setFromUnitVectors(forward, this.tempTangent)
      const scale = i === 0 ? 1.8 : mode === 'kv' ? 1.35 : 0.8
      this.tempScale.set(scale, scale, mode === 'kv' ? scale * 1.8 : scale)
      this.tempMatrix.compose(
        this.tempPosition,
        this.tempRotation,
        this.tempScale,
      )
      this.packets.setMatrixAt(i, this.tempMatrix)
      this.tempColor.copy(
        mode === 'collectives'
          ? chunkColors[
              this.frame.collectiveStep < 7
                ? (i - this.frame.collectiveStep + 16) % 8
                : (i + 1 - (this.frame.collectiveStep - 7) + 16) % 8
            ]
          : mode === 'requests' && i % 3 !== 0
            ? chunkColors[i % 8]
            : mode === 'tensors' && this.frame.chapterIndex === 1
              ? chunkColors[[3, 0, 2][i % 3]]
              : baseColor,
      )
      this.packets.setColorAt(i, this.tempColor)
      this.signals.head(this.tempPosition, this.tempColor, i === 0 ? 1.5 : 0.7)
      if (i === 0) {
        const signalKey = `${o.layer}:${o.traffic}:${this.frame.chapterIndex}`
        if (this.signalChapter !== signalKey) {
          this.signalChapter = signalKey
          this.signals.pulse(this.tempPosition, this.tempColor, 1.5)
        }
        this.halo.position.copy(this.tempPosition)
        this.payloadLabel.position
          .copy(this.tempPosition)
          .add(new THREE.Vector3(0, 1.1, 0))
      }
      for (let trail = 0; trail < 8; trail++) {
        const tt =
          mode === 'collectives'
            ? Math.max(0, t - trail * 0.018)
            : (t - trail * 0.012 + 1) % 1
        const p = curve.getPoint(tt, this.trailPosition),
          offset = (i * 8 + trail) * 3
        this.trailArray[offset] = p.x
        this.trailArray[offset + 1] = p.y
        this.trailArray[offset + 2] = p.z
        const fade = (1 - trail / 8) * 0.7
        this.trailColors[offset] = this.tempColor.r * fade
        this.trailColors[offset + 1] = this.tempColor.g * fade
        this.trailColors[offset + 2] = this.tempColor.b * fade
      }
    }
    this.packets.instanceMatrix.needsUpdate = true
    if (this.packets.instanceColor)
      this.packets.instanceColor.needsUpdate = true
    this.trails.geometry.attributes.position.needsUpdate = true
    this.trails.geometry.attributes.color.needsUpdate = true
    this.signals.end()
    this.trails.visible = o.effects !== 'calm'
    ;(this.trails.material as THREE.ShaderMaterial).uniforms.pointSize.value =
      (o.effects === 'cinematic' ? 9 : 5) * this.pixelRatio
  }

  private projectLabels() {
    const o = this.options(),
      width = this.container.clientWidth,
      height = this.container.clientHeight
    const labels = this.sceneLabels()
    const occupied: { x: number; y: number; w: number; h: number }[] = []
    const sorted = [...labels].sort(
      (a, b) =>
        (b.context
          ? 20
          : b.key === 'moving-payload'
            ? 10
            : b.id === o.selected
              ? 5
              : 0) -
        (a.context
          ? 20
          : a.key === 'moving-payload'
            ? 10
            : a.id === o.selected
              ? 5
              : 0),
    )
    for (const annotation of sorted) {
      this.projected.copy(annotation.position)
      if (o.exploded && annotation.id === 'hbm')
        this.projected.y += this.explosion * 1.2
      this.projected.project(this.camera)
      const x = (this.projected.x * 0.5 + 0.5) * width
      let y = (-this.projected.y * 0.5 + 0.5) * height
      const w = width < 500 ? 112 : annotation.stage !== undefined ? 153 : 140,
        h = 42
      let visible =
        o.showLabels !== false &&
        x > w / 2 + 6 &&
        x < width - w / 2 - 6 &&
        y > 72 &&
        y < height - 72 &&
        this.projected.z < 1
      if (visible) {
        let found = false
        for (const shift of [0, -37, -74, 37]) {
          const yy = y + shift
          if (yy < 72 || yy > height - 75) continue
          if (
            !occupied.some(
              (r) =>
                Math.abs(r.x - x) < (r.w + w) / 2 + 4 &&
                Math.abs(r.y - yy) < (r.h + h) / 2 + 3,
            )
          ) {
            y = yy
            found = true
            occupied.push({ x, y, w, h })
            break
          }
        }
        visible = found
      }
      this.hooks.project(annotation.key || annotation.id, x, y, visible)
    }
    if (o.immersive) {
      const selected =
        !o.context && o.traffic === 'tensors'
          ? this.current.labels.find((l) => l.stage === this.frame.chapterIndex)
          : this.current.labels.find((l) => l.id === o.selected)
      for (const [key, point] of [
        ['selection-anchor', selected?.position],
        ['payload-anchor', this.halo.visible ? this.halo.position : undefined],
      ] as const) {
        if (!point) continue
        this.projected.copy(point)
        if (key === 'selection-anchor' && selected?.id === 'hbm' && o.exploded)
          this.projected.y += this.explosion * 1.2
        this.projected.project(this.camera)
        const x = (this.projected.x * 0.5 + 0.5) * width,
          y = (-this.projected.y * 0.5 + 0.5) * height
        this.hooks.project(
          key,
          x,
          y,
          x > 20 && x < width - 20 && y > 85 && y < height - 130,
        )
      }
    }
  }

  private animate = (time: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.animate)
    const visibleDelta = Math.max(0, (time - this.lastTime) / 1000)
    const delta = Math.min(visibleDelta, 0.1)
    this.lastTime = time
    if (!this.visible || document.hidden) return
    const o = this.options()
    if (o.active === false) return
    if (o.immersive) {
      this.qualityFrames++
      this.qualityTime += delta
      if (this.qualityFrames >= 30) {
        if (
          this.qualityTime / this.qualityFrames > 0.045 &&
          this.pixelRatio > 0.75
        ) {
          this.pixelRatio = Math.max(0.75, this.pixelRatio * 0.85)
          this.renderer.setPixelRatio(this.pixelRatio)
        }
        this.qualityFrames = 0
        this.qualityTime = 0
      }
    }
    const context = o.context
    if (!context && !o.paused && !this.reduceMotion) {
      this.elapsed += delta * (o.speed || 1)
      if (this.elapsed > ANIMATION_DURATION + 0.65) this.elapsed = 0
    }
    this.frame = getMotionFrame(this.elapsed, o.traffic, o.params, o.strategy)
    this.updateWorld(context ? Math.min(visibleDelta, 0.5) : delta)
    if (context) {
      const contextChanged = this.contextKey !== context.key
      if (contextChanged) {
        this.contextClock = 0
        this.contextEmitted = false
        this.contextKey = context.key
        this.resetHardware()
        this.publishLabels()
      }
      if (context.playing && !this.reduceMotion) {
        if (this.contextWasPlaying && !contextChanged)
          this.contextClock += visibleDelta
        if (this.contextClock >= context.duration && !this.contextEmitted) {
          this.contextEmitted = true
          o.onContextStep?.((context.stage + 1) % context.steps.length, true)
        }
      }
      // A resumed tour starts a fresh interval after an already emitted step.
      if (context.playing && !this.contextWasPlaying && this.contextEmitted) {
        this.contextClock = 0
        this.contextEmitted = false
      }
      this.contextOverlay.group.visible = true
      this.contextOverlay.group.scale.copy(this.current.group.scale)
      this.contextOverlay.group.position.copy(this.current.group.position)
      this.contextOverlay.update(
        context,
        o.contextProgress === undefined
          ? this.contextClock / context.duration
          : THREE.MathUtils.clamp(o.contextProgress, 0, 1),
        o.effects || 'balanced',
        this.reduceMotion,
      )
      for (const object of [
        this.packets,
        this.trails,
        this.arrows,
        this.halo,
        this.signals.group,
      ])
        object.visible = false
    } else {
      if (this.contextKey) {
        this.contextKey = ''
        this.publishLabels()
        this.lastSelection = ''
        this.lastExplosion = -1
      }
      this.contextOverlay.group.visible = false
      this.packets.visible = this.arrows.visible = this.halo.visible = true
      this.signals.group.visible = true
    }
    this.contextWasPlaying = !!context?.playing
    if (this.flight) {
      const factor = this.reduceMotion
        ? 1
        : 1 - Math.exp(-Math.min(visibleDelta, 0.5) * 5.5)
      this.camera.position.lerp(this.flight.position, factor)
      this.controls.target.lerp(this.flight.target, factor)
      this.camera.zoom = THREE.MathUtils.lerp(
        this.camera.zoom,
        this.flight.zoom,
        factor,
      )
      this.camera.updateProjectionMatrix()
      if (
        this.camera.position.distanceTo(this.flight.position) < 0.025 &&
        this.controls.target.distanceTo(this.flight.target) < 0.025
      ) {
        this.flight = null
        this.renderer.domElement.dataset.cameraMoving = 'false'
      }
    }
    this.controls.autoRotate = Boolean(
      o.orbit &&
        (!o.paused || o.immersive) &&
        !this.reduceMotion &&
        !this.flight,
    )
    this.controls.update(delta)
    if (!context) {
      this.animateHardware()
      this.animatePackets()
    }
    if (!context && o.followPayload && !this.flight && this.halo.visible) {
      this.followTarget.copy(this.halo.position)
      this.followTarget.x += 1.8
      this.cameraOffset.copy(this.camera.position).sub(this.controls.target)
      this.controls.target.lerp(this.followTarget, 1 - Math.exp(-delta * 3.5))
      this.camera.position.copy(this.controls.target).add(this.cameraOffset)
      this.camera.zoom = THREE.MathUtils.damp(
        this.camera.zoom,
        this.narrow ? 0.9 : 1.25,
        2,
        delta,
      )
      this.camera.updateProjectionMatrix()
      this.controls.update(delta)
      this.renderer.domElement.dataset.cameraView = 'follow'
    }
    this.camera.updateMatrixWorld()
    this.renderer.domElement.dataset.vfxQuality = o.effects || 'balanced'
    this.renderer.domElement.dataset.cameraPose = this.camera.position
      .toArray()
      .map((n) => n.toFixed(2))
      .join(',')
    this.renderer.domElement.dataset.contextKind = context?.kind || ''
    this.renderer.domElement.dataset.contextProgress =
      o.contextProgress === undefined ? '' : String(o.contextProgress)
    this.renderer.domElement.dataset.contextId = context?.id || ''
    this.renderer.domElement.dataset.contextStage = context
      ? String(context.stage)
      : ''
    this.renderer.domElement.dataset.contextPattern = context?.pattern || ''
    this.renderer.domElement.dataset.contextGlyphs = context
      ? String(this.contextOverlay.glyphs.count)
      : ''
    this.renderer.domElement.dataset.worldKind =
      this.current.key === 'tensor' ? 'transformer' : 'infrastructure'
    this.renderer.domElement.dataset.hardwareInstances = String(
      this.current.pickable.reduce((n, mesh) => n + mesh.count, 0),
    )
    this.renderer.domElement.dataset.motionLayer = o.layer
    this.renderer.domElement.dataset.motionMode = o.traffic
    this.renderer.domElement.dataset.strategy = o.strategy || 'continuous'
    const anchor = this.current.labels.find((l) => l.id === o.selected)
    if (anchor) {
      if (this.reduceMotion || context) this.focusPosition.copy(anchor.position)
      else this.focusPosition.lerp(anchor.position, 1 - Math.exp(-delta * 5))
      this.selectionRing.position.set(
        this.focusPosition.x,
        0.04,
        this.focusPosition.z,
      )
    }
    const pulse = 1 + Math.sin(this.elapsed * 2) * 0.07
    this.selectionRing.scale.set(pulse, pulse, pulse)
    this.projectLabels()
    const fading = this.worlds.some((world) => world.fade > 0 && world.fade < 1)
    const paintState = `${o.layer}:${o.selected}:${o.effects}:${o.showLabels}:${this.pixelRatio}:${this.container.clientWidth}:${this.container.clientHeight}`
    if (
      !context ||
      context.playing ||
      o.orbit ||
      this.flight ||
      fading ||
      this.contextWasFading ||
      this.contextPaintDirty ||
      this.contextPaintFrame !== context ||
      this.contextPaintState !== paintState
    ) {
      this.renderer.render(this.scene, this.camera)
      if (context) this.contextPaintCount++
      this.contextPaintFrame = context || null
      this.contextPaintState = paintState
      this.contextPaintDirty = false
    }
    this.contextWasFading = fading
    this.renderer.domElement.dataset.contextPaints = context
      ? String(this.contextPaintCount)
      : ''
    this.renderer.domElement.dataset.worldSettled = String(
      !this.flight && !fading,
    )

    if (time - this.lastEmit > 180) {
      this.lastEmit = time
      this.emit()
    }
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.resizeObserver.disconnect()
    this.visibilityObserver.disconnect()
    document.removeEventListener('visibilitychange', this.resetVisibilityClock)
    this.controls.removeEventListener('start', this.interactionStart)
    this.controls.removeEventListener('change', this.cameraChanged)
    this.controls.dispose()
    this.contextOverlay.dispose()
    const canvas = this.renderer.domElement
    canvas.removeEventListener('pointerdown', this.pointerDown)
    canvas.removeEventListener('pointerup', this.pointerUp)
    canvas.removeEventListener('pointermove', this.pointerMove)
    canvas.removeEventListener('webglcontextlost', this.contextLost)
    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points
      ) {
        object.geometry?.dispose()
        const mats = Array.isArray(object.material)
          ? object.material
          : [object.material]
        mats.forEach((m) => m.dispose())
      } else if (object instanceof THREE.Sprite) object.material.dispose()
    })
    this.texture.dispose()
    this.renderer.dispose()
    canvas.remove()
  }
}
