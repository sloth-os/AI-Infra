import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Info,
  RotateCcw,
} from 'lucide-react'
import { hotIssues, issueSources, issuesReviewed } from './catalog'
import {
  defaultIssueInputs,
  fmt,
  issueResults,
  issueUrl,
  sanitizeIssueInputs,
  selectIssue,
} from './model'
import type { IssuePanel, IssueView } from './model'
import './issues.css'
function Sources({ ids }: { ids: string[] }) {
  return (
    <div className="issue-sources">
      {ids.map((id) => {
        const s = issueSources[id]
        return (
          <article key={id}>
            <span>{s.org}</span>
            <a href={s.url} target="_blank" rel="noreferrer">
              {s.title}
              <ArrowUpRight size={12} />
            </a>
            <small>{s.date}</small>
            <p>{s.supports}</p>
          </article>
        )
      })}
    </div>
  )
}
export function HotIssuesStudy({
  view,
  onChange,
  onMethodology,
}: {
  view: IssueView
  onChange: (v: IssueView) => void
  onMethodology: () => void
}) {
  const topic = hotIssues[view.stage],
    result = issueResults(view),
    [copied, setCopied] = useState(false),
    root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    root.current?.closest('.learn-panel')?.scrollTo(0, 0)
  }, [view.stage, view.panel])
  useEffect(() => setCopied(false), [view])
  const panel = (next: IssuePanel) =>
    onChange({ ...view, panel: next, playing: false })
  const share = async () => {
    const url = issueUrl(location.href, view)
    history.replaceState({}, '', url)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div
      ref={root}
      className="model-study-content issue-study"
      data-testid="hot-issues-study"
    >
      <div className="model-study-actions">
        <button onClick={onMethodology}>
          <Info size={13} />
          Selection & evidence
        </button>
        <button aria-label="Share hot issue" onClick={() => void share()}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Share issue'}
        </button>
      </div>
      <label className="model-select-label">
        The ten-issue briefing
        <select
          aria-label="Select hot issue"
          value={view.stage}
          onChange={(e) => onChange(selectIssue(view, Number(e.target.value)))}
        >
          {hotIssues.map((i, n) => (
            <option value={n} key={i.id}>
              {String(n + 1).padStart(2, '0')} · {i.title}
            </option>
          ))}
        </select>
      </label>
      <nav className="model-detail-tabs" aria-label="Hot issue sections">
        {(['top10', 'brief', 'lab', 'sources'] as IssuePanel[]).map((tab) => (
          <button
            key={tab}
            aria-pressed={view.panel === tab}
            onClick={() => panel(tab)}
          >
            {tab === 'top10'
              ? 'Top 10'
              : tab === 'brief'
                ? 'The issue'
                : tab === 'lab'
                  ? 'Experiment'
                  : 'Evidence'}
          </button>
        ))}
      </nav>
      {view.panel === 'top10' ? (
        <>
          <span className="model-kicker">
            EDITORIAL WATCHLIST · REVIEWED {issuesReviewed}
          </span>
          <h2>Ten constraints shaping AI infrastructure.</h2>
          <p>
            Selected for operational impact, reach across the stack, and current
            primary-source evidence. The order is an editorial priority list.
            Source publication and snapshot dates are shown separately.
          </p>
          <div className="issue-catalog">
            {hotIssues.map((i, n) => (
              <button
                key={i.id}
                className={view.stage === n ? 'selected' : ''}
                onClick={() => onChange(selectIssue(view, n))}
                style={{ '--issue-color': i.color } as React.CSSProperties}
              >
                <b>{String(n + 1).padStart(2, '0')}</b>
                <span>
                  <small>{i.category}</small>
                  <strong>{i.title}</strong>
                  <p>{i.thesis}</p>
                  <em>
                    Explore this issue here
                    <ArrowUpRight size={12} />
                  </em>
                </span>
              </button>
            ))}
          </div>
          <button className="model-text-link" onClick={onMethodology}>
            Read how the list was researched
            <ArrowRight size={13} />
          </button>
        </>
      ) : view.panel === 'brief' ? (
        <>
          <span className="model-kicker">
            ISSUE {String(view.stage + 1).padStart(2, '0')} / 10 ·{' '}
            {topic.category}
          </span>
          <h2>{topic.title}</h2>
          <p className="issue-thesis">{topic.thesis}</p>
          {(
            [
              ['Why it is current', topic.whyHot],
              ['The bottleneck', topic.bottleneck],
              ['What moves through the system', topic.movement],
              ['Responses worth comparing', topic.response],
              ['What the response costs', topic.tradeoff],
              ['How to judge performance', topic.measure],
              ['The operator’s question', topic.openQuestion],
            ] as const
          ).map(([title, body]) => (
            <div className="issue-explanation" key={title}>
              <span className="model-kicker">{title.toUpperCase()}</span>
              <p>{body}</p>
            </div>
          ))}
          <button
            className="issue-experiment-link"
            onClick={() => panel('lab')}
          >
            Change the assumptions in 3D
            <ArrowRight size={14} />
          </button>
          <Sources ids={topic.sources} />
        </>
      ) : view.panel === 'lab' ? (
        <>
          <span className="model-kicker">EXPLICIT TEACHING ASSUMPTIONS</span>
          <h2>{topic.experiment}</h2>
          <p>{topic.assumptions}</p>
          <label className="issue-intervention">
            <input
              type="checkbox"
              aria-label="Apply issue intervention"
              checked={view.applied}
              onChange={(e) =>
                onChange({ ...view, applied: e.target.checked, playing: false })
              }
            />
            <span>
              {topic.solution}
              <small>
                {view.applied
                  ? 'CANDIDATE ASSUMPTION APPLIED'
                  : 'BASELINE ASSUMPTION'}
              </small>
            </span>
          </label>
          <div className="issue-controls">
            {topic.controls.map((c) => (
              <label key={c.key} htmlFor={`issue-${topic.id}-${c.key}`}>
                <span>
                  {c.label}
                  <output>
                    {c.key === 'pue'
                      ? (view.inputs[c.key] / 100).toFixed(2)
                      : fmt(view.inputs[c.key], 0)}{' '}
                    <small>{c.unit}</small>
                  </output>
                </span>
                {c.key === 'gang' ? (
                  <select
                    id={`issue-${topic.id}-${c.key}`}
                    aria-label={c.label}
                    value={view.inputs[c.key]}
                    onChange={(e) =>
                      onChange({
                        ...view,
                        playing: false,
                        inputs: sanitizeIssueInputs(topic.id, {
                          ...view.inputs,
                          [c.key]: Number(e.target.value),
                        }),
                      })
                    }
                  >
                    {[2, 4, 8].map((n) => (
                      <option value={n} key={n}>
                        {n} GPUs
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`issue-${topic.id}-${c.key}`}
                    aria-label={c.label}
                    type="range"
                    aria-valuetext={
                      c.key === 'pue'
                        ? `${(view.inputs[c.key] / 100).toFixed(2)} PUE`
                        : undefined
                    }
                    min={c.min}
                    max={c.max}
                    step={c.step}
                    value={view.inputs[c.key]}
                    onChange={(e) =>
                      onChange({
                        ...view,
                        playing: false,
                        inputs: sanitizeIssueInputs(topic.id, {
                          ...view.inputs,
                          [c.key]: Number(e.target.value),
                        }),
                      })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <div className="model-budget-results">
            {result.metrics.map((m) => (
              <article key={m.label}>
                <span>{m.label}</span>
                <strong>{m.value}</strong>
                <code>{m.formula}</code>
                <p>{m.note}</p>
              </article>
            ))}
          </div>
          <p className="issue-result-note" role="status">
            {result.note}
          </p>
          <h3>Keep the trade-off in view</h3>
          <p>{topic.tradeoff}</p>
          <button
            className="model-text-link"
            onClick={() =>
              onChange({
                ...view,
                applied: false,
                playing: false,
                inputs: defaultIssueInputs(topic.id),
              })
            }
          >
            <RotateCcw size={13} />
            Reset this experiment
          </button>
          <Sources ids={topic.sources} />
        </>
      ) : (
        <>
          <span className="model-kicker">CLAIM-LEVEL PRIMARY SOURCES</span>
          <h2>Evidence for {topic.short.toLowerCase()}.</h2>
          <p>
            Reviewed {issuesReviewed}. Current repository snapshots are pinned.
            Foundational papers and agency reports retain their publication
            dates. Calculated figures in the experiment are derived from the
            displayed assumptions.
          </p>
          <Sources ids={topic.sources} />
          <div className="model-evidence">
            <span>READ THE SCOPE</span>
            <p>
              Animations attach to the current infrastructure level. Their
              glyphs aggregate hardware and tensors. Motion runs in teaching
              time; the website does not execute these infrastructure systems,
              perform attacks, or measure GPU performance.
            </p>
          </div>
          <button className="model-text-link" onClick={onMethodology}>
            All sources and the selection method
            <ArrowUpRight size={13} />
          </button>
        </>
      )}
    </div>
  )
}
export function HotIssuesMethodology() {
  return (
    <section className="model-comparison issue-methodology">
      <span className="model-kicker">
        EDITORIAL WATCHLIST · REVIEWED {issuesReviewed}
      </span>
      <h1>How the ten issues were chosen.</h1>
      <p>
        This list covers AI infrastructure rather than general AI news. It is an
        editorial synthesis of primary-source engineering material: operator
        impact, reach across training/inference/facilities, and current
        documented activity determine inclusion and order. It is not a measured
        popularity chart, a forecast of market share, or a universal severity
        ranking for every organization.
      </p>
      <div className="issue-method-cards">
        <article>
          <h3>1. Operational impact</h3>
          <p>
            Can the issue prevent a job from starting, violate a serving SLO,
            waste expensive capacity, lose work or invalidate shared state?
          </p>
        </article>
        <article>
          <h3>2. Stack coverage</h3>
          <p>
            Include facility power, memory, networks, model execution, training
            orchestration, placement, recovery and isolation.
          </p>
        </article>
        <article>
          <h3>3. Reviewable evidence</h3>
          <p>
            Use current official software documentation and pinned snapshots,
            with dated foundational papers/agency reports where needed.
            Repository activity establishes currency, not adoption or universal
            performance.
          </p>
        </article>
      </div>
      <h2>The ten at a glance</h2>
      <div className="issue-method-table">
        <table>
          <thead>
            <tr>
              <th>Priority</th>
              <th>Issue</th>
              <th>Critical question</th>
            </tr>
          </thead>
          <tbody>
            {hotIssues.map((i, n) => (
              <tr key={i.id}>
                <th>{String(n + 1).padStart(2, '0')}</th>
                <td>{i.title}</td>
                <td>{i.openQuestion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>What the animation and calculations mean</h2>
      <p>
        Each issue connects the same fleet, pod, server and accelerator. Local
        data/energy signals attach to the existing hardware; selecting an issue
        never swaps in a separate issue world. Every experiment declares its
        model shape, numeric assumptions and excluded costs. Low acceptance can
        make speculation slower, strict cache partitioning can use more memory,
        and ideal compaction assumes movable workloads.
      </p>
      <p>
        Publication and snapshot dates are shown separately. The IEA’s 2030
        value is a projection for all data centres from its dated Base Case. The
        generic precision exercise does not claim to reproduce NVFP4’s layout,
        and the security example does not execute an attack or prove a security
        boundary.
      </p>
      <h2>Primary-source record</h2>
      <Sources ids={Object.keys(issueSources)} />
    </section>
  )
}
export function HotIssuesReferenceSection() {
  return (
    <section className="real-model-reference">
      <h2>Ten hot issues in AI infrastructure</h2>
      <p>
        Explore power, memory, networks, reasoning, precision, RL, placement,
        recovery and shared-state boundaries on the connected fleet, pod, server
        and GPU hardware.
      </p>
      <a
        href={`${import.meta.env.BASE_URL}?view=guide&learn=fusion&hot=all`}
        target="_blank"
        rel="noreferrer"
      >
        Open the ten-issue briefing
        <ArrowUpRight size={13} />
      </a>
    </section>
  )
}
