import test from 'node:test'
import assert from 'node:assert/strict'
import { ExampleWorld } from '../src/scene/examples.ts'
import { defaultExampleInputs } from '../src/examples/model.ts'

test('the K3 world renders 896 routed expert tiles, 16 illustrative selections, and two separate shared experts', () => {
  const world = new ExampleWorld('kimi-k3')
  try {
    const count = (role: string) =>
      world.pickable
        .filter((mesh) => mesh.userData.role === role)
        .reduce((n, mesh) => n + mesh.count, 0)
    assert.equal(count('routed-selected'), 16)
    assert.equal(count('routed-inactive'), 880)
    assert.equal(count('shared-expert'), 2)
    assert.equal(world.labels.length, 6)
  } finally {
    world.dispose()
  }
})

test('CosyVoice chunk changes render the exact speech-token count without counting the platform accent or lookahead', () => {
  const world = new ExampleWorld('cosyvoice-2')
  try {
    const tokens = world.pickable.find(
      (mesh) => mesh.userData.role === 'speech-tokens',
    )!
    const lookahead = world.pickable.find(
      (mesh) => mesh.userData.role === 'lookahead',
    )!
    for (const hop of [25, 50, 100]) {
      world.update(
        {
          id: 'cosyvoice-2',
          stage: 2,
          playing: false,
          inputs: { ...defaultExampleInputs('cosyvoice-2'), hop },
        },
        0.5,
      )
      assert.equal(tokens.count, hop)
      assert.equal(lookahead.count, 3)
    }
  } finally {
    world.dispose()
  }
})
