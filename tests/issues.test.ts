import test from 'node:test'
import assert from 'node:assert/strict'
import {
  hotIssues,
  issueById,
  issueSources,
  issuesReviewed,
} from '../src/issues/catalog.ts'
import type { IssueId } from '../src/issues/catalog.ts'
import {
  clearIssueParams,
  defaultIssueInputs,
  defaultIssueView,
  issueResults,
  issueUrl,
  parseIssueLocation,
  sanitizeIssueInputs,
  selectIssue,
} from '../src/issues/model.ts'
const view = (
  id: IssueId,
  applied = false,
  inputs: Record<string, number> = {},
) => ({
  ...defaultIssueView(),
  stage: hotIssues.findIndex((i) => i.id === id),
  applied,
  inputs: { ...defaultIssueInputs(id), ...inputs },
})
const near = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < Math.max(1, Math.abs(b)) * 1e-10, `${a} != ${b}`)

test('the ten-issue editorial record connects every claim to dated primary sources and current code snapshots', () => {
  assert.equal(hotIssues.length, 10)
  assert.equal(new Set(hotIssues.map((i) => i.id)).size, 10)
  assert.equal(Object.keys(issueSources).length, 18)
  assert.equal(issuesReviewed, '2026-11-05')
  for (const topic of hotIssues) {
    assert.ok(
      topic.whyHot.length > 70 &&
        topic.tradeoff.length > 70 &&
        topic.animation.length > 70,
    )
    for (const id of topic.sources)
      assert.ok(issueSources[id]?.supports.length > 40)
  }
  for (const source of Object.values(issueSources)) {
    assert.ok(source.date && source.org)
    assert.equal(new URL(source.url).protocol, 'https:')
    if (source.url.includes('github.com'))
      assert.match(source.url, /\/blob\/[a-f0-9]{40}\//)
  }
  assert.match(issueSources.iea.supports, /all.data.centre/)
  assert.match(issueSources.fp4.supports, /does not reproduce NVFP4/)
  assert.match(issueSources.resilience.date, /experimental/)
  assert.equal(issueById('not-a-topic'), undefined)
})

test('power and cooling impose independent caps and a PUE assumption does not erase GPU IT heat', () => {
  const a = issueResults(view('power')),
    b = issueResults(view('power', true))
  assert.equal(a.amount, 120)
  near(b.amount, 110)
  assert.equal(a.visualCount, 20)
  assert.match(a.metrics[1].value, /83,333/)
  assert.match(b.metrics[1].value, /90,909/)
  assert.equal(a.metrics[2].value, b.metrics[2].value)
  const limited = issueResults(
    view('power', true, { supply: 200, cooling: 20 }),
  )
  assert.equal(limited.metrics[1].value, '20,000 GPUs')
  assert.equal(limited.metrics[2].value, '100 MW')
})

test('KV precision halves payload and doubles ideal admission without deleting retained positions', () => {
  const a = issueResults(view('kv-memory')),
    b = issueResults(view('kv-memory', true))
  assert.equal(a.amount, 160 * 2 ** 30)
  assert.equal(b.amount, 80 * 2 ** 30)
  assert.equal(a.metrics[1].value, '32 / 64')
  assert.equal(b.metrics[1].value, '64 / 64')
  assert.equal(a.metrics[2].value, '524,288')
  assert.equal(b.metrics[2].value, a.metrics[2].value)
  assert.equal(
    issueResults(view('kv-memory', false, { context: 16384 })).amount,
    a.amount * 2,
  )
})

test('P/D wire floors account for concurrent state bytes sharing one endpoint', () => {
  const a = issueResults(view('disaggregation')),
    b = issueResults(view('disaggregation', true))
  assert.equal(a.amount, 10 * 2 ** 30)
  assert.equal(b.amount, a.amount)
  near(a.baseline, ((10 * 2 ** 30) / ((100e9 / 8) * 0.7)) * 1000)
  near(a.candidate, a.baseline / 2)
  near(
    issueResults(view('disaggregation', false, { streams: 8 })).baseline,
    a.baseline * 2,
  )
  assert.equal(a.metrics[0].value, '2.5 GiB')
})

test('distinct top-2 MoE routing never sends one token twice to the same logical expert', () => {
  const a = issueResults(view('moe')),
    b = issueResults(view('moe', true))
  assert.equal(a.amount, 32 * 2 ** 20)
  assert.equal(b.amount, a.amount)
  assert.equal(a.baseline, 820)
  assert.equal(a.candidate, 410)
  for (let skew = 0; skew <= 100; skew += 5) {
    const m = issueResults(view('moe', false, { skew }))
    assert.ok(m.baseline <= 1024)
    assert.ok(m.candidate <= m.baseline)
    assert.ok(m.candidate >= Math.ceil(2048 / 17))
    assert.equal(m.metrics[0].value, '2,048')
  }
})

test('speculative decode can lose with zero acceptance, and expected advance is bounded by five', () => {
  const zero = issueResults(view('reasoning', true, { acceptance: 0 }))
  assert.equal(zero.metrics[1].value, '29 ms')
  assert.ok(zero.candidate > zero.baseline)
  assert.match(zero.note, /slower/)
  const full = issueResults(view('reasoning', true, { acceptance: 100 }))
  assert.equal(full.metrics[2].value, '5 tokens')
  near(full.candidate, 500 + (4096 * 29) / 5)
  const longer = issueResults(
    view('reasoning', true, { output: 8192, acceptance: 100 }),
  )
  near(longer.candidate - 500, (full.candidate - 500) * 2)
})

test('generic packed weight storage charges declared metadata separately and makes no throughput inference', () => {
  const m = issueResults(view('precision', true))
  assert.equal(m.baseline, 140e9)
  assert.equal(m.candidate, 35e9 + Math.ceil(70e9 / 32) * 4)
  const wide = issueResults(view('precision', true, { bits: 8 }))
  assert.equal(wide.candidate - m.candidate, 35e9)
  assert.match(m.metrics[0].note, /not an NVFP4/)
})

test('online RL publication costs change independently of rollout count and token work', () => {
  const a = issueResults(view('rl')),
    b = issueResults(view('rl', true))
  assert.equal(a.baseline, 560e9)
  assert.equal(b.amount, 320 * 2 ** 20)
  assert.equal(a.metrics[0].value, '128')
  assert.equal(a.metrics[1].value, '131,072')
  assert.equal(a.metrics[1].value, b.metrics[1].value)
  const bigger = issueResults(view('rl', true, { group: 16 }))
  assert.equal(bigger.metrics[0].value, '256')
  assert.equal(bigger.amount, b.amount)
})

test('ideal fleet compaction conserves free GPUs and its local group bound matches exhaustive homogeneous packing', () => {
  const a = issueResults(view('placement')),
    b = issueResults(view('placement', true))
  assert.equal(a.metrics[1].value, '0')
  assert.equal(b.metrics[1].value, '2')
  for (let nodes = 2; nodes <= 16; nodes++)
    for (let free = 1; free <= 8; free++)
      for (const gang of [2, 4, 8]) {
        const m = issueResults(view('placement', true, { nodes, free, gang }))
        let slots = nodes * free,
          groups = 0
        for (let node = 0; node < nodes; node++) {
          const onNode = Math.min(8, slots)
          groups += Math.floor(onNode / gang)
          slots -= onNode
        }
        assert.equal(m.candidate, groups)
        assert.equal(m.amount, nodes * free)
        assert.ok(m.candidate * gang <= m.amount)
        assert.ok(m.candidate >= m.baseline)
      }
})

test('checkpoint interval optimization reduces first-order waste while increasing rework at the default assumptions', () => {
  const a = issueResults(view('reliability')),
    b = issueResults(view('reliability', true))
  near(a.baseline, 0.10625)
  near(b.amount, Math.sqrt(2 * 30 * 12 * 3600))
  assert.ok(b.candidate < a.baseline && b.amount > a.amount)
  const lessFrequentFailure = issueResults(
    view('reliability', true, { mtbf: 48 }),
  )
  near(lessFrequentFailure.amount, b.amount * 2)
  for (let interval = 5; interval <= 60; interval += 5)
    assert.ok(
      issueResults(view('reliability', false, { interval })).baseline + 1e-12 >=
        b.candidate,
    )
})

test('server-scoped cache isolation explicitly charges lost cross-tenant reuse without inventing attack probabilities', () => {
  const a = issueResults(view('isolation')),
    b = issueResults(view('isolation', true))
  assert.equal(a.amount, 72)
  assert.equal(b.amount, 128)
  assert.equal(b.metrics[2].value, '56')
  const noReuse = issueResults(view('isolation', false, { overlap: 0 }))
  assert.equal(noReuse.baseline, noReuse.candidate)
  assert.match(b.note, /client-selected salts alone are not authorization/)
})

test('shared issue URLs round-trip each sanitized experiment and remove other lesson families', () => {
  for (const topic of hotIssues) {
    const v = { ...view(topic.id, true), panel: 'lab' as const, playing: true }
    const url = issueUrl(
      'https://x.test/AI-Infra/?v=build&example=kimi-k3&examples=all&ex_tokens=50&stage=5&lifecycle=pretrain&lc_dp=16&hot_old=bad',
      v,
    )
    const parsed = parseIssueLocation(url)
    assert.deepEqual(parsed, { ...v, playing: false })
    const q = new URL(url).searchParams
    for (const k of [
      'example',
      'examples',
      'ex_tokens',
      'stage',
      'lifecycle',
      'lc_dp',
      'hot_old',
    ])
      assert.equal(q.has(k), false)
    assert.equal(q.get('v'), 'build')
    assert.equal(new URL(url).pathname, '/AI-Infra/')
  }
  assert.equal(parseIssueLocation('https://x.test/?issue=unknown'), null)
  assert.equal(parseIssueLocation('https://x.test/?hot=all')?.panel, 'top10')
  const invalid = parseIssueLocation(
    'https://x.test/?issue=placement&hot_nodes=1000&hot_free=-9&hot_gang=7&hot_panel=unknown',
  )!
  assert.deepEqual(invalid.inputs, { nodes: 16, free: 1, gang: 8 })
  assert.equal(invalid.panel, 'brief')
  assert.equal(
    sanitizeIssueInputs('reasoning', { acceptance: 'NaN' }).acceptance,
    70,
  )
  const url = new URL(issueUrl('https://x.test/?v=kept', view('isolation')))
  clearIssueParams(url)
  assert.equal(url.searchParams.get('v'), 'kept')
  assert.equal(url.searchParams.has('issue'), false)
  const next = selectIssue(
    { ...view('kv-memory', true), playing: true },
    9,
    true,
  )
  assert.equal(next.playing, true)
  assert.equal(next.applied, false)
  assert.deepEqual(next.inputs, defaultIssueInputs('isolation'))
  assert.equal(selectIssue(next, 99).stage, 9)
  assert.equal(selectIssue(next, -100).stage, 0)
})
