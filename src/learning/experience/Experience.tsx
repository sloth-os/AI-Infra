import { useEffect, useId, useRef, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  Cloud,
  Cpu,
  HelpCircle,
  Layers3,
  Route,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { glossary, lessons } from './model'
import type { Delta, LessonKind, Recap } from './model'
import './experience.css'

export function LessonChoices({
  onChoose,
}: {
  onChoose: (kind: LessonKind) => void
}) {
  return (
    <div
      className="experience-choices"
      role="group"
      aria-label="Guided learning paths"
    >
      {lessons.map((lesson, i) => {
        const Icon = [Route, Cpu, Cloud][i]
        return (
          <button
            key={lesson.id}
            onClick={() => onChoose(lesson.id)}
            aria-label={`Start lesson: ${lesson.title}`}
          >
            <Icon size={22} />
            <strong>{lesson.title}</strong>
            <span>{lesson.detail}</span>
            <small>
              {i === 0 ? 'Recommended first lesson' : 'Guided experiment'}{' '}
              <ArrowRight size={13} />
            </small>
          </button>
        )
      })}
    </div>
  )
}
export function Welcome({
  onChoose,
  onExplore,
}: {
  onChoose: (kind: LessonKind) => void
  onExplore: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const el = dialog.current
    el?.showModal()
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={dialog}
      className="experience-welcome"
      aria-labelledby="experience-welcome-title"
      onCancel={(e) => {
        e.preventDefault()
        onExplore()
      }}
    >
      <header>
        <span>
          <Layers3 size={20} /> STRATA · LEARN IN THE WORLD
        </span>
        <button aria-label="Close learning path chooser" onClick={onExplore}>
          <X size={20} />
        </button>
      </header>
      <h1 id="experience-welcome-title">
        Understand the infrastructure behind an answer.
      </h1>
      <p>
        Choose one question. Follow the data through real infrastructure
        concepts, change a constraint and explain the result.
      </p>
      <LessonChoices onChoose={onChoose} />
      <footer>
        <button onClick={onExplore}>
          Explore freely <ArrowRight size={15} />
        </button>
        <span>
          One shared 3D world · pause, inspect and replay at your own pace
        </span>
      </footer>
    </dialog>
  )
}
export function Term({
  name,
  children,
  onExplain,
}: {
  name: string
  children?: ReactNode
  onExplain?: () => void
}) {
  const id = useId(),
    term = glossary[name]
  if (!term) return <>{children || name}</>
  return (
    <>
      <button
        className="experience-term"
        popoverTarget={id}
        aria-label={`Explain ${name}`}
        onClick={onExplain}
      >
        {children || name}
      </button>
      <span
        popover="auto"
        id={id}
        className="experience-term-popover"
        role="note"
      >
        <strong>
          {name} · {term.title}
        </strong>
        <span className="experience-term-copy">{term.definition}</span>
        <span className="experience-term-copy">{term.why}</span>
        <small>Tap outside or press Escape to return to the same lesson.</small>
      </span>
    </>
  )
}
export function TermList({ terms }: { terms: readonly string[] }) {
  return (
    <div className="experience-terms" aria-label="Terms in this flow">
      {[...new Set(terms)].map((name) => (
        <Term key={name} name={name} />
      ))}
    </div>
  )
}
export function ExplainedText({
  text,
  onExplain,
}: {
  text: string
  onExplain?: () => void
}) {
  const expression =
    /\b(HBM|K\/V|KV|prefill|decode|embedding|ZeRO|gang|checkpoint|tensor|collective|tenant)\b/gi
  const nodes: ReactNode[] = []
  let start = 0
  const seen = new Set<string>()
  for (const match of text.matchAll(expression)) {
    const key = Object.keys(glossary).find(
      (k) => k.toLowerCase() === match[0].replace(/k\/v/i, 'KV').toLowerCase(),
    )!
    nodes.push(text.slice(start, match.index))
    nodes.push(
      seen.has(key) ? (
        match[0]
      ) : (
        <Term key={`${match.index}-${key}`} name={key} onExplain={onExplain}>
          {match[0]}
        </Term>
      ),
    )
    seen.add(key)
    start = match.index! + match[0].length
  }
  nodes.push(text.slice(start))
  return <>{nodes}</>
}
export function FlowCoach({
  title,
  payload,
  explanation,
  scope,
  terms,
  onFocus,
  onInspect,
  onClear,
  onExplain,
}: {
  title: string
  payload: string
  explanation: string
  scope: string
  terms: readonly string[]
  onFocus: () => void
  onInspect?: () => void
  onClear?: () => void
  onExplain: () => void
}) {
  const id = useId()
  return (
    <div className="experience-flow-coach">
      <button
        popoverTarget={id}
        onClick={onExplain}
        aria-label="Explain the current 3D flow"
      >
        <HelpCircle size={14} />
        <span>{title}</span>
        <ChevronDown size={12} />
      </button>
      <button
        onClick={onFocus}
        className="experience-focus"
        aria-label="Locate the explained flow"
      >
        Locate <ArrowRight size={12} />
      </button>
      {onClear && (
        <button onClick={onClear} aria-label="Clear connected story">
          <X size={14} />
        </button>
      )}
      <div
        popover="auto"
        id={id}
        className="experience-flow-popover"
        aria-label="Current flow explanation"
      >
        <span className="experience-kicker">WHAT MOVES · WHERE · WHY</span>
        <h2>{title}</h2>
        <code>{payload}</code>
        <p>
          <ExplainedText text={explanation} />
        </p>
        <dl>
          <div>
            <dt>Physical blocks</dt>
            <dd>Reference hardware at the selected scale.</dd>
          </div>
          <div>
            <dt>Attached tiles and moving parcels</dt>
            <dd>
              Aggregated state or work items. Their meaning follows this
              payload; they are not literal packet traces.
            </dd>
          </div>
        </dl>
        <p className="experience-scope-note">{scope}</p>
        <TermList terms={terms} />
        <button
          onClick={(e) => {
            e.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()
            onFocus()
          }}
        >
          Locate this subject in the world <ArrowRight size={14} />
        </button>
        {onInspect && (
          <button
            onClick={(e) => {
              e.currentTarget.closest<HTMLElement>('[popover]')?.hidePopover()
              onInspect()
            }}
          >
            Inspect the active payload <ArrowRight size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
export function DeltaReadout({
  deltas,
  label = 'Same workload · before → after',
}: {
  deltas: Delta[]
  label?: string
}) {
  return (
    <div className="experience-deltas" role="group" aria-label={label}>
      <small>{label}</small>
      <dl>
        {deltas.map((d) => (
          <div key={d.label}>
            <dt>{d.label}</dt>
            <dd>
              <span>{d.before}</span>
              <ArrowRight size={12} />
              <strong>{d.after}</strong>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
export function MissionRecap({ recap }: { recap: Recap }) {
  const [answer, setAnswer] = useState<number | null>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    feedback.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
  }, [answer])
  return (
    <section className="experience-recap" aria-label="Learning recap">
      <span className="experience-kicker">EXPLAIN THE RESULT</span>
      <h3>{recap.title}</h3>
      <p className="experience-scope-note">{recap.scope}</p>
      <p>{recap.outcome}</p>
      {!!recap.deltas.length && (
        <DeltaReadout deltas={recap.deltas} label={recap.comparisonLabel} />
      )}
      <details>
        <summary>{recap.changesLabel || 'What changed at each level'}</summary>
        <ul>
          {recap.changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </details>
      <p>
        <strong>The trade-off. </strong>
        <ExplainedText text={recap.tradeoff} />
      </p>
      <fieldset>
        <legend>{recap.question}</legend>
        {recap.answers.map((text, i) => (
          <button
            key={text}
            aria-pressed={answer === i}
            onClick={() => setAnswer(i)}
          >
            {text}
          </button>
        ))}
      </fieldset>
      {answer !== null && (
        <p
          ref={feedback}
          role="status"
          className={`experience-answer ${answer === recap.correct ? 'is-correct' : ''}`}
        >
          <strong>
            {answer === recap.correct
              ? 'That is the key idea. '
              : 'Try another prediction. '}
          </strong>
          {recap.explanation}
        </p>
      )}
    </section>
  )
}
export function LessonGoal({
  title,
  question,
  action,
  onAction,
  onClose,
}: {
  title: string
  question: string
  action: string
  onAction: () => void
  onClose: () => void
}) {
  return (
    <div
      className="experience-lesson-goal"
      role="region"
      aria-label="Current learning goal"
    >
      <BookOpen size={17} />
      <div>
        <strong>{title}</strong>
        <span>{question}</span>
      </div>
      <button onClick={onAction}>
        {action}
        <ArrowRight size={13} />
      </button>
      <button aria-label="Leave guided lesson" onClick={onClose}>
        <X size={15} />
      </button>
    </div>
  )
}
