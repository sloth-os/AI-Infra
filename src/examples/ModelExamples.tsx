import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Crosshair,
  Eye,
  FileJson,
  Pause,
  Play,
} from 'lucide-react'
import {
  exampleSources,
  findExample,
  modelExamples,
  sourcesForExample,
} from './catalog'
import type { ExampleId } from './catalog'
import {
  defaultExampleInputs,
  exampleBudgets,
  examplePayload,
  exampleStage,
  exampleUrl,
} from './model'
import type { ExampleInputs, ExampleView } from './model'
import './examples.css'

export function SourceLinks({ ids }: { ids: string[] }) {
  return (
    <div className="model-evidence" aria-label="Sources for this explanation">
      {[...new Set(ids)].map((id) => (
        <a
          href={exampleSources[id].url}
          key={id}
          target="_blank"
          rel="noreferrer"
        >
          {exampleSources[id].title}
          <ArrowUpRight size={10} />
        </a>
      ))}
    </div>
  )
}

export function ModelCatalog({
  query,
  onChoose,
  onCompare,
}: {
  query: string
  onChoose: (id: ExampleId) => void
  onCompare: () => void
}) {
  const matches = modelExamples.filter((e) =>
    `${e.name} ${e.checkpoint} ${e.tagline} ${e.kind} ${e.measure}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  )
  return (
    <div className="model-catalog">
      <p className="model-section-note">
        Six real workloads, traced from public model cards, code, and serving
        recipes. Each opens its own pipeline in the same 3D world.
      </p>
      <button className="model-compare-link" onClick={onCompare}>
        <Boxes size={15} /> Compare all six workloads <ArrowUpRight size={14} />
      </button>
      {matches.map((e) => (
        <button
          className="model-catalog-card"
          key={e.id}
          onClick={() => onChoose(e.id)}
          style={{ '--model-accent': e.color } as React.CSSProperties}
        >
          <span>
            {e.maker}{' '}
            <small>
              {e.kind === 'moe'
                ? 'HYBRID MoE'
                : e.kind === 'image'
                  ? 'IMAGE GENERATION'
                  : e.kind === 'video'
                    ? 'AUDIO + VIDEO'
                    : e.kind === 'music'
                      ? 'MUSIC GENERATION'
                      : e.kind === 'duplex'
                        ? 'FULL-DUPLEX SPEECH'
                        : 'STREAMING TTS'}
            </small>
          </span>
          <strong>
            {e.name}
            <ArrowUpRight size={17} />
          </strong>
          <p>{e.tagline}</p>
          <code>{e.checkpoint}</code>
          <em>
            Enter the 3D pipeline <ArrowRight size={13} />
          </em>
        </button>
      ))}
      {!matches.length && (
        <p>
          No model matches. Try “Kimi”, “music”, “speech”, or a checkpoint name.
        </p>
      )}
      <p className="model-section-note">
        Reviewed November 4, 2026. Published facts, derived sizing exercises,
        and proposed serving choices are labeled separately. No model runs or
        external API calls are made by these examples.
      </p>
    </div>
  )
}

function BudgetInputs({
  view,
  onInputs,
}: {
  view: ExampleView
  onInputs: (p: ExampleInputs) => void
}) {
  const p = view.inputs
  const controls: {
    key: keyof ExampleInputs
    label: string
    min: number
    max: number
    step: number
    unit: string
  }[] =
    view.id === 'kimi-k3'
      ? [
          {
            key: 'tokens',
            label: 'Routed microbatch token positions',
            min: 1,
            max: 4096,
            step: 1,
            unit: 'positions',
          },
        ]
      : view.id === 'qwen-image-21'
        ? [
            {
              key: 'steps',
              label: 'Image inference steps',
              min: 4,
              max: 60,
              step: 1,
              unit: 'steps',
            },
          ]
        : view.id === 'minimax-h3'
          ? [
              {
                key: 'seconds',
                label: 'Video duration',
                min: 4,
                max: 15,
                step: 1,
                unit: 'seconds',
              },
            ]
          : view.id === 'minimax-music-3'
            ? [
                {
                  key: 'seconds',
                  label: 'Song duration cap',
                  min: 5,
                  max: 300,
                  step: 5,
                  unit: 'seconds',
                },
              ]
            : view.id === 'personaplex'
              ? [
                  {
                    key: 'sessions',
                    label: 'Concurrent voice sessions',
                    min: 1,
                    max: 1000,
                    step: 1,
                    unit: 'sessions',
                  },
                ]
              : [
                  {
                    key: 'hop',
                    label: 'Speech chunk budget',
                    min: 25,
                    max: 100,
                    step: 25,
                    unit: 'speech tokens',
                  },
                ]
  return (
    <div className="model-budget-inputs">
      {view.id === 'qwen-image-21' && (
        <label>
          <span>
            Square image resolution
            <strong>
              {p.resolution} × {p.resolution}
            </strong>
          </span>
          <select
            aria-label="Image resolution"
            value={p.resolution}
            onChange={(e) =>
              onInputs({ ...p, resolution: Number(e.target.value) })
            }
          >
            {[512, 1024, 2048].map((n) => (
              <option key={n} value={n}>
                {n} × {n}
              </option>
            ))}
          </select>
        </label>
      )}
      {controls.map((c) => (
        <label key={c.key}>
          <span>
            {c.label}
            <strong>
              {p[c.key].toLocaleString()} <small>{c.unit}</small>
            </strong>
          </span>
          <input
            type="range"
            aria-label={c.label}
            min={c.min}
            max={c.max}
            step={c.step}
            value={p[c.key]}
            onChange={(e) =>
              onInputs({ ...p, [c.key]: Number(e.target.value) })
            }
          />
        </label>
      ))}
      <button
        className="model-text-link"
        onClick={() => onInputs(defaultExampleInputs(view.id))}
      >
        Reset this exercise
      </button>
    </div>
  )
}

export function ModelStudy({
  view,
  onChange,
  onCatalog,
  onCompare,
}: {
  view: ExampleView
  onChange: (v: ExampleView) => void
  onCatalog: () => void
  onCompare: () => void
}) {
  const e = findExample(view.id)!,
    stage = e.stages[view.stage]
  const [tab, setTab] = useState<'flow' | 'deployment' | 'budgets' | 'sources'>(
      'flow',
    ),
    [request, setRequest] = useState(false),
    [prompt, setPrompt] = useState(e.request),
    [copy, setCopy] = useState('')
  useEffect(() => {
    setTab('flow')
    setPrompt(e.request)
    setRequest(false)
    setCopy('')
  }, [e.id, e.request])
  useEffect(() => {
    if (!view.playing) setTab('flow')
  }, [view.stage])
  const share = async () => {
    const url = exampleUrl(location.href, view)
    history.replaceState({}, '', url)
    try {
      await navigator.clipboard.writeText(url)
      setCopy('Link copied')
    } catch {
      setCopy('Link updated in address bar')
    }
  }
  return (
    <div
      className="model-study-content"
      style={{ '--model-accent': e.color } as React.CSSProperties}
    >
      <div className="model-study-actions">
        <button onClick={onCatalog}>
          <ArrowLeft size={13} /> All models
        </button>
        <button onClick={onCompare}>
          Compare <Boxes size={13} />
        </button>
        <button onClick={() => void share()} aria-label="Share model example">
          {copy ? <Check size={13} /> : <Copy size={13} />} Share
        </button>
      </div>
      {copy && (
        <span className="model-copy-status" role="status">
          {copy}
        </span>
      )}
      <label className="model-select-label">
        Real model
        <select
          aria-label="Select real model"
          value={view.id}
          onChange={(event) =>
            onChange({
              id: event.target.value as ExampleId,
              stage: 0,
              playing: false,
              inputs: defaultExampleInputs(event.target.value as ExampleId),
            })
          }
        >
          {modelExamples.map((m) => (
            <option value={m.id} key={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </label>
      <nav className="model-detail-tabs" aria-label="Model example sections">
        {(['flow', 'deployment', 'budgets', 'sources'] as const).map((t) => (
          <button key={t} aria-pressed={tab === t} onClick={() => setTab(t)}>
            {t === 'flow'
              ? 'Pipeline'
              : t === 'deployment'
                ? 'Serving'
                : t === 'budgets'
                  ? 'Data budgets'
                  : 'Sources'}
          </button>
        ))}
      </nav>
      {tab === 'flow' ? (
        <>
          <span className="model-kicker">
            STAGE {view.stage + 1} / 6 · PUBLISHED MODEL MECHANISM
          </span>
          <h2>{stage.title}</h2>
          <div className="model-representation">
            <span>INPUT</span>
            <code>{stage.input}</code>
            <ArrowRight size={15} />
            <span>OUTPUT</span>
            <code>{stage.output}</code>
          </div>
          <p>{stage.detail}</p>
          <SourceLinks ids={stage.sources} />
          <div className="model-stage-operations">
            <h3>Where it runs</h3>
            <p>{stage.placement}</p>
            <h3>What moves</h3>
            <p>{stage.traffic}</p>
            <h3>What can slow it down</h3>
            <p>{stage.bottleneck}</p>
          </div>
          <details className="model-facts">
            <summary>
              <BookOpen size={14} /> Published model facts
            </summary>
            {e.facts.map((f) => (
              <div key={f.text}>
                <p>{f.text}</p>
                <SourceLinks ids={f.sources} />
              </div>
            ))}
          </details>
          <button
            className="model-text-link"
            onClick={() => setRequest(!request)}
          >
            <FileJson size={14} />
            {request
              ? 'Hide example request / configuration'
              : 'Example request / configuration'}
          </button>
          {request && (
            <div className="model-request">
              <label>
                Local example text
                <textarea
                  aria-label="Model example text"
                  maxLength={1000}
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                />
              </label>
              <p>
                Configuration illustration; not an executed API call. Non-HTTP
                interfaces are identified in the example.
              </p>
              <pre>{examplePayload(view, prompt)}</pre>
            </div>
          )}
        </>
      ) : tab === 'deployment' ? (
        <>
          <span className="model-kicker">
            PUBLISHED RECIPES + PROPOSED SERVING CHOICES
          </span>
          <h2>Place the work. Protect the SLO.</h2>
          <p>{e.deployment}</p>
          {e.observations?.map((o) => (
            <article
              className="model-choice model-published-observation"
              key={o.text}
            >
              <span>SOURCE-REPORTED PERFORMANCE · NOT RUN HERE</span>
              <p>{o.text}</p>
              <SourceLinks ids={o.sources} />
            </article>
          ))}
          {e.recipes.map((r) => (
            <article className="model-recipe" key={r.title}>
              <h3>{r.title}</h3>
              <pre>{r.code}</pre>
              <p>{r.note}</p>
              <SourceLinks ids={r.sources} />
            </article>
          ))}
          {e.choices.map((c) => (
            <article className="model-choice" key={c.title}>
              <h3>{c.title}</h3>
              <span>BENEFIT</span>
              <p>{c.benefit}</p>
              <span>COST / LIMIT</span>
              <p>{c.cost}</p>
              <SourceLinks ids={c.sources} />
            </article>
          ))}
          <div className="model-measure">
            <span>MEASURE PERFORMANCE WITH</span>
            <p>{e.measure}</p>
          </div>
        </>
      ) : tab === 'budgets' ? (
        <>
          <span className="model-kicker">
            CALCULATED EXERCISES · NOT BENCHMARKS
          </span>
          <h2>Follow the size of the data.</h2>
          <p>
            These calculations use this model’s published formats and the chosen
            scenario. They do not use the Learning lab’s dense 70B performance
            model.
          </p>
          <BudgetInputs
            view={view}
            onInputs={(p) => onChange({ ...view, inputs: p })}
          />
          <div className="model-budget-results">
            {exampleBudgets(view.id, view.inputs).map((b) => (
              <article key={b.label}>
                <span>{b.label}</span>
                <strong>
                  {b.value} <small>{b.unit}</small>
                </strong>
                <code>{b.formula}</code>
                <p>{b.note}</p>
              </article>
            ))}
          </div>
          <SourceLinks
            ids={sourcesForExample(e)
              .map((s) => s.id)
              .filter((id) => /config|loader|card|server/.test(id))}
          />
        </>
      ) : (
        <>
          <span className="model-kicker">
            PRIMARY SOURCES · REVIEWED NOV 4, 2026
          </span>
          <h2>Inspect the evidence.</h2>
          <p>
            Model cards and source files are pinned to the revisions reviewed
            here when available. Recipe sites and hosted APIs can evolve.
          </p>
          <div className="model-source-list">
            {sourcesForExample(e).map((s) => (
              <a key={s.id} href={s.url} target="_blank" rel="noreferrer">
                {s.title}
                <ArrowUpRight size={14} />
                <small>{new URL(s.url).hostname}</small>
              </a>
            ))}
          </div>
        </>
      )}
      <p className="model-boundary">{e.boundary}</p>
    </div>
  )
}

export function ExampleHUD({
  view,
  panelOpen,
  onOpen,
  onStage,
  onPlay,
  onFocus,
  onExit,
  reduced,
}: {
  view: ExampleView
  panelOpen: boolean
  onOpen: () => void
  onStage: (stage: number) => void
  onPlay: () => void
  onFocus: () => void
  onExit: () => void
  reduced: boolean
}) {
  const e = findExample(view.id)!,
    s = e.stages[view.stage],
    budgets = exampleBudgets(view.id, view.inputs)
  return (
    <>
      <div
        className="model-scope"
        style={{ '--model-accent': e.color } as React.CSSProperties}
      >
        <span>
          <i /> REAL MODEL FIELD TRIP · {e.maker}
        </span>
        <h1>{e.name}</h1>
        <p>{e.tagline}</p>
        <code>{e.checkpoint}</code>
      </div>
      <div
        className="model-world-readouts"
        aria-label="Model data budget metrics"
      >
        {budgets.map((b) => (
          <div key={b.label}>
            <span>{b.label}</span>
            <strong>
              {b.value}
              <small>{b.unit}</small>
            </strong>
          </div>
        ))}
      </div>
      <aside className="model-now" aria-label="Current model pipeline stage">
        <span>0{view.stage + 1} / 06 · DATA TRANSFORMATION</span>
        <h2>{s.title}</h2>
        <code>{s.output}</code>
        <p>{s.bottleneck}</p>
        <button onClick={onOpen}>
          {panelOpen ? 'Show the world' : 'Read this stage'}{' '}
          <ArrowUpRight size={13} />
        </button>
      </aside>
      <div className="model-command-deck">
        <div
          className="model-stage-dock"
          aria-label="Real model pipeline stages"
        >
          {e.stages.map((stage, i) => (
            <button
              key={stage.short}
              aria-label={`Model stage ${i + 1}: ${stage.title}`}
              aria-current={view.stage === i ? 'step' : undefined}
              onClick={() => onStage(i)}
            >
              <b>{String(i + 1).padStart(2, '0')}</b>
              <span>{stage.short}</span>
            </button>
          ))}
        </div>
        <div className="model-playback">
          <button
            aria-label={
              view.playing
                ? 'Pause model walkthrough'
                : 'Play model walkthrough'
            }
            onClick={onPlay}
            disabled={reduced}
          >
            {view.playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            aria-label="Previous model stage"
            onClick={() => onStage(exampleStage(view.stage, -1))}
            disabled={!view.stage}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            {reduced
              ? 'REDUCED MOTION · SELECT A STAGE'
              : 'TEACHING ANIMATION · NO MODEL EXECUTION'}
          </span>
          <button
            aria-label="Next model stage"
            onClick={() => onStage(exampleStage(view.stage, 1))}
            disabled={view.stage === 5}
          >
            <ChevronRight size={17} />
          </button>
          <i />
          <button onClick={onFocus} aria-label="Focus model stage">
            <Crosshair size={15} />
            <span>Focus</span>
          </button>
          <button
            onClick={onOpen}
            aria-label={panelOpen ? 'Hide model details' : 'Show model details'}
          >
            <Eye size={15} />
            <span>{panelOpen ? 'World' : 'Details'}</span>
          </button>
          <button
            onClick={onExit}
            aria-label="Return to infrastructure explorer"
          >
            <Boxes size={15} />
            <span>Infrastructure</span>
          </button>
        </div>
      </div>
    </>
  )
}

export function ModelComparison() {
  return (
    <div className="model-comparison">
      <span className="model-kicker">
        SIX WORKLOADS · DIFFERENT SUCCESS CRITERIA
      </span>
      <h1>Compare the infrastructure questions.</h1>
      <p>
        Parameter counts alone do not rank serving speed. Hold hardware,
        runtime, request shape, precision, and quality/SLO constant before
        comparing measurements. These public architectures are not fed into the
        dense 70B lab.
      </p>
      <div className="model-comparison-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Published pipeline</th>
              <th>Performance objective</th>
              <th>Serving trade-off</th>
            </tr>
          </thead>
          <tbody>
            {modelExamples.map((e) => (
              <tr key={e.id}>
                <th>
                  {e.name}
                  <code>{e.checkpoint}</code>
                </th>
                <td>
                  {e.facts[e.kind === 'music' ? 1 : 0].text}
                  <SourceLinks
                    ids={e.facts[e.kind === 'music' ? 1 : 0].sources}
                  />
                </td>
                <td>{e.measure}</td>
                <td>
                  <strong>{e.choices[0].title}</strong>
                  <p>{e.choices[0].benefit}</p>
                  <p>{e.choices[0].cost}</p>
                  <SourceLinks ids={e.choices[0].sources} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="model-boundary">
        Hardware counts in recipes are configurations, not universal minima.
        Data sizes calculated in the examples are payload budgets, not measured
        latency, encoded-file size, or total VRAM.
      </p>
    </div>
  )
}

export function ModelReferenceSection() {
  return (
    <section className="real-model-reference white-card">
      <span className="card-eyebrow">REAL MODEL FIELD TRIPS</span>
      <h2>Six models. Six serving paths.</h2>
      <p>
        Compare public architectures and serving recipes, then enter a model’s
        interactive 3D pipeline. Field trips open in a new tab.
      </p>
      <div className="model-reference-list">
        {modelExamples.map((e) => (
          <a
            key={e.id}
            href={`${import.meta.env.BASE_URL}?view=guide&learn=fusion&example=${e.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <strong>
              {e.name}
              <ArrowUpRight size={15} />
            </strong>
            <span>{e.tagline}</span>
            <code>{e.checkpoint}</code>
          </a>
        ))}
      </div>
    </section>
  )
}
