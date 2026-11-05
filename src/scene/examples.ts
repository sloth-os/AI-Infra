import * as THREE from 'three'
import { FlowEffects } from './effects.ts'
import type { EffectsQuality } from './effects'
import { findExample } from '../examples/catalog.ts'
import type { ExampleId, ModelExample } from '../examples/catalog'
import type { ExampleView } from '../examples/model'
import type { LifecycleView } from '../lifecycle/model'
import { lifecycleMetrics, pipelineSchedule } from '../lifecycle/model.ts'
import { hotIssues } from '../issues/catalog.ts'
import { issueResults } from '../issues/model.ts'
import type { IssueView } from '../issues/model'
import type { SceneLabel } from './architecture'

const positions = [
  [-10, -4],
  [-3.5, -4],
  [3, -4],
  [3, 4],
  [-3.5, 4],
  [-10, 4],
] as const
// Local teaching paths follow the selected mechanism; stations are not linked
// into a fictitious ten-step request pipeline.
const issuePaths = [
  [
    [-1.6, 0.5, 1.9],
    [0, 1.2, 0],
    [1.6, 0.5, -1.9],
  ],
  [
    [-1.8, 0.7, 1.8],
    [0, 1.2, 0],
    [1.8, 0.7, -1.8],
  ],
  [
    [-1.5, 1.8, 0],
    [0, 2.2, 0],
    [1.5, 1.8, 0],
  ],
  [
    [0, 0.6, -2],
    [-1.35, 1.5, -1.2],
    [0, 0.6, 2],
  ],
  [
    [-1.3, 0.9, -0.9],
    [0, 1.9, 0],
    [1.4, 0.9, 0.9],
  ],
  [
    [-1.6, 1.4, -0.7],
    [0, 1.9, 0],
    [1.6, 1.4, 0.7],
  ],
  [
    [-1.4, 0.9, -1.2],
    [1.8, 1.4, 0],
    [0, 1.9, 0],
    [0, 2.4, 1.2],
  ],
  [
    [-1.7, 0.9, -1.6],
    [0, 1.4, 0],
    [1.7, 0.9, 1.6],
  ],
  [
    [-1.4, 0.9, -1.2],
    [0, 2.2, 0],
    [1.4, 0.9, 1.2],
  ],
  [
    [0, 1.9, 0],
    [-1.4, 1.9, -1.2],
    [-1.4, 0.9, -1.2],
  ],
] as const
interface Tile {
  x: number
  y: number
  z: number
  w: number
  h: number
  d: number
}

export interface PipelineProfile {
  id: string
  kind:
    | ModelExample['kind']
    | `lifecycle-${'pretrain' | 'posttrain' | 'inference'}`
    | 'issues'
  color: string
  stages: { short: string; output: string }[]
}

// One explanatory pipeline in the existing renderer. Geometry represents public
// model components, not a vendor's physical inventory or an executed inference.
export class ExampleWorld {
  readonly group = new THREE.Group()
  readonly pickable: THREE.InstancedMesh[] = []
  readonly labels: SceneLabel[] = []
  readonly model: PipelineProfile
  private positions: readonly (readonly [number, number])[] = positions
  private ring: THREE.Mesh
  private packets: THREE.InstancedMesh
  private routes: THREE.CatmullRomCurve3[] = []
  private routeMaterials: THREE.LineBasicMaterial[] = []
  private cube = new THREE.BoxGeometry(1, 1, 1)
  private matrix = new THREE.Matrix4()
  private point = new THREE.Vector3()
  private tangent = new THREE.Vector3()
  private forward = new THREE.Vector3(0, 0, 1)
  private scale = new THREE.Vector3()
  private rotation = new THREE.Quaternion()
  private waveLines: { line: THREE.Line; direction: number; offset: number }[] =
    []
  private signals = new FlowEffects(48)
  private signalClock = 0
  private lastPhase = 0
  private lastStage = -1
  private lastResolution = 0
  private pipeline: ReturnType<typeof pipelineSchedule> | null = null
  private issueSnapshot: IssueView | null = null
  private issueCalculation: ReturnType<typeof issueResults> | null = null

