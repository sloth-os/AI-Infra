import test from 'node:test'
import assert from 'node:assert/strict'
import {
  defaultProviderLesson,
  hasPolicy,
  parseProviderLesson,
  policyMask,
  providerLessonFrame,
  providerLessonUrl,
  providerReplay,
  providerVisualKey,
  replaySnapshot,
  resourceEnvelope,
  sanitizeProviderLesson,
} from '../src/learning/provider/model.ts'
import {
  contextAtLevel,
  contextSteps,
  initialContextLevel,
  parseContextLocation,
} from '../src/learning/infrastructure/context.ts'
import { POLICIES, providerMetrics } from '../src/game/provider/model.ts'
import { ContextOverlay } from '../src/scene/context.ts'

test('paired cloud replay compares identical devices, arrivals and elapsed time through an actual successful plan', () => {
  const replay = providerReplay(255)
  assert.ok(replay.end > 18 && replay.end < 60)
  assert.equal(replay.plan.length, replay.baseline.length)
  for (let i = 0; i < replay.plan.length; i++) {
    const a = replay.baseline[i],
      b = replay.plan[i]
    assert.ok(Math.abs(a.time - b.time) < 1e-7)
    assert.equal(a.requested.serve, b.requested.serve)
    for (const s of [a, b]) {
      const m = providerMetrics(s)
      assert.ok(m.used <= 64 && m.free + m.used === 64)
      assert.ok(
        m.wireRates.every((rate) => rate <= (100e9 / 8 / 2 ** 30) * 0.7 + 1e-6),
      )
    }
  }
  const baseline = replay.baseline.at(-1)!,
    plan = replay.plan.at(-1)!
  assert.equal(baseline.completed.train, 0)
  assert.equal(baseline.completed.tune, 0)
  assert.ok(baseline.oom > 0)
  assert.ok(plan.completed.train >= 2 && plan.completed.tune >= 2)
  assert.equal(plan.oom, 0)
  assert.ok(
    plan.burstProtected && plan.burstReady !== null && plan.burstReady <= 10,
  )
})
test('clearing or removing a policy changes actual replay results rather than substituting a fixed animation', () => {
  const baseline = providerReplay(0)
  assert.equal(baseline.end, 60)
  assert.deepEqual(
    baseline.baseline.map((s) => [s.time, s.served, s.oom, s.completed.train]),
    baseline.plan.map((s) => [s.time, s.served, s.oom, s.completed.train]),
  )
  const withoutEnvelope = providerReplay(
    policyMask(POLICIES.filter((p) => p !== 'envelope')),
  ).plan.at(-1)!
  assert.equal(withoutEnvelope.completed.tune, 0)
  assert.ok(withoutEnvelope.oom > 0)
  const withoutCache = providerReplay(
    policyMask(POLICIES.filter((p) => p !== 'cache')),
  ).plan.at(-1)!
  assert.equal(withoutCache.cacheHits, 0)
})
test('all four learning viewpoints reuse real allocation glyphs and keep the lease phase separate from the camera step', () => {
  const view = { ...defaultProviderLesson(), time: 12 },
    overlay = new ContextOverlay()
  for (const [level, count] of [
    ['fleet', 64],
    ['pod', 32],
    ['rack', 8],
    ['gpu', 32],
  ] as const) {
    const selection = { kind: 'provider' as const, view },
      frame = contextAtLevel(selection, level)
    assert.equal(contextSteps(selection).length, 4)
    assert.equal(frame.kind, 'provider')
    assert.equal(frame.id, 'cloud-provider')
    assert.equal(frame.stage, ['fleet', 'pod', 'rack', 'gpu'].indexOf(level))
    assert.ok(frame.deviceBinding?.phase)
    overlay.update(frame, replaySnapshot(view).progress, 'high', true)
    assert.equal(overlay.glyphs.count, count)
    assert.ok(frame.scope.includes('same elapsed time'))
  }
  overlay.dispose()
})
test('byte/compute interpolation moves while allocation identity stays stable between samples', () => {
  const a = {
      ...defaultProviderLesson(),
      tenant: 'serve' as const,
      time: 0.05,
      playing: true,
    },
    b = { ...a, time: 0.1 }
  assert.equal(providerVisualKey(a, 'rack'), providerVisualKey(b, 'rack'))
  assert.ok(replaySnapshot(b).progress > replaySnapshot(a).progress)
  assert.equal(providerLessonFrame(a, 'fleet').playing, true)
})
test('cloud learning links preserve the Pages prefix and workspace, sanitize inputs, clear incompatible stories and reload paused', () => {
  const view = {
    ...defaultProviderLesson(),
    time: 12.34,
    stage: 2,
    tenant: 'tune' as const,
    policies: 127,
    server: 3,
    gpu: 5,
    playing: true,
  }
  const url = providerLessonUrl(
    'https://sloth-os.github.io/AI-Infra/?view=game&workspace=alpha&scenario=cloud-provider&campaign=lifecycle&example=kimi-k3&ex_batch=4&issue=power&hot_panel=lab&lifecycle=inference&lc_method=sft&level=server',
    view,
  )
  const q = new URL(url)
  assert.equal(q.pathname, '/AI-Infra/')
  assert.equal(q.searchParams.get('workspace'), 'alpha')
  assert.equal(q.searchParams.get('view'), 'explore')
  assert.equal(q.searchParams.get('learn'), 'fusion')
  for (const key of [
    'scenario',
    'campaign',
    'example',
    'ex_batch',
    'issue',
    'hot_panel',
    'lifecycle',
    'lc_method',
  ])
    assert.equal(q.searchParams.has(key), false)
  assert.deepEqual(parseProviderLesson(url), { ...view, playing: false })
  assert.equal(parseContextLocation(url)?.kind, 'provider')
  assert.equal(initialContextLevel(url), 'rack')
  assert.equal(
    parseProviderLesson('https://x.test/?scenario=cloud-provider'),
    null,
  )
  const sanitized = sanitizeProviderLesson({
    time: Infinity,
    policies: -20,
    server: 100,
    gpu: -8,
  })
  assert.equal(sanitized.time, 0)
  assert.equal(sanitized.policies, 0)
  assert.equal(sanitized.server, 7)
  assert.equal(sanitized.gpu, 0)
  assert.ok(hasPolicy(defaultProviderLesson(), 'isolation'))
  assert.equal(
    resourceEnvelope({ ...view, time: 0 }).approvedProfiles.length,
    2,
  )
})
