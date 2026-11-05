import * as THREE from 'three'
import { findExample } from '../examples/catalog.ts'
import type { ExampleId, ModelExample } from '../examples/catalog'
import type { ExampleView } from '../examples/model'
import type { SceneLabel } from './architecture'

const positions = [
  [-10, -4],
  [-3.5, -4],
  [3, -4],
  [3, 4],
  [-3.5, 4],
  [-10, 4],
] as const
interface Tile {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
}

// One explanatory pipeline in the existing renderer. Geometry represents public
// model components, not a vendor's physical inventory or an executed inference.
export class ExampleWorld {
  readonly group = new THREE.Group()
  readonly pickable: THREE.InstancedMesh[] = []
  readonly labels: SceneLabel[] = []
  readonly model: ModelExample
  private ring: THREE.Mesh
  private packets: THREE.InstancedMesh
  private routes: THREE.CatmullRomCurve3[] = []
  private routeMaterials: THREE.LineBasicMaterial[] = []
  private cube = new THREE.BoxGeometry(1, 1, 1)
  private matrix = new THREE.Matrix4()
  private point = new THREE.Vector3()
  private scale = new THREE.Vector3()
  private rotation = new THREE.Quaternion()
  private waveLines: { line: THREE.Line; direction: number; offset: number }[] =
    []
  private lastStage = -1
  private lastResolution = 0

