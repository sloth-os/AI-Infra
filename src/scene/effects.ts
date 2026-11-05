import * as THREE from 'three'

export type EffectsQuality = 'calm' | 'balanced' | 'cinematic'
export function effectsQuality(value: unknown): EffectsQuality {
  return value === 'calm' || value === 'cinematic' ? value : 'balanced'
}
// Radial falloff keeps packet wakes soft without a texture download or a
// full-screen bloom pass. Positions and colors still come from the real flow.
export function signalMaterial(size = 8) {
  return new THREE.ShaderMaterial({
    uniforms: { pointSize: { value: size }, intensity: { value: 1 } },
    vertexShader: `uniform float pointSize; varying vec3 signalColor;
      void main() { signalColor = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = pointSize; }`,
    fragmentShader: `uniform float intensity; varying vec3 signalColor;
      void main() { float r = length(gl_PointCoord - vec2(.5)) * 2.0;
        float halo = pow(max(0.0, 1.0-r), 2.2);
        float core = 1.0 - smoothstep(.03, .28, r);
        gl_FragColor = vec4(signalColor * intensity * (halo + core * .65), halo * .8);
        #include <colorspace_fragment>
      }`,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
}
interface Pulse {
  at: number
  x: number
  y: number
  z: number
  color: THREE.Color
  scale: number
  duration: number
}
export class FlowEffects {
  readonly group = new THREE.Group()
  readonly heads: THREE.Points
  readonly rings: THREE.InstancedMesh
  private positions: Float32Array
  private colors: Float32Array
  private count = 0
  private pulses: Pulse[] = []
  private alphas = new Float32Array(32)
  private tints = new Float32Array(32 * 3)
  private matrix = new THREE.Matrix4()
  private position = new THREE.Vector3()
  private scale = new THREE.Vector3()
  private rotation = new THREE.Quaternion()
  private clock = 0
  readonly capacity: number
  constructor(capacity = 96) {
    this.capacity = capacity
    this.positions = new Float32Array(capacity * 3)
    this.colors = new Float32Array(capacity * 3)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    this.heads = new THREE.Points(geometry, signalMaterial(13))
    this.heads.frustumCulled = false
    const ring = new THREE.RingGeometry(0.86, 1, 48)
    ring.rotateX(-Math.PI / 2)
    ring.setAttribute(
      'aAlpha',
      new THREE.InstancedBufferAttribute(this.alphas, 1).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    ring.setAttribute(
      'aTint',
      new THREE.InstancedBufferAttribute(this.tints, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    )
    this.rings = new THREE.InstancedMesh(
      ring,
      new THREE.ShaderMaterial({
        vertexShader: `attribute float aAlpha; attribute vec3 aTint; varying float opacity; varying vec3 tint;
        void main() { opacity = aAlpha; tint = aTint; gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0); }`,
        fragmentShader: `varying float opacity; varying vec3 tint;
        void main() { gl_FragColor = vec4(tint, opacity);
          #include <colorspace_fragment>
        }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
      32,
    )
    this.rings.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.rings.frustumCulled = false
    this.rings.count = 0
    this.group.add(this.heads, this.rings)
  }
  begin(
    clock: number,
    quality: EffectsQuality,
    reduced: boolean,
    pixelRatio = 1,
  ) {
    this.clock = clock
    this.count = 0
    this.group.visible = quality !== 'calm'
    const material = this.heads.material as THREE.ShaderMaterial
    material.uniforms.pointSize.value =
      (quality === 'cinematic' ? 21 : 12) * pixelRatio
    material.uniforms.intensity.value = quality === 'cinematic' ? 1.3 : 0.85
    // A seek/backwards scrub invalidates effects emitted on the old timeline.
    this.pulses = this.pulses.filter(
      (p) => clock >= p.at && clock - p.at < p.duration,
    )
    let index = 0
    for (const pulse of this.pulses) {
      const progress = reduced ? 0.48 : (clock - pulse.at) / pulse.duration
      const radius = pulse.scale * (0.35 + progress * 1.7)
      this.matrix.compose(
        this.position.set(pulse.x, pulse.y, pulse.z),
        this.rotation,
        this.scale.set(radius, 1, radius),
      )
      this.rings.setMatrixAt(index, this.matrix)
      this.alphas[index] = (1 - progress) ** 2 * 0.7
      pulse.color.toArray(this.tints, index * 3)
      index++
    }
    this.rings.count = index
    this.rings.instanceMatrix.needsUpdate = true
    this.rings.geometry.attributes.aAlpha.needsUpdate = true
    this.rings.geometry.attributes.aTint.needsUpdate = true
  }
  head(position: THREE.Vector3, color: THREE.Color, strength = 1) {
    if (this.count >= this.capacity) return
    position.toArray(this.positions, this.count * 3)
    this.colors[this.count * 3] = color.r * strength
    this.colors[this.count * 3 + 1] = color.g * strength
    this.colors[this.count * 3 + 2] = color.b * strength
    this.count++
  }
  pulse(
    position: THREE.Vector3,
    color: THREE.Color | string,
    scale = 1,
    duration = 1.5,
  ) {
    this.pulses.push({
      at: this.clock,
      x: position.x,
      y: position.y,
      z: position.z,
      color: new THREE.Color(color),
      scale,
      duration,
    })
    if (this.pulses.length > 32) this.pulses.shift()
  }
  end() {
    this.heads.geometry.setDrawRange(0, this.count)
    this.heads.geometry.attributes.position.needsUpdate = true
    this.heads.geometry.attributes.color.needsUpdate = true
  }
  clear() {
    this.pulses = []
    this.count = 0
    this.end()
    this.rings.count = 0
  }
}
