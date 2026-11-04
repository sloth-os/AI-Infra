import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Layer, Traffic } from '../content'
import { details, layerNodes } from '../content'

export interface SceneHandle {
  reset: () => void
  zoom: (direction: number) => void
}
interface Props {
  layer: Layer
  traffic: Traffic
  paused: boolean
  selected: string
  onSelect: (id: string) => void
}
interface Label {
  id: string
  title: string
  subtitle: string
  position: THREE.Vector3
}
interface Box {
  position: [number, number, number]
  scale: [number, number, number]
  id: string
}

const trafficColors: Record<Traffic, string> = {
  requests: '#d3eda4',
  kv: '#b79cf4',
  collectives: '#72d4d0',
}

export const InfrastructureScene = forwardRef<SceneHandle, Props>(
  function InfrastructureScene(props, ref) {
    const host = useRef<HTMLDivElement>(null)
    const runtime = useRef<{
      camera: THREE.OrthographicCamera
      controls: OrbitControls
      reset: () => void
    } | null>(null)
    const latest = useRef(props)
    latest.current = props
    const [fallback, setFallback] = useState(false)
    const [labels, setLabels] = useState<Label[]>([])
    const labelElements = useRef<Map<string, HTMLButtonElement>>(new Map())

    useImperativeHandle(
      ref,
      () => ({
        reset: () => runtime.current?.reset(),
        zoom: (direction) => {
          const r = runtime.current
          if (r) {
            r.camera.zoom = THREE.MathUtils.clamp(
              r.camera.zoom * (direction > 0 ? 1.2 : 1 / 1.2),
              0.55,
              3.5,
            )
            r.camera.updateProjectionMatrix()
          }
        },
      }),
      [],
    )

    useEffect(() => {
      if (!host.current) return
      const container = host.current
      let renderer: THREE.WebGLRenderer
      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        })
      } catch {
        setFallback(true)
        return
      }
      setFallback(false)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6))
      renderer.setClearColor('#172124')
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.35
      renderer.domElement.setAttribute(
        'aria-label',
        `Interactive 3D ${props.layer} infrastructure. Drag to orbit, scroll to zoom, click a component to inspect. Equivalent component buttons are below the scene.`,
      )
      renderer.domElement.setAttribute('role', 'img')
      container.prepend(renderer.domElement)

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2('#172124', 0.012)
      scene.add(new THREE.AmbientLight('#dae5e1', 1.5))
      const sun = new THREE.DirectionalLight('#e7eee7', 3.8)
      sun.position.set(-8, 18, 10)
      scene.add(sun)
      const rim = new THREE.DirectionalLight('#a995f7', 2.6)
      rim.position.set(10, 9, -10)
      scene.add(rim)
      const fill = new THREE.PointLight('#b3ec96', 70, 35)
      fill.position.set(-7, 5, 7)
      scene.add(fill)

      const camera = new THREE.OrthographicCamera(-15, 15, 10, -10, 0.1, 150)
      const cameraStart =
        props.layer === 'fleet'
          ? new THREE.Vector3(20, 22, 25)
          : new THREE.Vector3(16, 19, 22)
      camera.position.copy(cameraStart)
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 0.6, 0)
      controls.enableDamping = true
      controls.dampingFactor = 0.07
      controls.minPolarAngle = 0.2
      controls.maxPolarAngle = Math.PI / 2.15
      controls.minZoom = 0.55
      controls.maxZoom = 3.5
      controls.enablePan = true
      const reset = () => {
        camera.position.copy(cameraStart)
        camera.zoom = 1
        camera.updateProjectionMatrix()
        controls.target.set(0, 0.6, 0)
        controls.update()
      }
      runtime.current = { camera, controls, reset }

      const grid = new THREE.GridHelper(100, 100, '#70847b', '#607569')
      const gridMaterial = grid.material as THREE.Material
      gridMaterial.transparent = true
      gridMaterial.opacity = 0.12
      scene.add(grid)

      // Batch all architectural boxes by material: hundreds of objects, only a
      // handful of draw calls. Instance IDs preserve individual component picking.
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
      ) => {
        const key = color + emissive
        if (!batches.has(key)) batches.set(key, { color, emissive, boxes: [] })
        batches
          .get(key)!
          .boxes.push({ position: [x, y, z], scale: [w, h, d], id })
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
        scene.add(line)
        paths.push(curve)
        pathsKind.push(kind)
      }
      const vec = (x: number, y: number, z: number) =>
        new THREE.Vector3(x, y, z)
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

      if (props.layer === 'fleet') {
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
          if (i < 15)
            path(vec(x, 0.3, z), vec(x, 0.3, z + 2.8), 'collectives', 0.1)
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
        label(
          'scheduler',
          'Request router',
          'Queue + cache aware',
          -3.8,
          2.2,
          6.5,
        )
        label('prefill', 'Prefill pools', 'Compute-intensive', -4.7, 3, -4.5)
        label('decode', 'Decode pools', 'Memory-intensive', 6.2, 3, -4.5)
      } else if (props.layer === 'pod') {
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
          path(
            vec(x, 2.3, z),
            vec(x + (i % 4 < 2 ? 3.8 : -3.8), 2.3, z),
            'kv',
            1,
          )
          path(
            vec(x - 0.65, 2.7, z),
            vec(x + 0.65, 2.7, z),
            'collectives',
            0.15,
          )
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
        label(
          'decode',
          'Decode workers',
          'Continuous token batches',
          5.7,
          4,
          -2.75,
        )
        label('fabric', 'Leaf–spine fabric', 'RDMA · KV transfers', 0, 1.5, 0)
      } else if (props.layer === 'rack') {
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
          box(
            -2.3 + j * 1.5,
            1.35,
            0,
            0.85,
            0.3,
            0.8,
            '#77cecb',
            'nvlink',
            true,
          )
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
            box(
              x,
              1.15 + j * 0.16,
              z,
              1.65,
              0.1,
              1.4,
              '#a894d6',
              'hbm',
              j === 4,
            )
          path(vec(x, 1.4, z), vec(x < 0 ? -3 : 3, 1.4, z * 0.7), 'kv', 0.25)
          path(
            vec(x < 0 ? -3 : 3, 1.4, z * 0.7),
            vec(0, 1.6, 0),
            'requests',
            0.15,
          )
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
        batch.boxes.forEach((b, i) => {
          matrix.compose(
            new THREE.Vector3(...b.position),
            new THREE.Quaternion(),
            new THREE.Vector3(...b.scale),
          )
          mesh.setMatrixAt(i, matrix)
        })
        mesh.computeBoundingSphere()
        scene.add(mesh)
        pickable.push(mesh)
      }
      setLabels(annotations)

      const particlesCount = props.layer === 'fleet' ? 180 : 96
      const particleGeometry = new THREE.BufferGeometry()
      const particlePositions = new Float32Array(particlesCount * 3)
      particleGeometry.setAttribute(
        'position',
        new THREE.BufferAttribute(particlePositions, 3),
      )
      const particleMaterial = new THREE.PointsMaterial({
        color: trafficColors[latest.current.traffic],
        size: 3,
        transparent: true,
        opacity: 0.95,
        sizeAttenuation: false,
        depthWrite: false,
      })
      const particles = new THREE.Points(particleGeometry, particleMaterial)
      particles.frustumCulled = false
      scene.add(particles)

      const raycaster = new THREE.Raycaster()
      const pointer = new THREE.Vector2()
      let down = { x: 0, y: 0 }
      const pointerDown = (e: PointerEvent) => {
        down = { x: e.clientX, y: e.clientY }
      }
      const pick = (e: PointerEvent) => {
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return
        const rect = renderer.domElement.getBoundingClientRect()
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        )
        raycaster.setFromCamera(pointer, camera)
        const hit = raycaster.intersectObjects(pickable, false)[0]
        if (hit && hit.instanceId !== undefined)
          latest.current.onSelect(hit.object.userData.ids[hit.instanceId])
      }
      renderer.domElement.addEventListener('pointerdown', pointerDown)
      renderer.domElement.addEventListener('pointerup', pick)

      const resize = () => {
        const { width, height } = container.getBoundingClientRect()
        if (!width || !height) return
        const aspect = width / height
        const span = props.layer === 'fleet' ? 10.4 : 9.4
        camera.left = -span * aspect
        camera.right = span * aspect
        camera.top = span
        camera.bottom = -span
        camera.updateProjectionMatrix()
        renderer.setSize(width, height)
      }
      const observer = new ResizeObserver(resize)
      observer.observe(container)
      resize()
      const projected = new THREE.Vector3()
      let raf = 0,
        elapsed = 0,
        lastTime = performance.now(),
        lastMode = ''
      let visible = true
      const visibility = new IntersectionObserver((entries) => {
        visible = entries[0].isIntersecting
      })
      visibility.observe(container)
      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches
      const animate = (time: number) => {
        raf = requestAnimationFrame(animate)
        // A first RAF timestamp can precede setup's performance.now() within the
        // same frame. Never let that produce a negative curve parameter.
        const delta = Math.max(0, Math.min((time - lastTime) / 1000, 0.05))
        lastTime = time
        if (!visible) return
        if (!latest.current.paused && !reduceMotion) elapsed += delta
        controls.update()
        const mode = latest.current.traffic
        if (mode !== lastMode) {
          lastMode = mode
          particleMaterial.color.set(trafficColors[mode])
          scene.children.forEach((o) => {
            if (o instanceof THREE.Line && o.userData.kind)
              (o.material as THREE.LineBasicMaterial).opacity =
                o.userData.kind === mode ? 0.5 : 0.035
          })
        }
        const active = paths
          .map((_, i) => i)
          .filter((i) => pathsKind[i] === mode)
        for (let i = 0; i < particlesCount; i++) {
          const curve = paths[active[i % active.length]]
          if (!curve) continue
          const point = curve.getPoint(
            (elapsed * (mode === 'collectives' ? 0.26 : 0.14) +
              ((i * 0.61803398875) % 1)) %
              1,
          )
          particlePositions[i * 3] = point.x
          particlePositions[i * 3 + 1] = point.y
          particlePositions[i * 3 + 2] = point.z
        }
        particleGeometry.attributes.position.needsUpdate = true
        for (const annotation of annotations) {
          const element = labelElements.current.get(annotation.id)
          if (!element) continue
          projected.copy(annotation.position).project(camera)
          const x = (projected.x * 0.5 + 0.5) * container.clientWidth
          const y = (-projected.y * 0.5 + 0.5) * container.clientHeight
          element.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`
          element.style.opacity =
            Math.abs(projected.x) > 0.95 || Math.abs(projected.y) > 0.95
              ? '0'
              : '1'
          element.style.pointerEvents =
            element.style.opacity === '0' ? 'none' : 'auto'
        }
        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(animate)
      const contextLost = (event: Event) => {
        event.preventDefault()
        setFallback(true)
      }
      renderer.domElement.addEventListener('webglcontextlost', contextLost)
      return () => {
        cancelAnimationFrame(raf)
        observer.disconnect()
        visibility.disconnect()
        controls.dispose()
        renderer.domElement.removeEventListener('pointerdown', pointerDown)
        renderer.domElement.removeEventListener('pointerup', pick)
        renderer.domElement.removeEventListener('webglcontextlost', contextLost)
        scene.traverse((object) => {
          if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.Line ||
            object instanceof THREE.Points
          ) {
            object.geometry?.dispose()
            const materials = Array.isArray(object.material)
              ? object.material
              : [object.material]
            materials.forEach((m) => m.dispose())
          }
        })
        renderer.dispose()
        renderer.domElement.remove()
        runtime.current = null
      }
    }, [props.layer])

    return (
      <div
        ref={host}
        className={`infrastructure-scene ${fallback ? 'scene-fallback' : ''}`}
        data-testid="infrastructure-scene"
      >
        {!fallback &&
          labels.map((label) => (
            <button
              key={label.id}
              ref={(el) => {
                if (el) labelElements.current.set(label.id, el)
                else labelElements.current.delete(label.id)
              }}
              className={`scene-label ${props.selected === label.id ? 'is-selected' : ''}`}
              onClick={() => props.onSelect(label.id)}
              aria-label={`Inspect ${label.title}`}
            >
              <span
                className="scene-label-dot"
                style={{ background: details[label.id].color }}
              />
              <span>
                {label.title}
                <small>{label.subtitle}</small>
              </span>
            </button>
          ))}
        {fallback && (
          <div className="fallback-topology">
            <span className="eyebrow">INTERACTIVE TOPOLOGY · 2D FALLBACK</span>
            <h3>
              {props.layer === 'gpu'
                ? 'Inside an accelerator'
                : 'A connected serving system'}
            </h3>
            <p>
              3D rendering is unavailable on this device. Explore the same
              components below.
            </p>
            <div>
              {layerNodes[props.layer].map((id) => (
                <button
                  key={id}
                  onClick={() => props.onSelect(id)}
                  className={props.selected === id ? 'active' : ''}
                  style={{ borderColor: details[id].color }}
                >
                  {details[id].title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  },
)
