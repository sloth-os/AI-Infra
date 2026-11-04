import * as THREE from 'three'
import type { Architecture, Box, SceneLabel } from './architecture'
import { trafficColors } from './architecture'
import type { Traffic } from '../content'

export const tensorPositions = [
  [-7.5, -4],
  [-2.5, -4],
  [2.5, -4],
  [7.5, -4],
  [7.5, 3.5],
  [2.5, 3.5],
  [-2.5, 3.5],
  [-7.5, 3.5],
] as const
const names = [
  'Token embeddings',
  'Query · Key · Value',
  'Position + KV cache',
  'Causal attention',
  'Tensor-parallel reduce',
  'Gated MLP + residual',
  'Vocabulary logits',
  'Sample → next token',
]
const shapes = [
  '[S] → [S, 8192]',
  'Q [S,64,128] · K,V [S,8,128]',
  'RoPE(Q,K) · persist K,V',
  'softmax(QKᵀ / √d + mask) V',
  'Local partials → shared result',
  'Expand → gate → project',
  'Hidden state → vocabulary scores',
  'One ID → UTF-8 → next iteration',
]
const colors = [
  '#c5dc8e',
  '#b29ce9',
  '#76c8c0',
  '#e3b984',
  '#79cbd0',
  '#b799e6',
  '#deb18a',
  '#d2e895',
]

