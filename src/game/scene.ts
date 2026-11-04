import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MODULES, PADS, getGameMetrics, activeOn } from './model'
import type { GameState, ModuleType, Unit, Job } from './model'

export interface GameSceneOptions {
  state: GameState
  active: boolean
  tool: ModuleType | null
  selected: number | null
  focusedJob: number | null
  onPad: (pad: number) => void
  onHover: (pad: number | null) => void
  onRequest: (id: number) => void
}
export interface GameSceneHooks {
  labels: (
    labels: {
      id: string
      title: string
      subtitle: string
      position: THREE.Vector3
      pad: number | null
      color: string
    }[],
  ) => void
  project: (id: string, x: number, y: number, visible: boolean) => void
  lost: () => void
}
interface UnitVisual {
  group: THREE.Group
  rotor: THREE.Group
  fill: THREE.Mesh | null
  light: THREE.Mesh
  born: number
}
const tenants = ['#a797f1', '#7bd4d6', '#f0b087'].map((c) => new THREE.Color(c))
const gate = new THREE.Vector3(-12, 1, 0),
  router = new THREE.Vector3(-8, 1, 0),
  exit = new THREE.Vector3(12, 1, 0)

export class GameRenderer {
  private scene = new THREE.Scene()
  private renderer: THREE.WebGLRenderer
  private camera = new THREE.OrthographicCamera(-20, 20, 14, -14, 0.1, 160)
  private controls: OrbitControls
  private padMesh: THREE.InstancedMesh
  private units = new Map<number, UnitVisual>()
  private unitRoot = new THREE.Group()
  private links = new THREE.Group()
  private ghost: THREE.Mesh
  private selection: THREE.Mesh
  private packets: THREE.InstancedMesh
  private focusHalo: THREE.Mesh
  private focusRoute: THREE.Line
  private routeKey = ''
  private trails: THREE.Points
  private trailPositions = new Float32Array(80 * 7 * 3)
  private trailColors = new Float32Array(80 * 7 * 3)
  private packetVisuals = new Map<
    number,
    { position: THREE.Vector3; history: THREE.Vector3[]; sampled: number }
  >()
  private beacon: THREE.Mesh
  private observer: ResizeObserver
  private materials = new Map<string, THREE.Material>()
  private cube = new THREE.BoxGeometry(1, 1, 1)
  private sphere = new THREE.OctahedronGeometry(0.48, 0)
  private tile = new THREE.CylinderGeometry(1.67, 1.53, 0.22, 6)
  private temp = new THREE.Object3D()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private down = { x: 0, y: 0 }
  private pointers = new Set<number>()
  private multiTouch = false
  private hovered: number | null = null
  private signature = ''
  private raf = 0
  private last = performance.now()
  private visualTime = 0
  private qualityFrames = 0
  private qualityTime = 0
  private pixelRatio = Math.min(devicePixelRatio, 1.4)
  private disposed = false
  private visible = true
  private visibility: IntersectionObserver
  private reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    .matches
  private labels: Parameters<GameSceneHooks['labels']>[0] = []
  private framePosition = new THREE.Vector3()
  private projected = new THREE.Vector3()
  private color = new THREE.Color()
  private preview = false

