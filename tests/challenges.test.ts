import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateChallenge,
  learningChallenges,
  readChallengeProgress,
} from '../src/learning/challenges.ts'

test('every mission starts with an unmet constraint and has a valid solution within its declared infrastructure budget', () => {
  for (const c of learningChallenges) {
    assert.equal(
      evaluateChallenge(c.id, c.initial, c.strategy).pass,
      false,
      c.id,
    )
    const p = { ...c.initial }
    let strategy = c.strategy
    if (c.id === 'burst') {
      p.prefixHit = 80
      strategy = 'continuous'
    }
    if (c.id === 'context') p.batchSize = 32
    if (c.id === 'balance') p.prefillShare = 65
    if (c.id === 'handoff') p.networkGbps = 400
    assert.equal(evaluateChallenge(c.id, p, strategy).pass, true, c.id)
    for (const patch of [
      { arrivalRate: 1 },
      { inputTokens: 128 },
      { outputTokens: 1 },
      { gpus: 100000 },
      { prefixHit: c.prefixLimit + 1 },
      { networkGbps: 800 },
    ]) {
      assert.equal(
        evaluateChallenge(c.id, { ...p, ...patch }, strategy).pass,
        false,
        `${c.id} rejects ${JSON.stringify(patch)}`,
      )
    }
  }
})

test('split missions cannot be bypassed by switching architecture, and context missions expose real admission clamping', () => {
  const handoff = learningChallenges.find((c) => c.id === 'handoff')!
  assert.equal(
    evaluateChallenge(
      'handoff',
      { ...handoff.initial, networkGbps: 400 },
      'continuous',
    ).pass,
    false,
  )
  const context = learningChallenges.find((c) => c.id === 'context')!
  const r = evaluateChallenge('context', context.initial, context.strategy)
  assert.equal(r.result.stable, true)
  assert.equal(r.result.batch, 41)
  assert.equal(r.pass, false)
})

test('challenge progress accepts only known IDs and bounded integer star records', () => {
  assert.deepEqual(
    readChallengeProgress(
      '{"burst":3,"context":1,"balance":99,"handoff":1.5,"invented":3}',
    ),
    { burst: 3, context: 1 },
  )
  assert.deepEqual(readChallengeProgress('[]'), {})
  assert.deepEqual(readChallengeProgress('bad-json'), {})
  assert.deepEqual(readChallengeProgress(null), {})
})
