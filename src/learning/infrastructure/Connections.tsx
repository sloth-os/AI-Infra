import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Flame,
  Layers3,
  Pause,
  Play,
  X,
} from 'lucide-react'
import { modelExamples } from '../../examples/catalog'
import type { ExampleId } from '../../examples/catalog'
import { lifecyclePhases } from '../../lifecycle/catalog'
import type { LifecyclePhase } from '../../lifecycle/catalog'
import type { Layer } from '../../content'
import { contextSteps, issuesAtLevel, levelNames, levels } from './context'
import type { ContextFrame, ContextSelection } from './context'
import { defaultExampleInputs } from '../../examples/model'
import { defaultLifecycleView } from '../../lifecycle/model'
import './connections.css'
export interface ConnectionActions {
  onIssue: (index: number) => void
  onLifecycle: (phase: LifecyclePhase) => void
  onModel: (id: ExampleId) => void
}
export function ConnectionsCatalog({
  layer,
  selection,
  onIssue,
  onLifecycle,
  onModel,
}: { layer: Layer; selection: ContextSelection | null } & ConnectionActions) {
  return (
    <div
      className="connections-catalog"
      data-testid="infrastructure-connections"
    >
      <span className="learn-surface-kicker">
        <Layers3 size={14} />
        CONNECTED TO {levelNames[layer].toUpperCase()}
      </span>
      <h2>The stories inside this infrastructure.</h2>
      <p>
        Choose a problem or workload here. Zoom between Fleet, Pod, Server and
        GPU to follow the same story through its physical context.
      </p>
      <section>
        <h3>
          <Flame size={15} />
          Hot issues at this level
        </h3>
        <p>
          Operational questions with source-backed experiments. The complete
          ten-issue watchlist is available inside any issue’s reader.
        </p>
        <div className="connection-cards">
          {issuesAtLevel(layer).map(({ index, issue }) => (
            <button
              key={issue.id}
              aria-label={`Explore issue: ${issue.title}`}
              aria-pressed={
                selection?.kind === 'issue' && selection.view.stage === index
              }
              onClick={() => onIssue(index)}
              style={
                { '--connection-color': issue.color } as React.CSSProperties
              }
            >
              <b>{String(index + 1).padStart(2, '0')}</b>
              <span>
                <strong>{issue.title}</strong>
                <small>{issue.thesis}</small>
              </span>
              <ArrowRight size={14} />
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3>
          <Layers3 size={15} />
          AI lifecycle on this hardware
        </h3>
        <div className="connection-cards">
          {lifecyclePhases.map((phase) => {
            const steps = contextSteps({
              kind: 'lifecycle',
              view: defaultLifecycleView(phase.id),
            }).filter((s) => s.layer === layer)
            return (
              <button
                key={phase.id}
                aria-label={`Explore lifecycle: ${phase.title}`}
                aria-pressed={
                  selection?.kind === 'lifecycle' &&
                  selection.view.phase === phase.id
                }
                onClick={() => onLifecycle(phase.id)}
                style={
                  { '--connection-color': phase.color } as React.CSSProperties
                }
              >
                <Layers3 size={19} />
                <span>
                  <strong>{phase.title}</strong>
                  <small>{steps.map((s) => s.title).join(' · ')}</small>
                </span>
                <ArrowRight size={14} />
              </button>
            )
          })}
        </div>
      </section>
      <section>
        <h3>
          <Boxes size={15} />
          Real models at this level
        </h3>
        <p>
          Reference hardware shows where roles execute. It does not prescribe a
          model’s GPU count or a vendor’s private deployment.
        </p>
        <div className="connection-cards">
          {modelExamples.map((model) => {
            const steps = contextSteps({
              kind: 'model',
              view: {
                id: model.id,
                stage: 0,
                playing: false,
                inputs: defaultExampleInputs(model.id),
              },
            }).filter((s) => s.layer === layer)
            return (
              <button
                key={model.id}
                aria-label={`Explore model: ${model.name}`}
                aria-pressed={
                  selection?.kind === 'model' && selection.view.id === model.id
                }
                onClick={() => onModel(model.id)}
                style={
                  { '--connection-color': model.color } as React.CSSProperties
                }
              >
                <Boxes size={19} />
                <span>
                  <strong>{model.name}</strong>
                  <small>{steps.map((s) => s.title).join(' · ')}</small>
                </span>
                <ArrowRight size={14} />
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
export function ContextPerspective({
  frame,
  onLevel,
}: {
  frame: ContextFrame
  onLevel: (l: Layer) => void
}) {
  return (
    <section className="context-perspective" data-testid="context-perspective">
      <span>
        {levelNames[frame.layer].toUpperCase()} / {frame.title}
      </span>
      <h2>{frame.heading}</h2>
      <p>{frame.explanation}</p>
      <nav aria-label="Story infrastructure levels">
        {levels.map((layer) => (
          <button
            key={layer}
            aria-pressed={layer === frame.layer}
            onClick={() => onLevel(layer)}
          >
            {levelNames[layer]}
          </button>
        ))}
      </nav>
      <small>
        Same hardware world · stage and placement labels are conceptual.
        Aggregate glyphs run in teaching time.
      </small>
    </section>
  )
}
export function ContextMetrics({ frame }: { frame: ContextFrame }) {
  return (
    <div
      className="learn-metrics context-metrics"
      role="group"
      aria-label="Connected story metrics"
      title={frame.scope}
    >
      {frame.metrics.slice(0, 3).map((metric) => (
        <div key={metric.label}>
          <span>
            {metric.label}
            <strong>{metric.value}</strong>
          </span>
        </div>
      ))}
      <small>{frame.scope} · calculated / source-specific</small>
    </div>
  )
}
export function ContextNarration({
  frame,
  onRead,
}: {
  frame: ContextFrame
  onRead: () => void
}) {
  return (
    <aside
      className="learn-narration context-narration"
      aria-label="Connected infrastructure explanation"
    >
      <div>
        <i style={{ background: frame.color }} />
        <span>{levelNames[frame.layer].toUpperCase()} / IN CONTEXT</span>
      </div>
      <h2>{frame.heading}</h2>
      <p>{frame.explanation}</p>
      <code>{frame.payload}</code>
      <button onClick={onRead}>
        Read this connection
        <ArrowUpRight size={13} />
      </button>
    </aside>
  )
}
export function ContextControls({
  frame,
  reduced,
  panelOpen,
  onStep,
  onPlay,
  onRead,
  onBrowse,
  onClear,
  onFocus,
}: {
  frame: ContextFrame
  reduced: boolean
  panelOpen: boolean
  onStep: (n: number) => void
  onPlay: () => void
  onRead: () => void
  onBrowse: () => void
  onClear: () => void
  onFocus: () => void
}) {
  return (
    <div className="context-controls" data-testid="context-controls">
      <div className="context-current">
        <span>
          <i style={{ background: frame.color }} />
          {frame.kind === 'issue'
            ? 'HOT ISSUE'
            : frame.kind === 'lifecycle'
              ? 'AI LIFECYCLE'
              : 'REAL MODEL'}{' '}
          / {levelNames[frame.layer].toUpperCase()}
        </span>
        <strong>{frame.title}</strong>
        <button onClick={onClear} aria-label="Clear connected story">
          <X size={14} />
        </button>
      </div>
      <nav
        className="context-steps"
        aria-label="Connected walkthrough steps"
        style={{ '--context-steps': frame.steps.length } as React.CSSProperties}
      >
        {frame.steps.map((step, i) => (
          <button
            key={i}
            aria-label={`Context step ${i + 1}: ${step.title} · ${levelNames[step.layer]}`}
            aria-current={i === frame.stage ? 'step' : undefined}
            onClick={() => onStep(i)}
          >
            <b>{String(i + 1).padStart(2, '0')}</b>
            <span>
              {step.title}
              <small>{levelNames[step.layer]}</small>
            </span>
          </button>
        ))}
      </nav>
      <div className="context-playback">
        <button
          aria-label={
            frame.playing
              ? 'Pause connected walkthrough'
              : 'Play connected walkthrough'
          }
          onClick={onPlay}
          disabled={reduced}
        >
          {frame.playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          aria-label="Previous connected step"
          onClick={() => onStep(frame.stage - 1)}
          disabled={frame.stage === 0}
        >
          <ChevronLeft size={16} />
        </button>
        <span>
          {reduced
            ? 'SELECT A LEVEL OR STEP'
            : `${frame.duration}s / STEP · TEACHING TIME · 1–4 TO ZOOM`}
        </span>
        <button
          aria-label="Next connected step"
          onClick={() => onStep(frame.stage + 1)}
          disabled={frame.stage === frame.steps.length - 1}
        >
          <ChevronRight size={16} />
        </button>
        <i />
        <button onClick={onBrowse} aria-label="Browse stories at this level">
          <Layers3 size={14} />
          <span>Connections</span>
        </button>
        <button onClick={onFocus} aria-label="Focus connected hardware">
          <Crosshair size={14} />
          <span>Focus</span>
        </button>
        <button
          onClick={onRead}
          aria-label={
            panelOpen ? 'Hide connected details' : 'Show connected details'
          }
        >
          <BookOpen size={14} />
          <span>{panelOpen ? 'World' : 'Details'}</span>
        </button>
      </div>
    </div>
  )
}