export function buildTensorArchitecture(): Architecture {
  const group = new THREE.Group()
  const batches = new Map<string, Box[]>()
  const labels: SceneLabel[] = []
  const curves: THREE.CatmullRomCurve3[] = []
  const kinds: Traffic[] = []
  const routeStages: number[] = []
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    id = 'tensor',
    role?: string,
    index?: number,
  ) => {
    if (!batches.has(color)) batches.set(color, [])
    let nearest = 0,
      distance = Infinity
    tensorPositions.forEach(([px, pz], i) => {
      const d = (x - px) ** 2 + (z - pz) ** 2
      if (d < distance) {
        nearest = i
        distance = d
      }
    })
    batches.get(color)!.push({
      position: [x, y, z],
      scale: [w, h, d],
      id,
      role,
      index,
      stage: nearest,
    })
  }
  tensorPositions.forEach(([x, z], stage) => {
    const color = colors[stage]
    box(x, 0.2, z, 3.7, 0.3, 3, '#2b3e44')
    box(x, 0.37, z + 1.5, 3.7, 0.035, 0.035, color)
    labels.push({
      key: `tensor-${stage}`,
      id:
        stage === 2
          ? 'hbm'
          : stage === 4
            ? 'nvlink'
            : stage === 7
              ? 'gateway'
              : 'tensor',
      title: names[stage],
      subtitle: shapes[stage],
      position: new THREE.Vector3(x, 2.85, z),
      stage,
    })
    if (stage === 0) {
      for (let i = 0; i < 32; i++)
        box(
          x + ((i % 8) - 3.5) * 0.35,
          0.65 + Math.floor(i / 8) * 0.2,
          z,
          0.22,
          0.14,
          1.6,
          color,
          'tensor',
          'embedding',
          i,
        )
    } else if (stage === 1) {
      for (let stream = 0; stream < 3; stream++)
        for (let i = 0; i < 6; i++)
          box(
            x + (stream - 1) * 0.95,
            0.65 + i * 0.18,
            z,
            0.62,
            0.1,
            1.55,
            ['#d3e597', '#b79bed', '#75cdc6'][stream],
            'tensor',
            'qkv',
            stream * 6 + i,
          )
    } else if (stage === 2) {
      for (let bank = 0; bank < 2; bank++)
        for (let i = 0; i < 16; i++)
          box(
            x + (bank - 0.5) * 1.4,
            0.65 + Math.floor(i / 4) * 0.3,
            z + ((i % 4) - 1.5) * 0.52,
            0.95,
            0.17,
            0.38,
            bank ? '#77cfc9' : '#b29aed',
            'hbm',
            bank ? 'cacheV' : 'cacheK',
            i,
          )
    } else if (stage === 3) {
      for (let row = 0; row < 8; row++)
        for (let col = 0; col < 8; col++)
          box(
            x + (col - 3.5) * 0.34,
            0.6,
            z + (row - 3.5) * 0.29,
            0.27,
            0.15,
            0.22,
            col <= row ? color : '#35484b',
            'tensor',
            col <= row ? 'attention' : 'masked',
            row * 8 + col,
          )
    } else if (stage === 4) {
      for (let rank = 0; rank < 8; rank++) {
        const angle = (rank / 8) * Math.PI * 2
        box(
          x + Math.cos(angle) * 1.2,
          0.75,
          z + Math.sin(angle) * 0.9,
          0.4,
          0.45,
          0.4,
          color,
          'nvlink',
          'rank',
          rank,
        )
        const curve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(
            x + Math.cos(angle) * 1.2,
            1,
            z + Math.sin(angle) * 0.9,
          ),
          new THREE.Vector3(x, 1.8, z),
          new THREE.Vector3(x, 0.8, z),
        ])
        curves.push(curve)
        kinds.push('tensors')
        routeStages.push(stage)
      }
      box(x, 0.9, z, 0.75, 0.45, 0.65, '#b2e0dc', 'nvlink')
    } else if (stage === 5) {
      for (let column = 0; column < 3; column++)
        for (let i = 0; i < (column === 1 ? 8 : 4); i++)
          box(
            x + (column - 1) * 1.1,
            0.65 + i * 0.18,
            z,
            0.5,
            0.11,
            1.65,
            color,
            'tensor',
            'mlp',
            column * 8 + i,
          )
    } else if (stage === 6) {
      for (let i = 0; i < 8; i++) {
        const h = [0.45, 0.82, 0.3, 1.26, 0.62, 1.75, 0.95, 0.53][i]
        box(
          x + (i - 3.5) * 0.36,
          0.45 + h / 2,
          z,
          0.24,
          h,
          1.2,
          i === 5 ? '#d3ec9d' : color,
          'tensor',
          'logit',
          i,
        )
      }
    } else {
      box(x, 1.1, z, 1.1, 1.1, 1.1, color, 'gateway', 'sample', 0)
      for (let i = 0; i < 5; i++)
        box(
          x - 1.3 + i * 0.65,
          0.5,
          z + 1,
          0.38,
          0.12,
          0.3,
          '#8dcbb5',
          'gateway',
          'output',
          i,
        )
    }
    const next = tensorPositions[(stage + 1) % 8]
    const from = new THREE.Vector3(x, 0.9, z),
      to = new THREE.Vector3(next[0], 0.9, next[1])
    const mid = from.clone().lerp(to, 0.5)
    mid.y = 2
    curves.push(new THREE.CatmullRomCurve3([from, mid, to]))
    kinds.push('tensors')
    routeStages.push(stage)
  })
  for (const [index, curve] of curves.entries()) {
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),
      new THREE.LineBasicMaterial({
        color: trafficColors.tensors,
        transparent: true,
        opacity: 0.25,
      }),
    )
    line.userData.kind = 'tensors'
    line.userData.stage = routeStages[index]
    group.add(line)
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const matrix = new THREE.Matrix4()
  const pickable: THREE.InstancedMesh[] = []
  for (const [color, boxes] of batches) {
    const material = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.35,
      roughness: 0.52,
      emissive: color,
      emissiveIntensity: color === '#2b3e44' ? 0 : 0.15,
      transparent: true,
    })
    const mesh = new THREE.InstancedMesh(geometry, material, boxes.length)
    mesh.userData = {
      ids: boxes.map((b) => b.id),
      boxes,
      baseColor: color,
      baseEmissive: color !== '#2b3e44',
    }
    boxes.forEach((b, i) => {
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
  return { group, labels, curves, kinds, pickable, routeStages }
}
