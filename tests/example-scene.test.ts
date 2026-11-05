import test from 'node:test'
import assert from 'node:assert/strict'
import { ContextOverlay } from '../src/scene/context.ts'
import { contextAtLevel } from '../src/learning/infrastructure/context.ts'
import { defaultExampleInputs } from '../src/examples/model.ts'

test('K3 expert weight glyphs remain 896 logical experts with 16 selections and two shared experts on the existing pod workers', () => {
  const overlay = new ContextOverlay()
  try {
    overlay.update(
      contextAtLevel(
        {
          kind: 'model',
          view: {
            id: 'kimi-k3',
            stage: 3,
            playing: false,
            inputs: defaultExampleInputs('kimi-k3'),
          },
        },
        'pod',
      ),
      0.2,
      'balanced',
      false,
    )
    assert.equal(overlay.glyphs.count, 896)
    assert.equal(overlay.metadata.count, 2)
    assert.equal(overlay.metadata.userData.role, 'shared-expert')
    const colors = overlay.glyphs.instanceColor!.array
    const first = Array.from(colors.slice(0, 3))
    let inactive = 0
    for (let i = 0; i < 896; i++)
      if (
        Array.from(colors.slice(i * 3, i * 3 + 3)).every(
          (n, k) => n === first[k],
        )
      )
        inactive++
    assert.equal(inactive, 880)
  } finally {
    overlay.dispose()
  }
})
test('CosyVoice renders every selected hop token separately from its three-token lookahead on shared hardware', () => {
  const overlay = new ContextOverlay()
  try {
    for (const hop of [25, 50, 100]) {
      overlay.update(
        contextAtLevel(
          {
            kind: 'model',
            view: {
              id: 'cosyvoice-2',
              stage: 2,
              playing: false,
              inputs: { ...defaultExampleInputs('cosyvoice-2'), hop },
            },
          },
          'pod',
        ),
        0.2,
        'balanced',
        false,
      )
      assert.equal(overlay.glyphs.count, hop)
      assert.equal(overlay.metadata.count, 3)
      assert.equal(overlay.metadata.userData.role, 'lookahead')
    }
  } finally {
    overlay.dispose()
  }
})