  constructor(profile: ExampleId | PipelineProfile) {
    this.model = typeof profile === 'string' ? findExample(profile)! : profile
    if (this.model.kind === 'issues')
      this.positions = hotIssues.map(
        (_, i) =>
          [
            Math.cos((i * Math.PI) / 5 - Math.PI / 2) * 10.6,
            Math.sin((i * Math.PI) / 5 - Math.PI / 2) * 10.6,
          ] as const,
      )
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
      const [sx, sz] = this.positions[stage],
        key = `${stage}:${color}:${role || ''}`
      if (!batches.has(key)) batches.set(key, { color, stage, role, items: [] })
      batches.get(key)!.items.push({ x: x + sx, y, z: z + sz, w, h, d })
    }
    const c = this.model.color
    for (let i = 0; i < this.model.stages.length; i++) {
      box(i, 0, 0.05, 0, 5.3, 0.15, 5.1, '#243d49')
      box(i, 0, 0.18, 0, 4.9, 0.12, 4.7, '#365561')
      box(
        i,
        -2.3,
        0.3,
        0,
        0.055,
        0.1,
        4.3,
        this.model.kind === 'issues' ? hotIssues[i].color : c,
      )
      this.labels.push({
        id: `${this.model.kind === 'issues' ? 'issue' : this.model.kind.startsWith('lifecycle-') ? 'lifecycle' : 'example'}-stage-${i}`,
        key: `${this.model.kind === 'issues' ? 'issue' : this.model.kind.startsWith('lifecycle-') ? 'lifecycle' : 'example'}-stage-${i}`,
        exampleStage: i,
        title: this.model.stages[i].short,
        subtitle: this.model.stages[i].output,
        position: new THREE.Vector3(
          this.positions[i][0],
          2.6,
          this.positions[i][1],
        ),
      })
      // A different symbol for each model phase, rather than six identical racks.
      if (this.model.kind === 'issues') {
        this.buildIssue(i, box)
      } else if (this.model.kind.startsWith('lifecycle-')) {
        this.buildLifecycle(i, box)
      } else if (this.model.kind === 'moe' && i === 3) {
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
      if (this.model.kind === 'issues') {
        mesh.userData.issueItems = batch.items
        if (
          [
            'issue-hot-replica',
            'issue-scale-metadata',
            'issue-private-cache',
            'issue-draft-token',
          ].includes(batch.role || '')
        )
          mesh.visible = false
      }
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
    for (let i = 0; i < this.model.stages.length; i++) {
      const a = this.positions[i],
        b =
          this.positions[
            this.model.kind === 'lifecycle-inference' && i === 5
              ? 1
              : (i + 1) % this.positions.length
          ]
      const curve = new THREE.CatmullRomCurve3(
        this.model.kind === 'issues'
          ? issuePaths[i].map(
              ([x, y, z]) => new THREE.Vector3(a[0] + x, y, a[1] + z),
            )
          : [
              new THREE.Vector3(a[0], 0.55, a[1]),
              new THREE.Vector3((a[0] + b[0]) / 2, 1.45, (a[1] + b[1]) / 2),
              new THREE.Vector3(b[0], 0.55, b[1]),
            ],
      )
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
      const a = this.positions[0],
        b = this.positions[5]
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
    this.group.add(this.packets, this.signals.group)
  }
  private buildIssue(
    stage: number,
    box: (
      stage: number,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: string,
      role?: string,
    ) => void,
  ) {
    const c = hotIssues[stage].color,
      blue = '#92b9d8',
      gold = '#dfc58d',
      green = '#bad497'
    const grid = (
      role: string,
      n: number,
      cols = 4,
      y = 0.7,
      height = 0.4,
      color = c,
    ) => {
      const rows = Math.ceil(n / cols),
        sx = cols > 4 ? 0.45 : 0.9,
        sz = rows > 4 ? 0.45 : 0.8
      for (let k = 0; k < n; k++)
        box(
          stage,
          ((k % cols) - (cols - 1) / 2) * sx,
          y,
          (Math.floor(k / cols) - (rows - 1) / 2) * sz,
          sx * 0.78,
          height,
          sz * 0.75,
          color,
          role,
        )
    }
    if (stage === 0) {
      grid('issue-power-load', 24, 6, 1, 1.1)
      for (let k = 0; k < 4; k++) {
        box(
          stage,
          (k - 1.5) * 1.05,
          0.5,
          1.9,
          0.7,
          0.3,
          0.3,
          gold,
          'issue-power-bus',
        )
        box(
          stage,
          (k - 1.5) * 1.05,
          0.5,
          -1.9,
          0.75,
          0.35,
          0.3,
          blue,
          'issue-cooling',
        )
      }
    } else if (stage === 1) grid('issue-cache-page', 64, 8, 0.75, 0.6)
    else if (stage === 2) {
      box(stage, -1.5, 1, 0, 1, 1.5, 2, blue, 'issue-prefill-pool')
      box(stage, 1.5, 1, 0, 1, 1.5, 2, green, 'issue-decode-pool')
      for (let k = 0; k < 16; k++)
        box(
          stage,
          ((k % 4) - 1.5) * 0.55,
          1.9 + Math.floor(k / 4) * 0.15,
          0,
          0.3,
          0.08,
          0.3,
          c,
          'issue-handoff-copy',
        )
    } else if (stage === 3) {
      grid('issue-expert', 16, 4, 0.7, 0.55, blue)
      box(stage, 0, 0.6, -2, 1.2, 0.25, 0.4, gold, 'issue-router')
      box(stage, 0, 1.8, 1.8, 1, 0.55, 0.5, gold, 'issue-hot-replica')
    } else if (stage === 4) {
      for (let k = 0; k < 4; k++)
        box(
          stage,
          (k - 1.5) * 0.85,
          0.7,
          -0.9,
          0.65,
          0.3,
          0.5,
          blue,
          'issue-draft-token',
        )
      for (let k = 0; k < 5; k++)
        box(
          stage,
          (k - 2) * 0.7,
          0.7,
          0.9,
          0.5,
          0.3,
          0.5,
          green,
          'issue-accepted-token',
        )
      box(stage, 0, 1.6, 0, 3.7, 0.18, 0.7, gold, 'issue-verifier')
    } else if (stage === 5) {
      for (let k = 0; k < 16; k++)
        box(
          stage,
          ((k % 8) - 3.5) * 0.45,
          0.75,
          Math.floor(k / 8) * 1.4 - 0.7,
          0.3,
          0.75,
          1,
          c,
          'issue-weight-bit',
        )
      grid('issue-scale-metadata', 8, 4, 1.5, 0.12, gold)
    } else if (stage === 6) {
      grid('issue-rollout-sample', 16, 4, 0.65, 0.45, blue)
      box(stage, 1.8, 1.25, 0, 0.5, 0.45, 1.6, gold, 'issue-reward-verifier')
      for (let k = 0; k < 6; k++)
        box(stage, 0, 1.1 + k * 0.16, 0, 2.8, 0.065, 2.2, c, 'issue-learner')
      for (let k = 0; k < 8; k++)
        box(
          stage,
          (k - 3.5) * 0.45,
          2.2,
          0,
          0.28,
          0.15,
          0.9,
          gold,
          'issue-publication',
        )
    } else if (stage === 7) {
      for (let node = 0; node < 16; node++) {
        const x = ((node % 4) - 1.5) * 1.12,
          z = (Math.floor(node / 4) - 1.5) * 1.08
        box(stage, x, 0.4, z, 1.02, 0.13, 0.92, '#3d5667', 'issue-node-chassis')
        for (let gpu = 0; gpu < 8; gpu++)
          box(
            stage,
            x + ((gpu % 4) - 1.5) * 0.22,
            0.62,
            z + (Math.floor(gpu / 4) - 0.5) * 0.36,
            0.17,
            0.22,
            0.27,
            blue,
            'issue-free-gpu',
          )
      }
    } else if (stage === 8) {
      grid('issue-training-rank', 16, 4, 0.7, 0.5, blue)
      for (let k = 0; k < 8; k++)
        box(
          stage,
          -0.9 + (k % 2) * 1.8,
          1.2 + Math.floor(k / 2) * 0.18,
          0,
          1.4,
          0.08,
          2,
          gold,
          'issue-checkpoint-state',
        )
    } else {
      grid('issue-tenant-scope', 16, 4, 0.7, 0.6, blue)
      grid('issue-private-cache', 16, 4, 1.5, 0.14)
      box(stage, 0, 1.5, 0, 3.6, 0.14, 3.3, gold, 'issue-shared-cache')
    }
  }
  private updateIssue(view: IssueView, phase: number) {
    const changed = this.issueSnapshot !== view
    if (!changed && view.stage !== 8) return
    if (changed) {
      this.issueSnapshot = view
      this.issueCalculation = issueResults(view)
    }
    const topic = hotIssues[view.stage],
      m = this.issueCalculation!,
      p = view.inputs,
      active = view.applied
    const palette = ['#a2c3e5', '#b6d39b', '#c9a7e5', '#dfbd90'].map(
      (c) => new THREE.Color(c),
    )
    for (const mesh of this.pickable) {
      if (mesh.userData.exampleStage !== view.stage) continue
      const role = mesh.userData.role,
        material = mesh.material as THREE.MeshStandardMaterial,
        max = mesh.instanceMatrix.count
      material.emissive.set(topic.color)
      material.emissiveIntensity = 0.1
      if (role === 'issue-power-load') {
        mesh.scale.y = Math.min(1.5, 0.35 + m.pressure * 0.55)
        material.color.set(m.pressure > 1 ? '#d99588' : '#afc997')
      }
      if (role === 'issue-cache-page') {
        mesh.count = m.visualCount
        material.color.set(m.pressure > 1 ? '#c19c8c' : topic.color)
      }
      if (role === 'issue-handoff-copy') mesh.count = Math.min(max, p.streams)
      if (role === 'issue-expert') {
        const items = mesh.userData.issueItems as Tile[]
        const hot = (p.tokens * p.skew) / 100 / (active ? 2 : 1)
        const background = (p.tokens * 2 - (p.tokens * p.skew) / 100) / 15
        items.forEach((item, i) => {
          const height = 0.18 + (1.5 * (i === 0 ? hot : background)) / p.tokens
          this.matrix.compose(
            this.point.set(item.x, 0.4 + height / 2, item.z),
            this.rotation.identity(),
            this.scale.set(item.w, height, item.d),
          )
          mesh.setMatrixAt(i, this.matrix)
          mesh.setColorAt(
            i,
            i === 0
              ? new THREE.Color(active ? '#d6c48c' : '#d48d88')
              : palette[0],
          )
        })
        mesh.instanceMatrix.needsUpdate = true
        mesh.computeBoundingSphere()
      }
      if (role === 'issue-hot-replica') {
        mesh.visible = active
        const height = 0.18 + (1.5 * p.skew) / 200
        const item = (mesh.userData.issueItems as Tile[])[0]
        this.matrix.compose(
          this.point.set(item.x, 1.6 + height / 2, item.z),
          this.rotation.identity(),
          this.scale.set(item.w, height, item.d),
        )
        mesh.setMatrixAt(0, this.matrix)
        mesh.instanceMatrix.needsUpdate = true
        mesh.computeBoundingSphere()
      }
      if (role === 'issue-draft-token') mesh.visible = active
      if (role === 'issue-accepted-token') {
        mesh.count = active ? 5 : 1
        for (let i = 0; i < mesh.count; i++)
          mesh.setColorAt(
            i,
            new THREE.Color('#b0797b').lerp(
              palette[1],
              (p.acceptance / 100) ** i,
            ),
          )
      }
      if (role === 'issue-verifier')
        material.color.set(
          m.candidate > m.baseline && active ? '#d28d83' : '#dfc58d',
        )
      if (role === 'issue-weight-bit') mesh.count = active ? p.bits : 16
      if (role === 'issue-scale-metadata') mesh.visible = active
      if (role === 'issue-rollout-sample') mesh.count = p.group
      if (role === 'issue-publication') {
        mesh.scale.z = active ? 0.08 : 1
        mesh.position.z = this.positions[6][1] * (1 - mesh.scale.z)
      }
      if (role === 'issue-node-chassis') mesh.count = p.nodes
      if (role === 'issue-free-gpu') {
        mesh.count = p.nodes * 8
        const free = p.nodes * p.free
        for (let i = 0; i < mesh.count; i++)
          mesh.setColorAt(
            i,
            (active ? i < free : i % 8 < p.free)
              ? palette[1]
              : new THREE.Color('#495c70'),
          )
      }
      if (role === 'issue-training-rank')
        for (let i = 0; i < max; i++)
          mesh.setColorAt(
            i,
            i === 0 && phase % 1 > 0.25 && phase % 1 < 0.65
              ? new THREE.Color('#d38782')
              : palette[0],
          )
      if (role === 'issue-checkpoint-state')
        mesh.count = Math.min(max, Math.ceil(3600 / m.amount))
      if (role === 'issue-tenant-scope' || role === 'issue-private-cache') {
        mesh.count = p.tenants
        if (role === 'issue-private-cache') mesh.visible = active
        for (let i = 0; i < mesh.count; i++)
          mesh.setColorAt(
            i,
            active
              ? new THREE.Color().setHSL((i * 0.61803398875) % 1, 0.3, 0.65)
              : palette[0],
          )
      }
      if (role === 'issue-shared-cache') mesh.visible = !active
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
    ;(this.ring.material as THREE.MeshBasicMaterial).color.set(topic.color)
    ;(this.packets.material as THREE.MeshBasicMaterial).color.set(topic.color)
    this.routeMaterials[view.stage].color.set(topic.color)
  }

  private buildLifecycle(
    i: number,
    box: (
      stage: number,
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: string,
      role?: string,
    ) => void,
  ) {
    const blue = '#9ac5e8',
      violet = '#c7a2e5',
      green = '#b9d49b',
      gold = '#e1c88b'
    const grid = (
      role: string,
      n: number,
      color: string,
      y = 0.65,
      h = 0.35,
      columns = 4,
      zOffset = 0,
    ) => {
      for (let k = 0; k < n; k++)
        box(
          i,
          ((k % columns) - (columns - 1) / 2) * (columns > 4 ? 0.52 : 0.9),
          y,
          (Math.floor(k / columns) - (Math.ceil(n / columns) - 1) / 2) *
            (Math.ceil(n / columns) > 4 ? 0.5 : 0.8) +
            zOffset,
          columns > 4 ? 0.43 : 0.67,
          h,
          Math.ceil(n / columns) > 4 ? 0.41 : 0.57,
          color,
          role,
        )
    }
    const layers = (role: string, color: string, n = 8) => {
      for (let k = 0; k < n; k++)
        box(i, 0, 0.5 + k * 0.19, 0, 3.3, 0.075, 2.4, color, role)
    }
    if (this.model.kind === 'lifecycle-pretrain') {
      if (i === 0) {
        grid('corpus-shard', 12, blue, 0.65, 0.45)
        for (let k = 0; k < 16; k++)
          box(
            i,
            ((k % 8) - 3.5) * 0.43,
            1.3,
            Math.floor(k / 8) * 0.45 - 0.2,
            0.32,
            0.09,
            0.3,
            green,
            'token-id',
          )
      } else if (i === 1) {
        grid('dp-replica', 16, blue)
        for (let k = 0; k < 8; k++)
          box(i, (k - 3.5) * 0.5, 1.25, -1.65, 0.36, 0.25, 0.4, gold, 'tp-rank')
        for (let k = 0; k < 8; k++)
          box(i, 0, 1.65 + k * 0.13, 0.4, 3.5, 0.06, 1.9, violet, 'pp-stage')
      } else if (i === 2) {
        layers('forward-layer', blue)
        grid('activation-tile', 16, green, 2.1, 0.08)
      } else if (i === 3) {
        layers('backward-layer', violet)
        grid('saved-activation', 16, blue, 2.1, 0.15)
      } else if (i === 4) {
        grid('gradient-shard', 8, violet, 0.65, 0.35)
        for (let k = 0; k < 3; k++)
          box(i, (k - 1) * 1.2, 1.6, 0, 0.9, 1.2, 2.8, gold, 'optimizer-state')
      } else {
        grid('checkpoint-shard', 12, gold, 0.85, 0.8)
        box(i, -0.7, 1.75, 0, 1, 0.2, 1.7, blue, 'serving-artifact')
        box(i, 0.7, 1.75, 0, 1, 0.2, 1.7, green, 'serving-artifact')
      }
    } else if (this.model.kind === 'lifecycle-posttrain') {
      const grpo = this.model.id.endsWith(':grpo'),
        dpo = this.model.id.endsWith(':dpo')
      if (i === 0) {
        grid('prompt-data', 8, blue, 0.6, 0.2)
        grid(
          dpo ? 'rejected-data' : 'response-data',
          8,
          dpo ? gold : violet,
          1.1,
          0.2,
        )
      } else if (i === 1) {
        layers('frozen-base', blue)
        for (let k = 0; k < 8; k++)
          box(
            i,
            1.85,
            0.5 + k * 0.19,
            0,
            0.18,
            0.09,
            2.4,
            violet,
            'adapter-layer',
          )
        if (grpo) grid('rollout-replica', 8, green, 2.3, 0.3)
        if (dpo) box(i, -1.9, 1.1, 0, 0.18, 1.5, 2.4, gold, 'reference-policy')
      } else if (i === 2 && grpo) grid('rollout-sample', 16, blue, 1.0, 1.0)
      else if (i === 2 && dpo) {
        for (let k = 0; k < 4; k++)
          box(
            i,
            (k - 1.5) * 1.05,
            1,
            0,
            0.75,
            1.25,
            2.5,
            k < 2 ? violet : blue,
            'pair-score',
          )
      } else if (i === 2) {
        grid('teacher-token', 12, blue, 0.65, 0.3)
        grid('response-mask', 4, violet, 1.2, 0.15)
      } else if (i === 3 && grpo) grid('reward-sample', 16, gold, 0.8, 0.5)
      else if (i === 3) {
        grid('loss-target', dpo ? 2 : 8, violet, 0.8, 0.7, dpo ? 2 : 4)
        box(i, 0, 1.6, 0, 2, 0.18, 1.6, gold, 'loss-scalar')
      } else if (i === 4) {
        layers('policy-layer', violet)
        grid('policy-gradient', 8, gold, 2.1, 0.12)
      } else {
        grid('published-policy', 8, green, 0.65, 0.4)
        box(i, 0, 1.6, 0, 2.4, 0.25, 2.4, violet, 'policy-version')
      }
    } else {
      if (i === 0) layers('serving-weights', blue, 10)
      else if (i === 1) {
        grid('independent-replica', 16, blue, 0.8, 0.65)
        grid('queued-request', 8, gold, 1.7, 0.12)
      } else if (i === 2) {
        grid('prefill-token', 16, blue, 0.65, 0.22)
        grid('prefill-kv', 16, green, 1.2, 0.2)
      } else if (i === 3) {
        grid('kv-page', 64, green, 0.65, 0.4, 8)
        for (let k = 0; k < 8; k++)
          box(i, (k - 3.5) * 0.5, 1.4, -1.7, 0.3, 0.25, 0.3, gold, 'new-token')
      } else if (i === 4) {
        for (let k = 0; k < 16; k++)
          box(
            i,
            ((k % 4) - 1.5) * 0.9,
            0.8,
            Math.floor(k / 4) * 0.8 - 1.2,
            0.6,
            0.5,
            0.55,
            green,
            'kv-handoff',
          )
        for (let k = 0; k < 8; k++)
          box(i, (k - 3.5) * 0.5, 1.7, 0, 0.3, 0.25, 0.3, gold, 'stream-token')
        box(i, 0, 0.65, 0, 3.2, 0.4, 2.8, blue, 'local-state')
      } else {
        layers('warm-weights', blue)
        grid('retiring-kv', 16, green, 2.4, 0.15)
      }
    }
  }
  private updateLifecycle(view: LifecycleView, phase: number) {
    const p = view.inputs,
      m = lifecycleMetrics(p)
    const forward = new THREE.Color('#9ac5e8'),
      backward = new THREE.Color('#c7a2e5'),
      gold = new THREE.Color('#e1c88b'),
      green = new THREE.Color('#b9d49b')
    if (
      !this.pipeline ||
      this.pipeline.length !== p.pp ||
      this.pipeline[0].length !== 2 * (p.pp + p.accumulation - 1)
    )
      this.pipeline = pipelineSchedule(p.pp, p.accumulation)
    const schedule = this.pipeline
    const tick = Math.min(schedule[0].length - 1, p.scheduleSlot)
    for (const mesh of this.pickable) {
      const role = mesh.userData.role
      const max = mesh.instanceMatrix.count
      const material = mesh.material as THREE.MeshStandardMaterial
      const selected = mesh.userData.exampleStage === view.stage
      material.emissive.set(selected ? this.model.color : '#000000')
      material.emissiveIntensity = selected ? 0.08 : 0
      if (
        role === 'forward-layer' ||
        role === 'backward-layer' ||
        role === 'policy-layer'
      ) {
        const cursor = Math.min(max - 1, Math.floor((phase % 1) * max))
        for (let k = 0; k < max; k++)
          mesh.setColorAt(
            k,
            selected &&
              k === (role === 'backward-layer' ? max - 1 - cursor : cursor)
              ? gold
              : role === 'forward-layer'
                ? forward
                : backward,
          )
      }
      if (role === 'dp-replica') mesh.count = Math.min(max, p.dp)
      if (role === 'tp-rank') mesh.count = p.tp
      if (role === 'pp-stage') {
        mesh.count = p.pp
        for (let k = 0; k < mesh.count; k++)
          mesh.setColorAt(
            k,
            schedule[k][tick].kind === 'backward'
              ? backward
              : schedule[k][tick].kind === 'forward'
                ? forward
                : new THREE.Color('#536878'),
          )
      }
      if (role === 'saved-activation') mesh.count = p.checkpoint ? 4 : 16
      if (role === 'optimizer-state') {
        const fraction = m.state / m.states[0].bytes
        mesh.scale.y = 0.15 + 0.85 * fraction
        mesh.position.y = 0.4 * (1 - mesh.scale.y)
      }
      if (role === 'rollout-sample' || role === 'reward-sample') {
        mesh.count = p.group
        for (let k = 0; k < mesh.count; k++)
          mesh.setColorAt(
            k,
            role === 'reward-sample'
              ? p.equalRewards
                ? gold
                : k < p.group / 2
                  ? forward
                  : green
              : forward,
          )
      }
      if (role === 'rollout-replica')
        mesh.count = Math.min(max, p.rolloutReplicas)
      if (role === 'adapter-layer') {
        mesh.visible = p.tuning === 'lora'
        mesh.scale.x = p.rank / 16
        mesh.position.x =
          this.positions[1][0] * (1 - mesh.scale.x) + 1.85 * (1 - mesh.scale.x)
      }
      if (role === 'frozen-base')
        material.color.copy(p.tuning === 'full' ? backward : forward)
      if (role === 'independent-replica') mesh.count = Math.min(max, m.replicas)
      if (role === 'queued-request') mesh.count = Math.min(max, p.batch)
      if (role === 'kv-page' || role === 'prefill-kv') {
        // Bounded glyph occupancy; true byte capacity is printed in the HUD/lab.
        const occupancy = Math.min(
          1,
          (p.prompt + (role === 'kv-page' ? p.output * (phase % 1) : 0)) / 4096,
        )
        mesh.count = Math.max(1, Math.ceil(max * occupancy))
      }
      if (role === 'kv-handoff') {
        mesh.visible = p.disaggregated
        mesh.position.y = selected ? Math.sin(phase * Math.PI) * 0.8 : 0
      }
      if (role === 'local-state') mesh.visible = !p.disaggregated
      if (role === 'retiring-kv')
        mesh.count = selected ? Math.ceil(max * (1 - (phase % 1))) : max
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }
  }
  update(
    view: ExampleView | LifecycleView | IssueView,
    phase: number,
    quality: EffectsQuality = 'balanced',
    reduced = false,
  ) {
    const stage = view.stage
    if (phase >= this.lastPhase)
      this.signalClock +=
        (phase - this.lastPhase) * (this.model.kind === 'issues' ? 5 : 3)
    this.lastPhase = phase
    this.signals.begin(this.signalClock, quality, reduced)
    const activeRoute =
      'phase' in view && view.phase === 'pretrain' && stage === 3 ? 2 : stage
    if (stage !== this.lastStage) {
      this.ring.position.set(
        this.positions[stage][0],
        0.29,
        this.positions[stage][1],
      )
      this.signals.pulse(
        this.ring.position,
        this.model.kind === 'issues'
          ? hotIssues[stage].color
          : this.model.color,
        2.2,
      )
      this.routeMaterials.forEach(
        (m, i) => (m.opacity = i === activeRoute ? 0.95 : 0.18),
      )
      this.lastStage = stage
    }
    if ('phase' in view) this.updateLifecycle(view, phase)
    else if (view.id === 'hot-issues') this.updateIssue(view, phase)
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
        else
          this.routes[
            'phase' in view && view.phase === 'pretrain' && stage === 3
              ? 2
              : stage
          ].getPoint(
            'phase' in view && view.phase === 'pretrain' && stage === 3
              ? 1 - t
              : t,
            this.point,
          )
        if (this.model.kind === 'duplex') this.tangent.set(0, 0, lane ? 1 : -1)
        else {
          this.routes[activeRoute].getTangent(
            'phase' in view && view.phase === 'pretrain' && stage === 3
              ? 1 - t
              : t,
            this.tangent,
          )
          if ('phase' in view && view.phase === 'pretrain' && stage === 3)
            this.tangent.multiplyScalar(-1)
        }
        this.rotation.setFromUnitVectors(this.forward, this.tangent.normalize())
        this.matrix.compose(
          this.point,
          this.rotation,
          this.scale.set(0.14, 0.14, 0.28),
        )
        this.packets.setMatrixAt(lane * 12 + k, this.matrix)
        this.signals.head(
          this.point,
          new THREE.Color(
            this.model.kind === 'issues'
              ? hotIssues[stage].color
              : this.model.color,
          ),
          lane ? 0.75 : 1,
        )
      }
    this.packets.instanceMatrix.needsUpdate = true
    this.signals.end()
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
      'resolution' in view.inputs &&
      view.inputs.resolution !== this.lastResolution
    ) {
      const factor = 0.45 + (view.inputs.resolution / 2048) * 0.55
      this.pickable
        .filter((m) => m.userData.exampleStage === 5)
        .forEach((m) => {
          m.scale.setScalar(factor)
          m.position.set(
            (1 - factor) * this.positions[5][0],
            0,
            (1 - factor) * this.positions[5][1],
          )
        })
      this.lastResolution = view.inputs.resolution
    }
    if (this.model.kind === 'tts' && 'hop' in view.inputs)
      this.pickable
        .filter((m) => m.userData.tokenGrid)
        .forEach((m) => (m.count = 'hop' in view.inputs ? view.inputs.hop : 25))
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