  constructor(
    private host: HTMLDivElement,
    private options: () => GameSceneOptions,
    private hooks: GameSceneHooks,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(this.pixelRatio)
    this.renderer.setClearColor('#0b121c')
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.35
    const canvas = this.renderer.domElement
    canvas.setAttribute('role', 'img')
    canvas.setAttribute(
      'aria-label',
      'Fleet Command 3D game board. Select a build tool and click a hexagonal sector. The sector buttons provide keyboard and touch access.',
    )
    host.prepend(canvas)
    this.scene.fog = new THREE.FogExp2('#0b121c', 0.014)
    this.scene.add(new THREE.AmbientLight('#b9d3e0', 1.8))
    const key = new THREE.DirectionalLight('#d3e8e4', 3.2)
    key.position.set(-8, 20, 12)
    this.scene.add(key)
    const rim = new THREE.DirectionalLight('#ab8eec', 3)
    rim.position.set(12, 8, -12)
    this.scene.add(rim)
    const fill = new THREE.PointLight('#93dfa6', 85, 35)
    fill.position.set(-6, 6, 7)
    this.scene.add(fill)
    const grid = new THREE.GridHelper(90, 45, '#29414f', '#1b2b3d')
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.3
    grid.position.y = -1.0
    this.scene.add(grid)
    this.camera.position.set(24, 29, 34)
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.target.set(0, 0.8, 0)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minPolarAngle = 0.25
    this.controls.maxPolarAngle = 1.25
    this.controls.minZoom = 0.35
    this.controls.maxZoom = 2.3
    this.scene.add(this.unitRoot)
    this.scene.add(this.links)
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(11.8, 10.8, 0.7, 6),
      this.material('#1c2b39'),
    )
    island.position.set(1, -0.48, 0)
    island.rotation.y = Math.PI / 6
    this.scene.add(island)
    const underside = new THREE.Mesh(
      new THREE.CylinderGeometry(10.8, 6, 1.6, 6),
      this.material('#111c29'),
    )
    underside.position.set(1, -1.55, 0)
    underside.rotation.y = Math.PI / 6
    this.scene.add(underside)
    this.padMesh = new THREE.InstancedMesh(
      this.tile,
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        metalness: 0.4,
        roughness: 0.6,
      }),
      16,
    )
    PADS.forEach((p, i) => {
      this.temp.position.set(p.x, 0, p.z)
      this.temp.rotation.set(0, Math.PI / 6, 0)
      this.temp.scale.set(1, 1, 1)
      this.temp.updateMatrix()
      this.padMesh.setMatrixAt(i, this.temp.matrix)
      this.padMesh.setColorAt(i, new THREE.Color('#344658'))
    })
    this.scene.add(this.padMesh)
    // Small port islands remain present even before any workers are built.
    for (const [x, color] of [
      [-12, '#b19ae4'],
      [-8, '#91bec0'],
      [12, '#c5e990'],
    ] as [number, string][]) {
      const foundation = new THREE.Mesh(
        new THREE.CylinderGeometry(1.65, 1.4, 0.5, 6),
        this.material('#28384a'),
      )
      foundation.position.set(x, 0, 0)
      this.scene.add(foundation)
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 1.4),
        this.material(color),
      )
      core.position.set(x, 0.6, 0)
      this.scene.add(core)
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.15, 0.035, 6, 48),
        this.glow(color),
      )
      ring.rotation.x = Math.PI / 2
      ring.position.set(x, 0.85, 0)
      this.scene.add(ring)
    }
    this.beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.46),
      this.glow('#c8f196'),
    )
    this.beacon.position.set(12, 2, 0)
    this.scene.add(this.beacon)
    this.ghost = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 2.3, 1.9),
      new THREE.MeshBasicMaterial({
        color: '#b89bef',
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      }),
    )
    this.ghost.visible = false
    this.scene.add(this.ghost)
    this.selection = new THREE.Mesh(
      new THREE.TorusGeometry(1.6, 0.035, 6, 6),
      this.glow('#d1eea3'),
    )
    this.selection.rotation.x = Math.PI / 2
    this.selection.visible = false
    this.scene.add(this.selection)
    this.packets = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.25, 0.25, 0.4),
      new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }),
      80,
    )
    this.packets.frustumCulled = false
    this.packets.count = 0
    this.scene.add(this.packets)
    this.focusHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.025, 6, 32),
      this.glow('#deefae'),
    )
    this.focusHalo.rotation.x = Math.PI / 2
    this.focusHalo.visible = false
    this.scene.add(this.focusHalo)
    this.focusRoute = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({
        color: '#a9bfe4',
        transparent: true,
        opacity: 0.5,
      }),
    )
    this.focusRoute.frustumCulled = false
    this.scene.add(this.focusRoute)
    const g = new THREE.BufferGeometry()
    g.setAttribute(
      'position',
      new THREE.BufferAttribute(this.trailPositions, 3),
    )
    g.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3))
    this.trails = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: false,
      }),
    )
    this.trails.frustumCulled = false
    this.scene.add(this.trails)
    canvas.addEventListener('pointerdown', this.pointerDown)
    canvas.addEventListener('pointerup', this.pointerUp)
    canvas.addEventListener('pointermove', this.pointerMove)
    canvas.addEventListener('pointerleave', this.pointerLeave)
    canvas.addEventListener('pointercancel', this.pointerCancel)
    canvas.addEventListener('webglcontextlost', this.lost)
    this.observer = new ResizeObserver(this.resize)
    this.observer.observe(host)
    this.visibility = new IntersectionObserver((entries) => {
      this.visible = entries[0].isIntersecting
    })
    this.visibility.observe(host)
    this.resize()
    this.raf = requestAnimationFrame(this.animate)
  }
  private material(color: string) {
    const key = 'solid' + color
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.5,
          metalness: 0.35,
        }),
      )
    return this.materials.get(key)!
  }
  private glow(color: string) {
    const key = 'glow' + color
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshBasicMaterial({ color, toneMapped: false }),
      )
    return this.materials.get(key)!
  }
  private makeUnit(u: Unit): UnitVisual {
    const group = new THREE.Group(),
      p = PADS[u.pad],
      spec = MODULES[u.type],
      rotor = new THREE.Group()
    group.userData.signature = `${u.type}:${u.pad}:${u.level}`
    group.position.set(p.x, 0, p.z)
    group.add(rotor)
    const boxes = new Map<
      string,
      { x: number; y: number; z: number; w: number; h: number; d: number }[]
    >()
    const box = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: string,
    ) => {
      if (!boxes.has(color)) boxes.set(color, [])
      boxes.get(color)!.push({ x, y, z, w, h, d })
    }
    box(0, 0.3, 0, 2.2, 0.35, 2.2, '#3b4c60')
    box(0, 0.5, 0, 1.95, 0.07, 1.95, spec.color)
    if (u.type === 'prefill') {
      box(0, 1.05, 0, 1.55, 0.95, 1.55, '#535577')
      for (let i = 0; i < 5; i++) {
        box(0, 0.7 + i * 0.22, 0.81, 1.3, 0.065, 0.05, spec.color)
        box(-0.8, 0.7 + i * 0.22, 0, 0.05, 0.065, 1.3, spec.color)
      }
      const crystal = new THREE.Mesh(this.sphere, this.glow(spec.color))
      crystal.position.y = 2.05
      rotor.add(crystal)
      for (let i = 0; i < u.level; i++)
        box(-0.6 + i * 0.6, 1.65, 0, 0.27, 0.18, 1.2, '#d8c5f6')
    } else if (u.type === 'decode') {
      for (let i = 0; i < 8; i++) {
        box(
          ((i % 4) - 1.5) * 0.43,
          0.85,
          (Math.floor(i / 4) - 0.5) * 0.8,
          0.32,
          0.55,
          0.56,
          '#7c9565',
        )
        box(
          ((i % 4) - 1.5) * 0.43,
          1.17,
          (Math.floor(i / 4) - 0.5) * 0.8,
          0.34,
          0.06,
          0.58,
          spec.color,
        )
      }
      const disk = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.05, 6, 24),
        this.glow(spec.color),
      )
      disk.rotation.x = Math.PI / 2
      disk.position.y = 1.55
      rotor.add(disk)
      for (let i = 0; i < 3; i++) {
        const blade = new THREE.Mesh(
          new THREE.BoxGeometry(1.1, 0.05, 0.12),
          this.material('#c3d89f'),
        )
        blade.position.y = 1.55
        blade.rotation.y = (i * Math.PI) / 3
        rotor.add(blade)
      }
    } else if (u.type === 'cache') {
      for (let column = 0; column < 3; column++)
        for (let level = 0; level < 5; level++)
          box(
            (column - 1) * 0.58,
            0.7 + level * 0.3,
            0,
            0.43,
            0.16,
            1.4,
            column === 1 ? '#8ae0db' : '#4e7f94',
          )
      box(0, 2.2, 0, 1.85, 0.1, 1.65, '#9cd9da')
    } else {
      box(0, 0.9, 0, 1.8, 0.7, 1.4, '#776b5f')
      for (let i = 0; i < 6; i++) {
        box((i - 2.5) * 0.25, 0.9, 0.75, 0.13, 0.21, 0.06, spec.color)
        box((i - 2.5) * 0.25, 1.3, 0, 0.11, 0.1, 1.2, '#d3ad79')
      }
      const signal = new THREE.Mesh(
        new THREE.TorusGeometry(0.55, 0.035, 5, 32),
        this.glow(spec.color),
      )
      signal.rotation.x = Math.PI / 2
      signal.position.y = 1.8
      rotor.add(signal)
    }
    for (const [color, list] of boxes) {
      const mesh = new THREE.InstancedMesh(
        this.cube,
        this.material(color),
        list.length,
      )
      list.forEach((b, i) => {
        this.temp.position.set(b.x, b.y, b.z)
        this.temp.rotation.set(0, 0, 0)
        this.temp.scale.set(b.w, b.h, b.d)
        this.temp.updateMatrix()
        mesh.setMatrixAt(i, this.temp.matrix)
      })
      group.add(mesh)
    }
    const fill =
      u.type === 'cache'
        ? new THREE.Mesh(
            this.cube,
            new THREE.MeshBasicMaterial({
              color: '#87dce0',
              transparent: true,
              opacity: 0.55,
            }),
          )
        : null
    if (fill) {
      fill.position.set(0, 1.35, 0.8)
      fill.scale.set(1.65, 1.5, 0.06)
      group.add(fill)
    }
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 6, 4),
      new THREE.MeshBasicMaterial({ color: spec.color }),
    )
    light.position.set(0.9, 0.8, 1)
    group.add(light)
    this.unitRoot.add(group)
    return { group, rotor, fill, light, born: this.visualTime }
  }
  private rebuild() {
    const s = this.options().state
    this.preview = s.phase === 'briefing'
    const real = s.units
    const units =
      this.preview && real.length === 0
        ? [
            {
              id: -1,
              pad: 5,
              type: 'prefill' as const,
              level: 2,
              invested: 0,
              offlineUntil: 0,
              prefixes: [],
            },
            {
              id: -2,
              pad: 10,
              type: 'decode' as const,
              level: 2,
              invested: 0,
              offlineUntil: 0,
              prefixes: [],
            },
            {
              id: -3,
              pad: 2,
              type: 'cache' as const,
              level: 1,
              invested: 0,
              offlineUntil: 0,
              prefixes: [],
            },
            {
              id: -4,
              pad: 12,
              type: 'fabric' as const,
              level: 1,
              invested: 0,
              offlineUntil: 0,
              prefixes: [],
            },
          ]
        : real
    for (const [id, v] of this.units) {
      const next = units.find((u) => u.id === id)
      if (
        !next ||
        v.group.userData.signature !== `${next.type}:${next.pad}:${next.level}`
      ) {
        this.unitRoot.remove(v.group)
        v.group.traverse((o) => {
          if (
            o instanceof THREE.Mesh &&
            o.geometry !== this.cube &&
            o.geometry !== this.sphere
          )
            o.geometry.dispose()
        })
        ;(v.light.material as THREE.Material).dispose()
        v.fill && (v.fill.material as THREE.Material).dispose()
        this.units.delete(id)
      }
    }
    for (const u of units) {
      if (!this.units.has(u.id)) this.units.set(u.id, this.makeUnit(u))
    }
    this.links.children.forEach((o) => {
      if (o instanceof THREE.Line) {
        o.geometry.dispose()
        ;(o.material as THREE.Material).dispose()
      }
    })
    this.links.clear()
    for (const u of units) {
      const p = PADS[u.pad]
      const from =
        u.type === 'prefill'
          ? router
          : u.type === 'decode'
            ? new THREE.Vector3(p.x, 0.25, p.z)
            : new THREE.Vector3(1, 0.2, 0)
      const to = u.type === 'decode' ? exit : new THREE.Vector3(p.x, 0.25, p.z)
      const mid = from.clone().lerp(to, 0.5)
      mid.y = 0.18
      const curve = new THREE.CatmullRomCurve3([
        from.clone().setY(0.2),
        mid,
        to.clone().setY(0.2),
      ])
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(24)),
        new THREE.LineBasicMaterial({
          color: MODULES[u.type].color,
          transparent: true,
          opacity: 0.17,
        }),
      )
      this.links.add(line)
    }
    this.labels = [
      {
        id: 'ingress',
        title: 'API INGRESS',
        subtitle: 'many users · one service',
        position: gate.clone().setY(2.3),
        pad: null,
        color: '#b19ae4',
      },
      {
        id: 'egress',
        title: 'TOKEN STREAM',
        subtitle: 'answers delivered here',
        position: exit.clone().setY(2.9),
        pad: null,
        color: '#c9ee87',
      },
      ...units.map((u) => ({
        id: `unit-${u.id}`,
        title: `${MODULES[u.type].short} · ${PADS[u.pad].name}`,
        subtitle: this.preview ? 'mission preview' : `LEVEL ${u.level}`,
        position: new THREE.Vector3(
          PADS[u.pad].x,
          u.type === 'prefill' || u.type === 'cache' ? 2.9 : 2.3,
          PADS[u.pad].z,
        ),
        pad: u.pad,
        color: MODULES[u.type].color,
      })),
    ]
    this.hooks.labels(this.labels)
  }
  private resize = () => {
    const { width, height } = this.host.getBoundingClientRect()
    if (!width || !height) return
    const aspect = width / height,
      span = 13.5
    this.camera.left = -span * aspect
    this.camera.right = span * aspect
    this.camera.top = span
    this.camera.bottom = -span
    this.camera.zoom = width < 650 ? 0.66 : 1
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
  private padAt(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(this.pointer, this.camera)
    return (
      this.raycaster.intersectObject(this.padMesh, false)[0]?.instanceId ?? null
    )
  }
  private pointerDown = (e: PointerEvent) => {
    this.pointers.add(e.pointerId)
    if (this.pointers.size > 1) this.multiTouch = true
    if (e.isPrimary) this.down = { x: e.clientX, y: e.clientY }
  }
  private pointerLeave = () => {
    this.hovered = null
    this.options().onHover(null)
  }
  private pointerCancel = () => {
    this.pointers.clear()
    this.multiTouch = false
    this.pointerLeave()
  }
  private pointerMove = (e: PointerEvent) => {
    const pad = this.padAt(e)
    if (pad !== this.hovered) {
      this.hovered = pad
      this.hooks.project('hover', 0, 0, false)
      this.options().onHover(pad)
    }
    this.renderer.domElement.style.cursor = pad !== null ? 'pointer' : 'grab'
  }
  private pointerUp = (e: PointerEvent) => {
    const tracked = this.pointers.delete(e.pointerId),
      multiTouch = this.multiTouch
    if (!this.pointers.size) this.multiTouch = false
    if (!tracked || multiTouch || !e.isPrimary || e.button !== 0) return
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 7) return
    const pad = this.padAt(e)
    const hit = this.raycaster.intersectObject(this.packets, false)[0]
    if (hit?.instanceId !== undefined && !this.options().tool) {
      const job = this.options().state.jobs[hit.instanceId]
      if (job) {
        this.options().onRequest(job.id)
        return
      }
    }
    if (pad !== null) this.options().onPad(pad)
  }
  private lost = (e: Event) => {
    e.preventDefault()
    this.visible = false
    this.hooks.lost()
  }
  reset() {
    this.camera.position.set(24, 29, 34)
    this.controls.target.set(0, 0.8, 0)
    this.camera.zoom = this.host.clientWidth < 650 ? 0.66 : 1
    this.camera.updateProjectionMatrix()
  }
  zoom(direction: number) {
    this.camera.zoom = THREE.MathUtils.clamp(
      this.camera.zoom * (direction > 0 ? 1.2 : 1 / 1.2),
      0.35,
      2.3,
    )
    this.camera.updateProjectionMatrix()
  }
  rotate(direction: number) {
    const v = this.camera.position
      .clone()
      .sub(this.controls.target)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), (direction * Math.PI) / 4)
    this.camera.position.copy(this.controls.target).add(v)
    this.controls.update()
  }
  private positionFor(j: Job, s: GameState, target: THREE.Vector3) {
    const pu = s.units.find((u) => u.id === j.prefillId),
      du = s.units.find((u) => u.id === j.decodeId),
      pp = pu ? PADS[pu.pad] : null,
      dp = du ? PADS[du.pad] : null
    const progress = THREE.MathUtils.clamp(
      1 - j.remaining / Math.max(1, j.stageTotal),
      0,
      1,
    )
    if (j.phase === 'queued') {
      const t = Math.min(1, (s.time - j.born) / 0.7)
      target.copy(gate).lerp(router, t)
      target.y = 1.5
      target.z += Math.sin(j.id * 1.7) * 0.45
      target.x += Math.floor(j.id % 3) * 0.25
    } else if (j.phase === 'prefill' && pp) {
      const t = Math.min(1, progress / 0.2)
      target.copy(router).lerp(new THREE.Vector3(pp.x, 1.6, pp.z), t)
      target.y += Math.sin(t * Math.PI) * 1.5
      if (t === 1) {
        target.x += Math.cos(s.time * 2 + j.id) * 0.65
        target.z += Math.sin(s.time * 2 + j.id) * 0.65
      }
    } else if (j.phase === 'ready' && pp) {
      target.set(pp.x, 2.6, pp.z)
      target.y += Math.sin(s.time * 2) * 0.1
    } else if (j.phase === 'transfer' && pp && dp) {
      target.set(
        THREE.MathUtils.lerp(pp.x, dp.x, progress),
        1.4 + Math.sin(progress * Math.PI) * 3,
        THREE.MathUtils.lerp(pp.z, dp.z, progress),
      )
    } else if (j.phase === 'decode' && dp) {
      target.set(
        dp.x + Math.cos(s.time * 3 + j.id) * 0.7,
        1.6,
        dp.z + Math.sin(s.time * 3 + j.id) * 0.7,
      )
    } else if (j.phase === 'done' && dp) {
      const t = Math.min(1, (s.time - (j.completedAt || s.time)) / 0.8)
      target.set(dp.x, 1.6, dp.z).lerp(exit, t)
      target.y += Math.sin(t * Math.PI) * 2
    } else target.set(router.x, 1.4, router.z)
    return target
  }
  private animate = (time: number) => {
    if (this.disposed) return
    this.raf = requestAnimationFrame(this.animate)
    const dt = Math.max(0, Math.min(0.1, (time - this.last) / 1000))
    this.last = time
    const o = this.options()
    if (!this.visible || !o.active || document.hidden) return
    this.qualityFrames++
    this.qualityTime += dt
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
    if (!this.reduceMotion) this.visualTime += dt
    const s = o.state,
      metrics = getGameMetrics(s)
    // Parentheses keep the briefing preview part of the reconciliation key.
    const key =
      s.units.map((u) => `${u.id}:${u.pad}:${u.type}:${u.level}`).join('|') +
      `:${s.phase === 'briefing'}`
    if (key !== this.signature) {
      this.signature = key
      this.rebuild()
    }
    this.controls.update(dt)
    PADS.forEach((p, i) => {
      const unit = s.units.find((u) => u.pad === p.id)
      this.color.set(
        o.selected === p.id
          ? '#7f9467'
          : this.hovered === p.id && o.tool
            ? '#586284'
            : unit
              ? '#344456'
              : '#293b4e',
      )
      this.padMesh.setColorAt(i, this.color)
    })
    if (this.padMesh.instanceColor)
      this.padMesh.instanceColor.needsUpdate = true
    for (const [id, v] of this.units) {
      const unit = s.units.find((u) => u.id === id),
        busy = unit ? activeOn(s, id) : 1,
        offline = unit && unit.offlineUntil > s.time
      const scale = this.reduceMotion
        ? 1
        : Math.min(1, 0.3 + (this.visualTime - v.born) * 2.8)
      v.group.scale.setScalar(scale)
      if (
        !this.reduceMotion &&
        (s.phase === 'playing' || s.phase === 'briefing')
      )
        v.rotor.rotation.y += dt * (busy ? 1.5 : 0.3)
      ;(v.light.material as THREE.MeshBasicMaterial).color.set(
        offline
          ? '#f28080'
          : busy
            ? '#f0fbd0'
            : unit
              ? MODULES[unit.type].color
              : '#9dd4bd',
      )
      if (v.fill) {
        const amount = THREE.MathUtils.clamp(
          metrics.used / metrics.memory,
          0.04,
          1,
        )
        v.fill.scale.y = amount * 1.5
        v.fill.position.y = 0.6 + amount * 0.75
      }
    }
    const selected = o.selected !== null ? PADS[o.selected] : null
    this.selection.visible = Boolean(selected) && s.phase !== 'briefing'
    if (selected) this.selection.position.set(selected.x, 0.16, selected.z)
    const empty =
      this.hovered !== null && !s.units.some((u) => u.pad === this.hovered)
    this.ghost.visible = Boolean(o.tool && empty && s.phase !== 'briefing')
    if (this.ghost.visible) {
      const p = PADS[this.hovered!]
      this.ghost.position.set(p.x, 1.35, p.z)
      ;(this.ghost.material as THREE.MeshBasicMaterial).color.set(
        MODULES[o.tool!].color,
      )
    }
    this.beacon.rotation.y = this.visualTime * 0.6
    this.beacon.position.y = 2 + Math.sin(this.visualTime * 1.5) * 0.18
    const jobs = s.jobs.slice(0, 80)
    const activeIds = new Set(jobs.map((j) => j.id))
    for (const id of this.packetVisuals.keys())
      if (!activeIds.has(id)) this.packetVisuals.delete(id)
    for (const j of jobs) {
      this.positionFor(j, s, this.framePosition)
      let visual = this.packetVisuals.get(j.id)
      if (!visual) {
        visual = {
          position: this.framePosition.clone(),
          history: Array.from({ length: 7 }, () => this.framePosition.clone()),
          sampled: this.visualTime,
        }
        this.packetVisuals.set(j.id, visual)
      }
      if (s.phase === 'playing' && !this.reduceMotion)
        visual.position.lerp(this.framePosition, 1 - Math.exp(-dt * 16))
      else visual.position.copy(this.framePosition)
      if (s.phase === 'playing' && this.visualTime - visual.sampled >= 0.045) {
        for (let i = 6; i > 0; i--)
          visual.history[i].copy(visual.history[i - 1])
        visual.history[0].copy(visual.position)
        visual.sampled = this.visualTime
      }
    }
    const focused = jobs.find((j) => j.id === o.focusedJob)
    this.focusHalo.visible = Boolean(focused)
    this.focusRoute.visible = Boolean(focused)
    if (focused) {
      this.framePosition.copy(this.packetVisuals.get(focused.id)!.position)
      this.focusHalo.position.copy(this.framePosition)
      this.focusHalo.scale.setScalar(1 + Math.sin(s.time * 3) * 0.1)
      this.projected
        .copy(this.framePosition)
        .add(new THREE.Vector3(0, 0.8, 0))
        .project(this.camera)
      this.hooks.project(
        'request',
        (this.projected.x * 0.5 + 0.5) * this.host.clientWidth,
        (-this.projected.y * 0.5 + 0.5) * this.host.clientHeight,
        this.projected.z >= -1 && this.projected.z <= 1,
      )
      const routeKey = `${focused.id}:${focused.prefillId}:${focused.decodeId}:${this.signature}`
      if (routeKey !== this.routeKey) {
        this.routeKey = routeKey
        const pu = s.units.find((u) => u.id === focused.prefillId),
          du = s.units.find((u) => u.id === focused.decodeId)
        const path = [gate.clone(), router.clone()]
        if (pu)
          path.push(new THREE.Vector3(PADS[pu.pad].x, 1.6, PADS[pu.pad].z))
        if (du) {
          const from = path[path.length - 1],
            to = new THREE.Vector3(PADS[du.pad].x, 1.6, PADS[du.pad].z)
          for (let i = 1; i <= 24; i++) {
            const p = from.clone().lerp(to, i / 24)
            p.y += Math.sin((i / 24) * Math.PI) * 3
            path.push(p)
          }
        }
        path.push(exit.clone())
        this.focusRoute.geometry.dispose()
        this.focusRoute.geometry = new THREE.BufferGeometry().setFromPoints(
          path,
        )
      }
    } else this.hooks.project('request', 0, 0, false)
    this.packets.count = jobs.length
    this.trails.geometry.setDrawRange(0, jobs.length * 7)
    jobs.forEach((j, i) => {
      const visual = this.packetVisuals.get(j.id)!
      this.framePosition.copy(visual.position)
      this.temp.position.copy(this.framePosition)
      this.temp.rotation.set(s.time * 0.6, s.time + j.id, 0)
      const size =
        j.id === o.focusedJob ? 1.4 : j.phase === 'transfer' ? 0.8 : 1
      this.temp.scale.set(size, size, j.phase === 'transfer' ? 1.9 : size)
      this.temp.updateMatrix()
      this.packets.setMatrixAt(i, this.temp.matrix)
      this.color.copy(tenants[j.tenant])
      if (j.phase === 'done' && j.generated < j.output - 0.01)
        this.color.set('#ed8e83')
      this.packets.setColorAt(i, this.color)
      for (let trail = 0; trail < 7; trail++) {
        const point = visual.history[trail]
        const offset = (i * 7 + trail) * 3
        this.trailPositions[offset] = point.x
        this.trailPositions[offset + 1] = point.y
        this.trailPositions[offset + 2] = point.z
        const fade = (1 - trail / 7) * 0.6
        this.trailColors[offset] = this.color.r * fade
        this.trailColors[offset + 1] = this.color.g * fade
        this.trailColors[offset + 2] = this.color.b * fade
      }
    })
    this.packets.instanceMatrix.needsUpdate = true
    if (this.packets.instanceColor)
      this.packets.instanceColor.needsUpdate = true
    this.trails.geometry.attributes.position.needsUpdate = true
    this.trails.geometry.attributes.color.needsUpdate = true
    for (const label of this.labels) {
      this.projected.copy(label.position).project(this.camera)
      const x = (this.projected.x * 0.5 + 0.5) * this.host.clientWidth,
        y = (-this.projected.y * 0.5 + 0.5) * this.host.clientHeight
      this.hooks.project(
        label.id,
        x,
        y,
        x > 35 &&
          x < this.host.clientWidth - 35 &&
          y > 80 &&
          y < this.host.clientHeight - 60,
      )
    }
    this.renderer.render(this.scene, this.camera)
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.raf)
    this.observer.disconnect()
    this.visibility.disconnect()
    this.controls.dispose()
    const c = this.renderer.domElement
    c.removeEventListener('pointerdown', this.pointerDown)
    c.removeEventListener('pointerup', this.pointerUp)
    c.removeEventListener('pointermove', this.pointerMove)
    c.removeEventListener('pointerleave', this.pointerLeave)
    c.removeEventListener('pointercancel', this.pointerCancel)
    c.removeEventListener('webglcontextlost', this.lost)
    this.scene.traverse((o) => {
      if (
        o instanceof THREE.Mesh ||
        o instanceof THREE.Line ||
        o instanceof THREE.Points
      ) {
        o.geometry.dispose()
        if (
          o instanceof THREE.Line ||
          o === this.padMesh ||
          o === this.packets ||
          o === this.trails ||
          o === this.ghost
        )
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
            m.dispose(),
          )
      }
    })
    this.materials.forEach((m) => m.dispose())
    this.units.forEach((v) => {
      ;(v.light.material as THREE.Material).dispose()
      v.fill && (v.fill.material as THREE.Material).dispose()
    })
    this.renderer.dispose()
    c.remove()
  }
}
