import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { FlowEffects, effectsQuality } from '../src/scene/effects.ts'
import { ContextOverlay } from '../src/scene/context.ts'

test('signal heads preserve input coordinates and colors, stay bounded, and clear when disabled', () => {
  const fx = new FlowEffects(2)
  fx.begin(0, 'balanced', false)
  fx.head(new THREE.Vector3(1, 2, 3), new THREE.Color('#7bd4d6'))
  fx.head(new THREE.Vector3(4, 5, 6), new THREE.Color('#ed8e83'))
  fx.head(new THREE.Vector3(7, 8, 9), new THREE.Color('#ffffff'))
  fx.end()
  assert.equal(fx.heads.geometry.drawRange.count, 2)
  assert.deepEqual(
    Array.from(fx.heads.geometry.attributes.position.array),
    [1, 2, 3, 4, 5, 6],
  )
  fx.begin(1, 'calm', false)
  fx.end()
  assert.equal(fx.group.visible, false)
  assert.equal(fx.heads.geometry.drawRange.count, 0)
  assert.equal(effectsQuality('unknown'), 'balanced')
})

test('event rings freeze with the simulation clock, use static reduced-motion poses, and expire or reset on a backward seek', () => {
  const fx = new FlowEffects()
  fx.begin(5, 'balanced', false)
  fx.pulse(new THREE.Vector3(1, 0.2, 3), '#c6dea0', 2, 2)
  fx.begin(5.5, 'balanced', false)
  const before = new THREE.Matrix4()
  fx.rings.getMatrixAt(0, before)
  fx.begin(5.5, 'balanced', false)
  const after = new THREE.Matrix4()
  fx.rings.getMatrixAt(0, after)
  assert.deepEqual(after.elements, before.elements)
  fx.begin(5.6, 'balanced', true)
  fx.rings.getMatrixAt(0, before)
  fx.begin(5.8, 'balanced', true)
  fx.rings.getMatrixAt(0, after)
  assert.deepEqual(after.elements, before.elements)
  fx.begin(8, 'balanced', false)
  assert.equal(fx.rings.count, 0)
  fx.pulse(new THREE.Vector3(), '#ffffff')
  fx.begin(2, 'balanced', false)
  assert.equal(fx.rings.count, 0)
})

test('disposing the shared context annotation layer releases signal-point buffers and shaders', () => {
  const world = new ContextOverlay()
  let geometryDisposed = false,
    materialDisposed = false
  world.group.traverse((o) => {
    if (o instanceof THREE.Points) {
      o.geometry.addEventListener('dispose', () => {
        geometryDisposed = true
      })
      ;(o.material as THREE.Material).addEventListener('dispose', () => {
        materialDisposed = true
      })
    }
  })
  world.dispose()
  assert.equal(geometryDisposed, true)
  assert.equal(materialDisposed, true)
})
