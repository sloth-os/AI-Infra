import * as THREE from 'three'
import type { Layer, Traffic } from '../content'

export const trafficColors: Record<Traffic, string> = {
  requests: '#d3eda4',
  kv: '#b79cf4',
  collectives: '#72d4d0',
  tensors: '#e8b58b',
}
export interface SceneLabel {
  id: string
  title: string
  subtitle: string
  position: THREE.Vector3
  key?: string
  rank?: number
  stage?: number
}
export interface Box {
  position: [number, number, number]
  scale: [number, number, number]
  id: string
  role?: string
  index?: number
  stage?: number
}
export interface Architecture {
  group: THREE.Group
  labels: SceneLabel[]
  curves: THREE.CatmullRomCurve3[]
  kinds: Traffic[]
  pickable: THREE.InstancedMesh[]
  routeStages?: number[]
}
export function buildArchitecture(layer: Layer): Architecture {
  const group = new THREE.Group()
  type Label = SceneLabel
  const batches = new Map<
    string,
    { color: string; emissive: boolean; boxes: Box[] }
  >()
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    id: string,
    emissive = false,
    role?: string,
    index?: number,
  ) => {
    const key = color + emissive
    if (!batches.has(key)) batches.set(key, { color, emissive, boxes: [] })
    batches
      .get(key)!
      .boxes.push({ position: [x, y, z], scale: [w, h, d], id, role, index })
  }
  const paths: THREE.CatmullRomCurve3[] = []
  const pathsKind: Traffic[] = []
  const path = (
    from: THREE.Vector3,
    to: THREE.Vector3,
    kind: Traffic,
    lift = 0.2,
  ) => {
    const mid = from.clone().lerp(to, 0.5)
    mid.y += lift
    const curve = new THREE.CatmullRomCurve3([from, mid, to])
    const geometry = new THREE.BufferGeometry().setFromPoints(
      curve.getPoints(28),
    )
    const material = new THREE.LineBasicMaterial({
      color: trafficColors[kind],
      transparent: true,
      opacity: 0.2,
    })
    const line = new THREE.Line(geometry, material)
    line.userData.kind = kind
    group.add(line)
    paths.push(curve)
    pathsKind.push(kind)
  }
  const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
  const annotations: Label[] = []
  const label = (
    id: string,
    title: string,
    subtitle: string,
    x: number,
    y: number,
    z: number,
  ) => annotations.push({ id, title, subtitle, position: vec(x, y, z) })
  const rack = (
    x: number,
    z: number,
    color: string,
    id: string,
    height = 1.65,
  ) => {
    box(x, height / 2 + 0.2, z, 0.64, height, 0.86, '#37454b', id)
    box(x, height + 0.22, z, 0.7, 0.1, 0.92, '#53626b', id)
    box(x, 0.3, z + 0.45, 0.68, 0.12, 0.05, '#1a272c', id)
    for (let j = 0; j < 5; j++) {
      box(
        x,
        0.5 + (j * (height - 0.2)) / 5,
        z + 0.44,
        0.48,
        0.08,
        0.02,
        color,
        id,
        true,
      )
      box(
        x + 0.23,
        0.51 + (j * (height - 0.2)) / 5,
        z + 0.455,
        0.035,
        0.04,
        0.02,
        '#dcebd0',
        id,
        true,
      )
    }
  }

  if (layer === 'fleet') {
    for (let i = 0; i < 20; i++) {
      const x = ((i % 5) - 2) * 3.1
      const z = (Math.floor(i / 5) - 1.5) * 2.8 - 0.7
      const id = i % 5 < 2 ? 'prefill' : 'decode'
      const color = id === 'prefill' ? '#a48cde' : '#b3c97e'
      box(x, 0.12, z, 2.7, 0.24, 2.3, '#293a3e', id)
      box(x, 0.255, z + 1.14, 2.7, 0.025, 0.025, color, id, true)
      for (let j = 0; j < 4; j++)
        rack(
          x + ((j % 2) - 0.5) * 0.95,
          z + (Math.floor(j / 2) - 0.5) * 1.1,
          color,
          id,
          1.2 + ((i + j) % 3) * 0.22,
        )
      path(vec(0, 0.5, 6.3), vec(x, 0.35, z), 'requests', 0.3)
      if (i % 5 === 1) path(vec(x, 1.8, z), vec(x + 3.1, 1.8, z), 'kv', 0.6)
      if (i < 15) path(vec(x, 0.3, z), vec(x, 0.3, z + 2.8), 'collectives', 0.1)
    }
    box(-7.8, 0.45, 6.5, 2, 0.9, 1.4, '#6b5c83', 'gateway')
    box(-7.8, 0.92, 6.5, 1.7, 0.05, 1.1, '#c5a8e4', 'gateway', true)
    box(-3.8, 0.42, 6.5, 2.4, 0.84, 1.4, '#475d41', 'scheduler')
    for (let j = 0; j < 5; j++)
      box(
        -4.6 + j * 0.4,
        0.87,
        6.5,
        0.22,
        0.05,
        0.9,
        '#b5d18b',
        'scheduler',
        true,
      )
    box(0, 0.35, 6.3, 2.5, 0.7, 1.1, '#3f6867', 'fabric')
    box(0, 0.72, 6.3, 2.2, 0.04, 0.85, '#7cd0c2', 'fabric', true)
    for (let j = 0; j < 3; j++)
      box(6.4 + j * 0.68, 0.55, 6.5, 0.5, 1.1, 1.1, '#886b50', 'storage')
    path(vec(-7.8, 1.1, 6.5), vec(-3.8, 1.1, 6.5), 'requests', 0.1)
    path(vec(-3.8, 1.1, 6.5), vec(0, 1.1, 6.3), 'requests', 0.1)
    label('gateway', 'API gateway', 'HTTPS · streaming', -7.8, 1.5, 6.5)
    label('scheduler', 'Request router', 'Queue + cache aware', -3.8, 2.2, 6.5)
    label('prefill', 'Prefill pools', 'Compute-intensive', -4.7, 3, -4.5)
    label('decode', 'Decode pools', 'Memory-intensive', 6.2, 3, -4.5)
  } else if (layer === 'pod') {
    box(0, 0.1, 0, 17, 0.2, 12, '#243439', 'fabric')
    for (let i = 0; i < 8; i++) {
      const x = ((i % 4) - 1.5) * 3.8
      const z = (Math.floor(i / 4) - 0.5) * 5.5
      const id = i % 4 < 2 ? 'prefill' : 'decode'
      box(x, 0.25, z, 3.1, 0.2, 3.6, '#3a494b', id)
      for (let j = 0; j < 4; j++)
        rack(
          x + ((j % 2) - 0.5) * 1.3,
          z + (Math.floor(j / 2) - 0.5) * 1.6,
          id === 'prefill' ? '#a48cde' : '#b3c97e',
          id,
          2.6,
        )
      path(vec(0, 0.65, 0), vec(x, 1.5, z), 'requests', 0.7)
      path(vec(x, 2.3, z), vec(x + (i % 4 < 2 ? 3.8 : -3.8), 2.3, z), 'kv', 1)
      path(vec(x - 0.65, 2.7, z), vec(x + 0.65, 2.7, z), 'collectives', 0.15)
    }
    box(0, 0.5, 0, 14, 0.6, 0.65, '#447a79', 'fabric')
    for (let j = 0; j < 16; j++)
      box(-6 + j * 0.8, 0.85, 0, 0.3, 0.05, 0.4, '#82d9d0', 'fabric', true)
    box(-8.5, 0.5, 0, 1, 1, 2, '#6d8054', 'scheduler')
    label(
      'prefill',
      'Prefill workers',
      'Independent TP=8 replicas',
      -5.7,
      4,
      -2.75,
    )
    label('decode', 'Decode workers', 'Continuous token batches', 5.7, 4, -2.75)
    label('fabric', 'Leaf–spine fabric', 'RDMA · KV transfers', 0, 1.5, 0)
  } else if (layer === 'rack') {
    box(0, 0.22, 0, 15.5, 0.44, 10.5, '#2f4147', 'nvlink')
    box(0, 0.5, 0, 14.8, 0.12, 9.8, '#264943', 'nvlink')
    for (let i = 0; i < 8; i++) {
      const x = ((i % 4) - 1.5) * 3.5
      const z = (Math.floor(i / 4) - 0.5) * 5.5
      box(x, 0.85, z, 2.6, 0.6, 2.8, '#6b5f84', 'tensor')
      box(x, 1.35, z, 1.5, 0.4, 1.5, '#b4a0e5', 'tensor')
      for (let j = 0; j < 6; j++)
        box(x - 1 + j * 0.4, 1.8, z, 0.14, 0.5, 2.5, '#5a6870', 'hbm')
      box(x, 2.1, z, 2.65, 0.1, 2.8, '#9aadb0', 'hbm')
      path(vec(x, 1.5, z), vec(0, 1.5, 0), 'collectives', 0.2)
      path(vec(-8, 0.8, 0), vec(x, 0.8, z), 'requests', 0.1)
      if (i < 4) path(vec(x, 1, z), vec(x, 1, z + 5.5), 'kv', 0.2)
    }
    box(0, 0.9, 0, 6.5, 0.6, 1.1, '#458482', 'nvlink')
    for (let j = 0; j < 4; j++)
      box(-2.3 + j * 1.5, 1.35, 0, 0.85, 0.3, 0.8, '#77cecb', 'nvlink', true)
    box(-8, 0.9, 0, 0.8, 0.8, 2.5, '#b3a47e', 'fabric')
    label(
      'tensor',
      '8 GPU accelerators',
      'One tensor-parallel replica',
      -4.5,
      3.5,
      -2.75,
    )
    label(
      'nvlink',
      'NVSwitch interconnect',
      'Reduce · gather · synchronize',
      2,
      2.2,
      0,
    )
    label('fabric', 'Network interface', 'Scale-out / RDMA', -8, 2, 0)
  } else {
    box(0, 0.25, 0, 14, 0.5, 12, '#30534a', 'tensor')
    box(0, 0.7, 0, 11.6, 0.4, 9.7, '#67767c', 'tensor')
    box(0, 1, 0, 6.8, 0.25, 6.8, '#524c70', 'tensor')
    for (let i = 0; i < 64; i++) {
      const x = ((i % 8) - 3.5) * 0.71
      const z = (Math.floor(i / 8) - 3.5) * 0.71
      box(
        x,
        1.3,
        z,
        0.55,
        0.3,
        0.55,
        (i + Math.floor(i / 8)) % 3 ? '#a6bd78' : '#c4dc91',
        'tensor',
        true,
      )
    }
    for (let i = 0; i < 8; i++) {
      const x = i < 4 ? -4.7 : 4.7
      const z = ((i % 4) - 1.5) * 2.15
      for (let j = 0; j < 5; j++)
        box(x, 1.15 + j * 0.16, z, 1.65, 0.1, 1.4, '#a894d6', 'hbm', j === 4)
      path(vec(x, 1.4, z), vec(x < 0 ? -3 : 3, 1.4, z * 0.7), 'kv', 0.25)
      path(vec(x < 0 ? -3 : 3, 1.4, z * 0.7), vec(0, 1.6, 0), 'requests', 0.15)
    }
    for (let i = 0; i < 12; i++)
      box(-5.5 + i, 0.7, 5.5, 0.6, 0.18, 0.6, '#d1bc89', 'nvlink')
    path(vec(0, 1.3, 0), vec(0, 0.9, 5.5), 'collectives', 0.2)
    label('tensor', 'Compute die', 'Tensor cores + on-chip SRAM', 0, 2, -1)
    label(
      'hbm',
      'HBM stacks',
      'Weights · activations · KV cache',
      -4.7,
      2.8,
      1.5,
    )
    label(
      'nvlink',
      'NVLink interface',
      'Communication with peer GPUs',
      2,
      1.6,
      5.5,
    )
  }

  if (layer === 'fleet') {
    for (let user = 0; user < 3; user++) {
      const z = 3 + user * 2.3
      const color = ['#d7a4ea', '#83cfc8', '#e7b486'][user]
      box(-11.2, 0.32, z, 1.5, 0.3, 1.2, '#34474b', 'gateway')
      for (let q = 0; q < 4; q++)
        box(
          -11.7 + q * 0.32,
          0.65,
          z,
          0.18,
          0.28,
          0.66,
          color,
          'gateway',
          true,
          'request',
          user * 4 + q,
        )
      path(vec(-11.2, 0.9, z), vec(-7.8, 1.2, 6.5), 'requests', 0.9)
    }
    path(vec(7.1, 1.5, 6.5), vec(-3.8, 1.4, 6.5), 'requests', 2.2)
    path(vec(6.2, 2.4, 2.1), vec(-7.8, 1.8, 6.5), 'requests', 3.2)
    for (let i = 0; i < 12; i++)
      box(
        -5.2 + (i % 4) * 0.65,
        1.3 + Math.floor(i / 4) * 0.2,
        6.6,
        0.36,
        0.14,
        0.5,
        '#c7df91',
        'scheduler',
        true,
        'queue',
        i,
      )
    annotations.push({
      id: 'gateway',
      key: 'tenants',
      title: '3 tenants · independent sequences',
      subtitle: 'Authentication → admission → fair routing',
      position: vec(-10.5, 2.2, 3),
    })
  }
  if (layer === 'pod') {
    // Parallel lanes visualize rank-sharded state transfer, not one API packet.
    for (let shard = 0; shard < 8; shard++)
      path(
        vec(-1.9, 3.3 + shard * 0.11, -2.75),
        vec(1.9, 3.3 + shard * 0.11, -2.75),
        'kv',
        1.1,
      )
  }
  if (layer === 'rack') {
    const chunkColors = [
      '#b9a0df',
      '#91b9da',
      '#72beb6',
      '#b3c880',
      '#d5c17b',
      '#d7a783',
      '#cb98ae',
      '#9fa1d3',
    ]
    for (let rank = 0; rank < 8; rank++) {
      const x = ((rank % 4) - 1.5) * 3.5
      const z = (Math.floor(rank / 4) - 0.5) * 5.5
      for (let chunk = 0; chunk < 8; chunk++)
        box(
          x + (chunk - 3.5) * 0.26,
          2.5,
          z,
          0.19,
          0.23,
          0.55,
          chunkColors[chunk],
          'nvlink',
          true,
          'collective',
          rank * 8 + chunk,
        )
      const next = (rank + 1) % 8
      const nx = ((next % 4) - 1.5) * 3.5
      const nz = (Math.floor(next / 4) - 0.5) * 5.5
      path(vec(x, 2.9, z), vec(nx, 2.9, nz), 'collectives', 1)
      annotations.push({
        id: 'nvlink',
        key: `rank-${rank}`,
        rank,
        title: `GPU ${rank} · TP rank`,
        subtitle: '8 chunks · local contribution',
        position: vec(x, 3.4, z),
      })
    }
  }
  if (layer === 'gpu') {
    for (let bank = 0; bank < 2; bank++) {
      for (let page = 0; page < 24; page++)
        box(
          bank ? 4.7 : -4.7,
          2.35 + Math.floor(page / 8) * 0.28,
          ((page % 8) - 3.5) * 0.65,
          1.6,
          0.15,
          0.45,
          bank ? '#75cfc6' : '#b298ed',
          'hbm',
          true,
          bank ? 'cacheV' : 'cacheK',
          page,
        )
    }
    annotations.push({
      id: 'hbm',
      key: 'kv-bank',
      title: 'Paged K / V state',
      subtitle: '80 layers · 8 KV heads · BF16',
      position: vec(4.7, 4.0, -2),
    })
    annotations.push({
      id: 'tensor',
      key: 'weight-shard',
      title: '17.5 GB of model weights / rank',
      subtitle: '140 GB total ÷ tensor parallelism 8',
      position: vec(-2, 1.8, -5.4),
    })
  }

  const pickable: THREE.InstancedMesh[] = []
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
  const matrix = new THREE.Matrix4()
  for (const batch of batches.values()) {
    const material = new THREE.MeshStandardMaterial({
      color: batch.color,
      roughness: 0.55,
      metalness: 0.35,
      emissive: batch.emissive ? batch.color : '#000000',
      emissiveIntensity: batch.emissive ? 0.28 : 0,
    })
    const mesh = new THREE.InstancedMesh(
      boxGeometry,
      material,
      batch.boxes.length,
    )
    mesh.userData.ids = batch.boxes.map((b) => b.id)
    mesh.userData.boxes = batch.boxes
    mesh.userData.baseColor = batch.color
    mesh.userData.baseEmissive = batch.emissive
    batch.boxes.forEach((b, i) => {
      matrix.compose(
        new THREE.Vector3(...b.position),
        new THREE.Quaternion(),
        new THREE.Vector3(...b.scale),
      )
      mesh.setMatrixAt(i, matrix)
    })
    mesh.computeBoundingSphere()
    group.add(mesh)
    pickable.push(mesh)
  }

  return {
    group,
    labels: annotations,
    curves: paths,
    kinds: pathsKind,
    pickable,
  }
}