  constructor(id: ExampleId) {
    this.model = findExample(id)!
    const batches = new Map<
      string,
      { color: string; stage: number; role?: string; items: Tile[] }
    >()
    const box = (
      stage: number,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: string,
      role?: string,
    ) => {
      const [sx, sz] = positions[stage],
        key = `${stage}:${color}:${role || ''}`
      if (!batches.has(key)) batches.set(key, { color, stage, role, items: [] })
      batches.get(key)!.items.push({ x: x + sx, y, z: z + sz, w, h, d })
    }
    const c = this.model.color
    for (let i = 0; i < 6; i++) {
      box(i, 0, 0.05, 0, 5.3, 0.15, 5.1, '#243d49')
      box(i, 0, 0.18, 0, 4.9, 0.12, 4.7, '#365561')
      box(i, -2.3, 0.3, 0, 0.055, 0.1, 4.3, c)
      this.labels.push({
        id: `example-stage-${i}`,
        key: `example-stage-${i}`,
        exampleStage: i,
        title: this.model.stages[i].short,
        subtitle: this.model.stages[i].output,
        position: new THREE.Vector3(positions[i][0], 2.6, positions[i][1]),
      })
      // A different symbol for each model phase, rather than six identical racks.
      if (this.model.kind === 'moe' && i === 3) {
        const active = new Set(
          Array.from({ length: 16 }, (_, k) => (k * 53 + 11) % 896),
        )
        for (let k = 0; k < 896; k++)
          box(
            i,
            ((k % 32) - 15.5) * 0.13,
            0.5,
            (((k / 32) | 0) - 13.5) * 0.14,
            0.1,
            active.has(k) ? 0.44 : 0.12,
            0.11,
            active.has(k) ? c : '#596878',
            active.has(k) ? 'routed-selected' : 'routed-inactive',
          )
        for (let k = 0; k < 2; k++)
          box(
            i,
            -0.6 + k * 1.2,
            1.2,
            -2,
            0.8,
            0.45,
            0.45,
            '#a5d4cd',
            'shared-expert',
          )
      } else if (this.model.kind === 'moe' && i === 2) {
        const full = new Set([
          4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 68, 72,
          76, 80, 84, 88, 92, 93,
        ])
        for (let k = 1; k <= 93; k++)
          box(
            i,
            (((k - 1) % 31) - 15) * 0.13,
            0.5 + ((k / 31) | 0) * 0.25,
            (((k - 1) / 31) | 0) * 0.9 - 0.9,
            0.095,
            0.65,
            0.55,
            full.has(k) ? '#b7a0e0' : c,
          )
      } else if (
        this.model.kind === 'image' &&
        (i === 2 || i === 3 || i === 5)
      ) {
        for (let z = 0; z < 10; z++)
          for (let x = 0; x < 10; x++) {
            const hue =
              (x + z) % 3 === 0
                ? '#b7a0e0'
                : (x * z) % 5 === 0
                  ? '#8fc5c2'
                  : '#7386b4'
            box(
              i,
              (x - 4.5) * 0.37,
              0.44 + ((x + z) % 4) * 0.025,
              (z - 4.5) * 0.37,
              0.34,
              0.16,
              0.34,
              hue,
            )
          }
        if (i === 3)
          for (let k = 0; k < 4; k++)
            box(i, 0, 0.9 + k * 0.25, 0, 3.6, 0.065, 3.6, k % 2 ? c : '#7b94b8')
      } else if (
        this.model.kind === 'video' &&
        (i === 2 || i === 3 || i === 5)
      ) {
        for (let k = 0; k < 6; k++) {
          box(
            i,
            (k - 2.5) * 0.55,
            1.05,
            0,
            0.12,
            1.45,
            2.6,
            k % 2 ? c : '#88adb6',
          )
          for (let t = 0; t < 6; t++)
            box(
              i,
              (k - 2.5) * 0.55,
              0.42 + t * 0.18,
              -1.15,
              0.18,
              0.08,
              0.12,
              '#dfcf9c',
            )
        }
        if (i === 3)
          for (let k = 0; k < 4; k++)
            box(i, k - 1.5, 0.6, 1.8, 0.72, 0.5, 0.45, '#a9b7d1')
      } else if (
        (this.model.kind === 'music' || this.model.kind === 'duplex') &&
        (i === 1 || i === 4 || i === 5)
      ) {
        for (let k = 0; k < 20; k++) {
          const h = 0.15 + Math.abs(Math.sin(k * 1.7)) * 1.15
          box(i, (k - 9.5) * 0.19, 0.5 + h / 2, -0.75, 0.12, h, 0.18, c)
          box(
            i,
            (k - 9.5) * 0.19,
            0.5 + h * 0.3,
            0.75,
            0.12,
            h * 0.8,
            0.18,
            '#87b4d9',
          )
        }
      } else if (this.model.kind === 'music' && i === 2) {
        for (let k = 0; k < 8; k++)
          box(
            i,
            (k - 3.5) * 0.47,
            0.75 + (k === 0 ? 0.2 : 0),
            0,
            0.35,
            k === 0 ? 1.1 : 0.7,
            2.8,
            k === 0 ? c : '#8998bf',
          )
      } else if (this.model.kind === 'tts' && i === 3) {
        for (let f = 0; f < 80; f++)
          for (let t = 0; t < 8; t++)
            box(
              i,
              (t - 3.5) * 0.4,
              0.42 + (Math.sin(f * 0.4 + t) * 0.5 + 0.5) * 0.28,
              (f - 39.5) * 0.048,
              0.33,
              0.08,
              0.038,
              (t + f) % 6 === 0 ? c : '#718da7',
            )
      } else if (this.model.kind === 'tts' && i === 2) {
        for (let k = 0; k < 100; k++)
          box(
            i,
            ((k % 10) - 4.5) * 0.4,
            0.55,
            ((k / 10) | 0) * 0.37 - 1.6,
            0.28,
            0.25,
            0.28,
            c,
            'speech-tokens',
          )
        for (let k = 0; k < 3; k++)
          box(
            i,
            (k - 1) * 0.55,
            0.8,
            2.05,
            0.35,
            0.35,
            0.35,
            '#9ecfba',
            'lookahead',
          )
      } else {
        const chips = i === 0 ? 3 : i === 5 ? 4 : 2
        for (let k = 0; k < chips; k++) {
          const x = (k - (chips - 1) / 2) * 1.25
          box(i, x, 0.55, 0, 0.98, 0.45, 1.8, '#6d8492')
          box(i, x, 0.85, 0, 0.78, 0.12, 1.55, c)
          for (let j = 0; j < 5; j++)
            box(i, x - 0.34 + j * 0.17, 0.98, 0, 0.08, 0.16, 1.1, '#b8c7c1')
        }
      }
    }
    for (const batch of batches.values()) {
      const material = new THREE.MeshStandardMaterial({
        color: batch.color,
        roughness: 0.72,
        metalness: 0.12,
      })
      const mesh = new THREE.InstancedMesh(
        this.cube,
        material,
        batch.items.length,
      )
      mesh.userData.exampleStage = batch.stage
      mesh.userData.role = batch.role
      mesh.userData.tokenGrid = batch.role === 'speech-tokens'
      batch.items.forEach((b, i) => {
        this.matrix.compose(
          this.point.set(b.x, b.y, b.z),
          this.rotation,
          this.scale.set(b.w, b.h, b.d),
        )
        mesh.setMatrixAt(i, this.matrix)
      })
      mesh.computeBoundingSphere()
      this.pickable.push(mesh)
      this.group.add(mesh)
    }
    for (let i = 0; i < 6; i++) {
      const a = positions[i],
        b = positions[(i + 1) % 6]
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(a[0], 0.55, a[1]),
        new THREE.Vector3((a[0] + b[0]) / 2, 1.45, (a[1] + b[1]) / 2),
        new THREE.Vector3(b[0], 0.55, b[1]),
      ])
      this.routes.push(curve)
      const material = new THREE.LineBasicMaterial({
        color: c,
        transparent: true,
        opacity: 0.23,
      })
      this.routeMaterials.push(material)
      this.group.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)),
          material,
        ),
      )
    }
    if (this.model.kind === 'duplex') {
      // Opposing lanes are simultaneous: this is not an ASR → chat → TTS chain.
      const a = positions[0],
        b = positions[5]
      for (const direction of [-1, 1]) {
        const points = Array.from(
          { length: 60 },
          (_, i) =>
            new THREE.Vector3(
              a[0] + direction * 0.5,
              0.8,
              a[1] + ((b[1] - a[1]) * i) / 59,
            ),
        )
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({
            color: direction === 1 ? c : '#a9b9ec',
          }),
        )
        this.waveLines.push({ line, direction, offset: a[0] + direction * 0.5 })
        this.group.add(line)
      }
    }
    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.7, 0.035, 8, 80),
      new THREE.MeshBasicMaterial({
        color: c,
        transparent: true,
        opacity: 0.9,
      }),
    )
    this.ring.rotation.x = -Math.PI / 2
    this.group.add(this.ring)
    this.packets = new THREE.InstancedMesh(
      this.cube,
      new THREE.MeshBasicMaterial({ color: c, toneMapped: false }),
      48,
    )
    this.packets.frustumCulled = false
    this.group.add(this.packets)
  }
  update(view: ExampleView, phase: number) {
    const stage = view.stage
    if (stage !== this.lastStage) {
      this.ring.position.set(positions[stage][0], 0.29, positions[stage][1])
      this.routeMaterials.forEach(
        (m, i) => (m.opacity = i === stage ? 0.95 : 0.18),
      )
      this.lastStage = stage
    }
    this.ring.scale.setScalar(1 + Math.sin(phase * 6) * 0.018)
    const lanes = this.model.kind === 'duplex' ? 2 : 1
    this.packets.count = lanes * 12
    for (let lane = 0; lane < lanes; lane++)
      for (let k = 0; k < 12; k++) {
        const t = (phase + k / 12) % 1
        if (this.model.kind === 'duplex')
          this.point.set(
            -10 + (lane ? 0.5 : -0.5),
            0.9,
            -4 + (lane ? t : 1 - t) * 8,
          )
        else this.routes[stage].getPoint(t, this.point)
        this.matrix.compose(
          this.point,
          this.rotation,
          this.scale.set(0.14, 0.14, 0.28),
        )
        this.packets.setMatrixAt(lane * 12 + k, this.matrix)
      }
    this.packets.instanceMatrix.needsUpdate = true
    for (const { line, direction, offset } of this.waveLines) {
      const attr = line.geometry.getAttribute(
        'position',
      ) as THREE.BufferAttribute
      for (let i = 0; i < attr.count; i++)
        attr.setX(i, offset + Math.sin(i * 0.7 + phase * 12 * direction) * 0.15)
      attr.needsUpdate = true
    }
    // Capacity exercises affect visible output scale without pretending to run
    // attention or predict measured wall-clock performance.
    if (
      this.model.kind === 'image' &&
      view.inputs.resolution !== this.lastResolution
    ) {
      const factor = 0.45 + (view.inputs.resolution / 2048) * 0.55
      this.pickable
        .filter((m) => m.userData.exampleStage === 5)
        .forEach((m) => {
          m.scale.setScalar(factor)
          m.position.set(
            (1 - factor) * positions[5][0],
            0,
            (1 - factor) * positions[5][1],
          )
        })
      this.lastResolution = view.inputs.resolution
    }
    if (this.model.kind === 'tts')
      this.pickable
        .filter((m) => m.userData.tokenGrid)
        .forEach((m) => (m.count = view.inputs.hop))
  }
  dispose() {
    const geometries = new Set<THREE.BufferGeometry>(),
      materials = new Set<THREE.Material>()
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
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
