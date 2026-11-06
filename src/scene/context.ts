import * as THREE from 'three'
import { FlowEffects } from './effects.ts'
import type { EffectsQuality } from './effects'
import { hardwareAnchor } from '../learning/infrastructure/context.ts'
import type { ContextFrame, Point3 } from '../learning/infrastructure/context'

const green = new THREE.Color('#b6d39b'),
  red = new THREE.Color('#b0797b')
const rankPosition = (i: number): Point3 => [
  ((i % 4) - 1.5) * 3.5,
  2.3,
  (Math.floor(i / 4) - 0.5) * 5.5,
]
// A bounded annotation layer attached to the existing hardware. It creates no
// alternative fleet, pipeline platforms or independent camera/world.
export class ContextOverlay {
  readonly group = new THREE.Group()
  readonly glyphs: THREE.InstancedMesh
  readonly packets: THREE.InstancedMesh
  readonly metadata: THREE.InstancedMesh
  private cube = new THREE.BoxGeometry(1, 1, 1)
  private frame: ContextFrame | null = null
  private paths: THREE.CatmullRomCurve3[] = []
  private lines = new THREE.Group()
  private wave: THREE.Line
  private signals = new FlowEffects(48)
  private matrix = new THREE.Matrix4()
  private point = new THREE.Vector3()
  private scale = new THREE.Vector3()
  private rotation = new THREE.Quaternion()
  private color = new THREE.Color()
  private clock = 0
  private phase = 0
  constructor() {
    this.group.name = 'context-on-infrastructure'
    this.glyphs = new THREE.InstancedMesh(
      this.cube,
      new THREE.MeshStandardMaterial({
        color: '#ffffff',
        emissive: '#4c5f6b',
        emissiveIntensity: 0.35,
        roughness: 0.45,
        metalness: 0.25,
      }),
      1024,
    )
    this.glyphs.name = 'hardware-context-glyphs'
    this.glyphs.frustumCulled = false
    this.metadata = new THREE.InstancedMesh(
      this.cube,
      new THREE.MeshStandardMaterial({
        color: '#dfc58d',
        emissive: '#a88139',
        emissiveIntensity: 0.2,
      }),
      16,
    )
    this.metadata.name = 'declared-scale-metadata'
    this.metadata.frustumCulled = false
    this.packets = new THREE.InstancedMesh(
      this.cube,
      new THREE.MeshBasicMaterial({ color: '#b9dfc7', toneMapped: false }),
      48,
    )
    this.packets.frustumCulled = false
    this.wave = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 64 }, () => new THREE.Vector3()),
      ),
      new THREE.LineBasicMaterial({
        color: '#b3d7cc',
        transparent: true,
        opacity: 0.9,
      }),
    )
    this.wave.visible = false
    this.group.add(
      this.glyphs,
      this.metadata,
      this.packets,
      this.lines,
      this.wave,
      this.signals.group,
    )
  }
  private addPath(points: Point3[], color: string) {
    const vectors = points.map((p) => new THREE.Vector3(...p))
    if (vectors.length === 2) {
      const mid = vectors[0].clone().lerp(vectors[1], 0.5)
      mid.y += 0.65
      vectors.splice(1, 0, mid)
    }
    const curve = new THREE.CatmullRomCurve3(vectors)
    this.paths.push(curve)
    this.lines.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 }),
      ),
    )
  }
  private configure(frame: ContextFrame) {
    this.frame = frame
    for (const line of [...this.lines.children]) {
      const l = line as THREE.Line
      l.geometry.dispose()
      ;(l.material as THREE.Material).dispose()
      this.lines.remove(l)
    }
    this.paths = []
    const at = (node: string) => hardwareAnchor(frame.layer, node),
      f = frame,
      c = frame.color
    const local = (a: string, b: string) => this.addPath([at(a), at(b)], c)
    if (f.pattern === 'power') {
      local(
        'power',
        f.layer === 'fleet'
          ? 'prefill'
          : f.layer === 'pod'
            ? 'prefill'
            : 'tensor',
      )
      local(
        f.layer === 'fleet'
          ? 'decode'
          : f.layer === 'pod'
            ? 'decode'
            : 'tensor',
        'cooling',
      )
    } else if (
      f.layer === 'rack' &&
      ['gradients', 'experts'].includes(f.pattern)
    ) {
      for (let i = 0; i < 8; i++)
        this.addPath([rankPosition(i), rankPosition((i + 1) % 8)], c)
    } else if (
      f.pattern === 'transfer' &&
      (f.layer === 'pod' || f.layer === 'fleet')
    )
      local('prefill', 'decode')
    else if (f.pattern === 'experts' && f.layer === 'pod') {
      for (let i = 0; i < 8; i++) {
        const worker = (rank: number): Point3 => [
          ((rank % 4) - 1.5) * 3.8,
          3.4,
          (Math.floor(rank / 4) - 0.5) * 5.5,
        ]
        const source = worker(i),
          target = worker((i + 1) % 8),
          spine = at('fabric')
        this.addPath([source, spine, target], c)
        this.addPath([target, [spine[0], spine[1] + 0.25, spine[2]], source], c)
      }
    } else if (f.pattern === 'pages' && f.layer !== 'gpu') {
      const a = at(f.layer === 'rack' ? 'hbm' : 'prefill')
      this.addPath(
        [
          [a[0] - 0.7, a[1] + 0.2, a[2]],
          [a[0], a[1] + 0.55, a[2]],
          [a[0] + 0.7, a[1] + 0.2, a[2]],
        ],
        c,
      )
    } else if (
      f.layer === 'fleet' &&
      (f.pattern === 'weights' ||
        f.pattern === 'checkpoint' ||
        f.workload === 'training')
    ) {
      if (f.pattern === 'checkpoint') local('prefill', 'storage')
      else local('storage', 'prefill')
    } else if (f.layer === 'fleet' && f.kind === 'model' && f.stage === 5) {
      if (f.workload === 'media') {
        local('decode', 'storage')
        local('storage', 'gateway')
      } else local('decode', 'gateway')
    } else if (f.layer === 'fleet') {
      local(
        f.pattern === 'checkpoint' || f.pattern === 'weights'
          ? 'storage'
          : 'gateway',
        'scheduler',
      )
      local('scheduler', 'prefill')
      if (f.workload === 'audio') local('decode', 'gateway')
    } else if (f.layer === 'pod') {
      local('fabric', 'prefill')
      local('decode', 'fabric')
    } else if (f.layer === 'rack') {
      local('fabric', 'nvlink')
      local('nvlink', 'tensor')
    } else {
      local(
        f.pattern === 'gradients' ? 'tensor' : 'hbm',
        f.pattern === 'gradients' ? 'hbm' : 'tensor',
      )
      if (f.pattern === 'transfer' || f.pattern === 'experts')
        local('tensor', 'nvlink')
    }
    this.metadata.count = f.supplementCount || 0
    this.metadata.visible = this.metadata.count > 0
    this.metadata.userData.role = f.supplementRole || ''
    this.wave.visible = f.pattern === 'audio'
    ;(this.wave.material as THREE.LineBasicMaterial).color.set(c)
    ;(this.packets.material as THREE.MeshBasicMaterial).color.set(c)
    this.updateGlyphs(f, 0)
  }
  private updateGlyphs(f: ContextFrame, phase: number) {
    const anchor = hardwareAnchor(f.layer, f.node)
    const count = f.schedule
      ? 8
      : f.pattern === 'power' && f.layer === 'fleet'
        ? 20
        : f.pattern === 'placement' && f.layer === 'rack'
          ? 8
          : f.pattern === 'placement' && f.layer === 'gpu'
            ? 1
            : Math.max(1, Math.min(1024, f.count))
    this.glyphs.count = count
    this.glyphs.userData.pattern = f.pattern
    this.glyphs.userData.layer = f.layer
    for (let i = 0; i < count; i++) {
      let x = anchor[0] + ((i % 8) - 3.5) * 0.24,
        y = anchor[1] + 0.2 + Math.floor(i / 32) * 0.22,
        z = anchor[2] + ((Math.floor(i / 8) % 4) - 1.5) * 0.3
      let w = 0.18,
        h = 0.15,
        d = 0.22
      this.color.set(f.color)
      if (f.schedule) {
        ;[x, y, z] = rankPosition(i)
        w = 1.65
        d = 1.7
        const schedule = f.schedule[i],
          slot = f.playing
            ? Math.floor((phase % 1) * schedule.length)
            : Math.min(schedule.length - 1, f.scheduleSlot || 0),
          state = schedule[slot]
        h = state === 0 ? 0.05 : 0.22
        this.color.set(
          state === 1 ? '#9ac5e8' : state === -1 ? '#c7a2e5' : '#536674',
        )
      } else if (
        f.pattern === 'rollouts' &&
        f.supplementRole === 'worker-roles' &&
        f.layer === 'pod'
      ) {
        x = ((i % 4) - 1.5) * 3.8
        z = (Math.floor(i / 4) - 0.5) * 5.5
        y = 3.5
        w = 2.1
        d = 1.65
        h = 0.18
        this.color.set((f.values?.[i] || 0) > 0 ? '#c4abe9' : '#b5d79b')
      } else if (f.pattern === 'power' && f.layer === 'fleet') {
        x = ((i % 5) - 2) * 3.1
        y = 2.7
        z = (Math.floor(i / 5) - 1.5) * 2.8 - 0.7
        w = 0.7
        d = 0.7
        h = Math.min(1.2, 0.2 + f.pressure * 0.45)
        this.color.set(
          i / 20 < 1 / Math.max(1, f.pressure) ? '#b6d39b' : '#d99588',
        )
      } else if (f.layer === 'rack' && f.pattern === 'placement') {
        ;[x, y, z] = rankPosition(i)
        w = 1.7
        h = 0.12
        d = 1.8
        this.color.set(f.slots?.[i] ? '#b6d39b' : '#526473')
      } else if (f.pattern === 'placement') {
        this.color.set(f.slots?.[i] ? '#b6d39b' : '#526473')
      } else if (f.pattern === 'media') {
        x = anchor[0] + ((i % 8) - 3.5) * 0.38
        z = anchor[2] + (Math.floor(i / 8) - 3.5) * 0.38
        y = anchor[1] + 0.3 + Math.sin(i * 0.7 + phase * 8) * 0.08
        w = 0.32
        h = 0.08
        d = 0.32
        this.color.setHSL((i % 8) / 24 + 0.43, 0.28, 0.64)
      } else if (f.pattern === 'experts') {
        const kimi = f.id === 'kimi-k3',
          itemsPerWorker = kimi ? 112 : Math.ceil(count / 8),
          worker = Math.min(7, Math.floor(i / itemsPerWorker)),
          slot = i % itemsPerWorker
        if (f.layer === 'pod') {
          x =
            ((worker % 4) - 1.5) * 3.8 +
            (kimi ? ((slot % 14) - 6.5) * 0.16 : (slot - 0.5) * 0.6)
          z =
            (Math.floor(worker / 4) - 0.5) * 5.5 +
            (kimi ? (Math.floor(slot / 14) - 3.5) * 0.18 : 0)
          y = 3.3
        } else {
          x = anchor[0] + ((i % 4) - 1.5) * 0.48
          z = anchor[2] + (Math.floor(i / 4) - 1.5) * 0.48
          y = anchor[1]
        }
        w = kimi ? 0.12 : 0.36
        d = kimi ? 0.13 : 0.36
        h = kimi ? 0.1 : 0.18 + 1.5 * (f.values?.[i] || 0)
        y += h / 2
        const selected =
          kimi &&
          Array.from({ length: 16 }, (_, n) => (n * 53 + 11) % 896).includes(i)
        this.color.set(
          kimi
            ? selected
              ? f.color
              : '#526776'
            : i === 0 || i === 16
              ? '#dfbd90'
              : f.color,
        )
        if (selected) h = 0.3
      } else if (f.pattern === 'rollouts' && f.values?.length) {
        const advantage = f.values[i % f.values.length]
        h = 0.08 + Math.min(1.6, Math.abs(advantage)) * 0.4
        this.color.set(
          advantage > 0 ? '#b7d99b' : advantage < 0 ? '#bd9ce0' : '#637783',
        )
      } else if (f.pattern === 'tokens' && f.values?.length) {
        const active = f.values[i % f.values.length] !== 0
        this.color.set(active ? f.color : '#526776')
        h = active ? 0.22 : 0.06
      } else if (f.pattern === 'tokens' && f.applied && f.id === 'reasoning') {
        this.color.copy(red).lerp(green, f.probability ** i)
        w = 0.26
        d = 0.3
      } else if (f.pattern === 'isolation') {
        this.color.setHSL(f.applied ? (i * 0.61803398875) % 1 : 0.56, 0.3, 0.65)
        w = 0.24
        h = f.applied ? 0.26 : 0.14
      } else if (f.pattern === 'checkpoint') {
        h = 0.07
        w = 0.7
        d = 0.65
        y = anchor[1] + Math.floor(i / 4) * 0.12
        this.color.set('#dfc58d')
      } else if (f.pattern === 'gradients') {
        h = 0.12
        this.color.set('#c5a3e6')
      }
      this.matrix.compose(
        this.point.set(x, y, z),
        this.rotation.identity(),
        this.scale.set(w, h, d),
      )
      this.glyphs.setMatrixAt(i, this.matrix)
      this.glyphs.setColorAt(i, this.color)
    }
    this.glyphs.instanceMatrix.needsUpdate = true
    if (this.glyphs.instanceColor) this.glyphs.instanceColor.needsUpdate = true
    for (let i = 0; i < this.metadata.count; i++) {
      const physical = f.supplementRole === 'power-and-cooling',
        p = physical
          ? hardwareAnchor(f.layer, i === 0 ? 'power' : 'cooling')
          : f.supplementRole === 'shared-expert' && f.layer === 'pod'
            ? hardwareAnchor(f.layer, 'prefill')
            : anchor
      this.matrix.compose(
        this.point.set(
          p[0] + (physical ? 0 : (i - (this.metadata.count - 1) / 2) * 0.3),
          p[1] + (physical ? 0 : 0.75),
          p[2] - 0.8,
        ),
        this.rotation.identity(),
        this.scale.set(
          physical ? 0.8 : 0.18,
          physical ? 0.5 : 0.15,
          physical ? 1 : 0.3 * (f.supplementScale || 1),
        ),
      )
      this.metadata.setMatrixAt(i, this.matrix)
      this.metadata.setColorAt(
        i,
        new THREE.Color(physical && i === 1 ? '#92b9d8' : '#dfc58d'),
      )
    }
    if (this.metadata.instanceColor)
      this.metadata.instanceColor.needsUpdate = true
    this.metadata.instanceMatrix.needsUpdate = true
  }
  update(
    frame: ContextFrame,
    phase: number,
    quality: EffectsQuality,
    reduced: boolean,
  ) {
    const changed = this.frame !== frame,
      keyChanged = this.frame?.key !== frame.key
    if (changed) this.configure(frame)
    if (phase >= this.phase) this.clock += (phase - this.phase) * frame.duration
    this.phase = phase
    this.signals.begin(this.clock, quality, reduced)
    if (keyChanged)
      this.signals.pulse(
        new THREE.Vector3(...hardwareAnchor(frame.layer, frame.node)),
        frame.color,
        1.5,
      )
    if (
      (frame.pattern === 'media' || frame.schedule) &&
      frame.playing &&
      !reduced
    )
      this.updateGlyphs(frame, phase)
    const paths = this.paths,
      perPath = Math.max(1, Math.min(6, Math.floor(48 / paths.length))),
      count = Math.min(48, paths.length * perPath)
    this.packets.count = count
    this.color.set(frame.color)
    for (let i = 0; i < count; i++) {
      paths[Math.floor(i / perPath)].getPoint(
        (phase + (i % perPath) / perPath) % 1,
        this.point,
      )
      this.matrix.compose(
        this.point,
        this.rotation.identity(),
        this.scale.set(0.12, 0.12, 0.2),
      )
      this.packets.setMatrixAt(i, this.matrix)
      this.signals.head(this.point, this.color, 0.7)
    }
    this.packets.instanceMatrix.needsUpdate = true
    if (this.wave.visible) {
      const a = hardwareAnchor(frame.layer, frame.node),
        p = this.wave.geometry.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < p.count; i++)
        p.setXYZ(
          i,
          a[0] + (i / 63 - 0.5) * 3,
          a[1] + 0.5 + Math.sin(i * 0.75 + phase * 12) * 0.2,
          a[2],
        )
      p.needsUpdate = true
    }
    this.signals.end()
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>()
    this.group.traverse((o) => {
      if (
        o instanceof THREE.Mesh ||
        o instanceof THREE.Line ||
        o instanceof THREE.Points
      ) {
        geometries.add(o.geometry)
        ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          materials.add(m),
        )
      }
    })
    geometries.forEach((g) => g.dispose())
    materials.forEach((m) => m.dispose())
    this.group.removeFromParent()
  }
}
