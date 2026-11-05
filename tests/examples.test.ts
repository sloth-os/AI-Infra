import test from 'node:test'
import assert from 'node:assert/strict'
import {
  exampleSources,
  findExample,
  modelExamples,
  sourcesForExample,
} from '../src/examples/catalog.ts'
import {
  defaultExampleInputs,
  exampleBudgets,
  examplePayload,
  exampleStage,
  exampleUrl,
  parseExampleLocation,
  sanitizeExampleInputs,
} from '../src/examples/model.ts'

test('all six requested checkpoints have distinct, sourced pipelines and deployment evidence', () => {
  assert.equal(modelExamples.length, 6)
  assert.equal(new Set(modelExamples.map((e) => e.kind)).size, 6)
  assert.equal(findExample('minimax-h3')!.kind, 'video')
  assert.equal(
    findExample('minimax-music-3')!.checkpoint,
    'MiniMaxAI/MiniMax-Music3',
  )
  for (const e of modelExamples) {
    assert.equal(e.stages.length, 6)
    const ids = [
      ...e.facts.flatMap((f) => f.sources),
      ...e.stages.flatMap((s) => s.sources),
      ...e.recipes.flatMap((r) => r.sources),
      ...e.choices.flatMap((c) => c.sources),
      ...(e.observations || []).flatMap((o) => o.sources),
    ]
    for (const id of ids) {
      assert.ok(exampleSources[id], `${e.id}: missing source ${id}`)
      assert.equal(new URL(exampleSources[id].url).protocol, 'https:')
    }
    assert.equal(sourcesForExample(e).length, new Set(ids).size)
    for (const s of e.stages) {
      assert.ok(s.input && s.output && s.placement && s.traffic && s.bottleneck)
    }
  }
})
test('K3 expert assignments preserve routed and shared work distinctions', () => {
  const p = defaultExampleInputs('kimi-k3'),
    b = exampleBudgets('kimi-k3', p)
  assert.equal(b[0].value, '2,048')
  assert.equal(b[1].value, '1.79')
  assert.equal(b[2].value, '69 / 24')
  assert.match(b[0].note, /shared experts/)
  assert.equal(
    exampleBudgets('kimi-k3', { ...p, tokens: 256 })[0].value,
    '4,096',
  )
})
test('image budgets separate raw pixels, relative work and generator-only weights', () => {
  const p = defaultExampleInputs('qwen-image-21'),
    b = exampleBudgets('qwen-image-21', p)
  assert.equal(b[0].value, '16.00')
  assert.equal(b[1].value, '4.00')
  assert.equal(b[2].value, '13.04')
  const small = exampleBudgets('qwen-image-21', {
    ...p,
    resolution: 1024,
    steps: 40,
  })
  assert.equal(small[0].value, '4.00')
  assert.equal(small[1].value, '1.00')
  assert.match(b[2].note, /excludes conditioning encoder/)
})
test('H3 frame and uncompressed payload budgets scale with clip duration', () => {
  const p = defaultExampleInputs('minimax-h3'),
    b = exampleBudgets('minimax-h3', p),
    double = exampleBudgets('minimax-h3', { ...p, seconds: 12 })
  assert.equal(b[0].value, '144')
  assert.equal(b[1].value, '405.00')
  assert.equal(double[1].value, '810.00')
  assert.equal(b[2].value, '0.73')
  assert.match(b[1].note, /Before compression/)
})
test('Music 3 frame caps and PCM use the open model format rather than the hosted API MP3 example', () => {
  const p = defaultExampleInputs('minimax-music-3'),
    b = exampleBudgets('minimax-music-3', p)
  assert.equal(b[0].value, '1,500')
  assert.equal(b[1].value, '7.32')
  assert.equal(b[2].value, '128')
  const req = JSON.parse(
    examplePayload(
      { id: 'minimax-music-3', stage: 0, playing: false, inputs: p },
      'acoustic pop',
    ),
  )
  assert.equal(req.stream, false)
  assert.equal(req.max_new_tokens, 1500)
  assert.equal(req.model, 'MiniMaxAI/MiniMax-Music3')
  assert.equal(
    exampleBudgets('minimax-music-3', { ...p, seconds: 300 })[0].value,
    '7,500',
  )
})
test('duplex capacity counts reference-worker slots and both audio directions without inventing a GPU throughput', () => {
  const p = defaultExampleInputs('personaplex'),
    b = exampleBudgets('personaplex', p)
  assert.equal(b[0].value, '80')
  assert.equal(b[1].value, '7.68')
  assert.equal(b[2].value, '10')
  const more = exampleBudgets('personaplex', { ...p, sessions: 100 })
  assert.equal(more[1].value, '76.80')
  assert.equal(more[2].value, '100')
  assert.match(more[2].note, /not GPU count/)
})
test('CosyVoice chunk duration, mel frames and waveform payload share the released 25 Hz / 24 kHz configuration', () => {
  const p = defaultExampleInputs('cosyvoice-2'),
    b = exampleBudgets('cosyvoice-2', p)
  assert.equal(b[0].value, '1.00')
  assert.equal(b[1].value, '46.88')
  assert.equal(b[2].value, '50')
  const large = exampleBudgets('cosyvoice-2', { ...p, hop: 100 })
  assert.equal(large[0].value, '4.00')
  assert.equal(large[2].value, '200')
  assert.match(b[2].note, /3 lookahead/)
})
test('shared model URLs retain Pages paths and round-trip bounded stage and model-specific inputs', () => {
  const view = {
    id: 'qwen-image-21' as const,
    stage: 4,
    playing: true,
    inputs: {
      ...defaultExampleInputs('qwen-image-21'),
      resolution: 1024,
      steps: 20,
    },
  }
  const url = exampleUrl(
    'https://sloth-os.github.io/AI-Infra/?gpus=32000',
    view,
  )
  assert.equal(new URL(url).pathname, '/AI-Infra/')
  assert.equal(new URL(url).searchParams.get('learn'), 'fusion')
  assert.deepEqual(parseExampleLocation(url), { ...view, playing: false })
  assert.equal(
    parseExampleLocation('https://example.com/?example=unverified-model'),
    null,
  )
  assert.equal(exampleStage(NaN), 0)
  assert.equal(exampleStage(99), 5)
  const bad = sanitizeExampleInputs('minimax-h3', {
    seconds: Infinity,
    sessions: -5,
    hop: 999,
    resolution: 1300,
    steps: NaN,
  })
  assert.equal(bad.seconds, 6)
  assert.equal(bad.sessions, 1)
  assert.equal(bad.hop, 100)
  assert.equal(bad.resolution, 1024)
  assert.equal(bad.steps, 40)
})
