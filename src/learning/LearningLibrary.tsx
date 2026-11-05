import { ArrowRight, ArrowUpRight, BookOpen, Search } from 'lucide-react'
import { details, glossary, sources } from '../content'
import type { Layer, Traffic } from '../content'
import { conceptWorld } from './model'
import { ModelCatalog, ModelStudy } from '../examples/ModelExamples'
import type { ExampleId } from '../examples/catalog'
import type { ExampleView } from '../examples/model'
import { LifecycleStudy } from '../lifecycle/Lifecycle'
import type { LifecycleView } from '../lifecycle/model'
import { HotIssuesStudy } from '../issues/HotIssues'
import type { IssueView } from '../issues/model'

export type LibraryTab =
  | 'concepts'
  | 'glossary'
  | 'sources'
  | 'models'
  | 'lifecycle'
  | 'hot'
const detailWorlds: Record<string, { layer: Layer; traffic: Traffic }> = {
  gateway: { layer: 'fleet', traffic: 'requests' },
  scheduler: { layer: 'fleet', traffic: 'requests' },
  storage: { layer: 'fleet', traffic: 'requests' },
  prefill: { layer: 'pod', traffic: 'requests' },
  decode: { layer: 'pod', traffic: 'requests' },
  fabric: { layer: 'pod', traffic: 'kv' },
  nvlink: { layer: 'rack', traffic: 'collectives' },
  hbm: { layer: 'gpu', traffic: 'kv' },
  tensor: { layer: 'gpu', traffic: 'tensors' },
}
export default function LearningLibrary({
  query,
  onQuery,
  tab,
  onTab,
  onLocate,
  onReading,
  example,
  onExample,
  onChooseExample,
  onCompare,
  lifecycle,
  onLifecycle,
  onLifecycleCompare,
  issue,
  onIssue,
  onIssueMethodology,
}: {
  query: string
  onQuery: (q: string) => void
  tab: LibraryTab
  onTab: (tab: LibraryTab) => void
  onLocate: (layer: Layer, traffic: Traffic, node: string) => void
  onReading: () => void
  example: ExampleView | null
  onExample: (v: ExampleView | null) => void
  onChooseExample: (id: ExampleId) => void
  onCompare: () => void
  lifecycle: LifecycleView
  onLifecycle: (view: LifecycleView) => void
  onLifecycleCompare: () => void
  issue: IssueView
  onIssue: (v: IssueView) => void
  onIssueMethodology: () => void
}) {
  const match = (value: string) =>
    value.toLowerCase().includes(query.toLowerCase())
  const concepts = Object.values(details).filter((d) =>
    match(`${d.title} ${d.description} ${d.problem} ${d.solution}`),
  )
  const terms = glossary.filter(([term, description]) =>
    match(`${term} ${description}`),
  )
  const references = sources.filter((s) =>
    match(`${s.title} ${s.org} ${s.note}`),
  )
  return (
    <div className="learn-library-content">
      <div className="learn-surface-kicker">
        <BookOpen size={14} />
        KNOWLEDGE IN CONTEXT
      </div>
      <h2>
        {tab === 'models'
          ? 'Real models. Different pipelines.'
          : 'A concept has a place.'}
      </h2>
      <p>
        {tab === 'models'
          ? 'Explore how text, images, video, music, and speech move through real model pipelines.'
          : 'Find the idea, then locate the part of the infrastructure where it matters.'}
      </p>
      {tab !== 'hot' &&
        tab !== 'lifecycle' &&
        !(tab === 'models' && example) && (
          <label className="learn-library-search">
            <Search size={16} />
            <input
              type="search"
              aria-label="Search learning library"
              placeholder={
                tab === 'models'
                  ? 'Kimi, Qwen, video, music, speech…'
                  : 'Memory, attention, routing…'
              }
              value={query}
              onChange={(e) => onQuery(e.target.value)}
            />
          </label>
        )}
      <nav
        className="learn-library-tabs"
        aria-label="Learning library sections"
      >
        {(
          [
            'concepts',
            'glossary',
            'sources',
            'models',
            'lifecycle',
            'hot',
          ] as LibraryTab[]
        ).map((t) => (
          <button key={t} aria-pressed={t === tab} onClick={() => onTab(t)}>
            {t === 'hot'
              ? 'Hot issues'
              : t === 'lifecycle'
                ? 'AI lifecycle'
                : t === 'concepts'
                  ? 'Problems & solutions'
                  : t === 'glossary'
                    ? 'Glossary'
                    : t === 'models'
                      ? 'Real models'
                      : 'Primary sources'}
          </button>
        ))}
      </nav>
      {tab === 'hot' ? (
        <HotIssuesStudy
          view={issue}
          onChange={onIssue}
          onMethodology={onIssueMethodology}
        />
      ) : tab === 'lifecycle' ? (
        <LifecycleStudy
          view={lifecycle}
          onChange={onLifecycle}
          onCompare={onLifecycleCompare}
        />
      ) : tab === 'models' ? (
        example ? (
          <ModelStudy
            view={example}
            onChange={onExample}
            onCatalog={() => onExample(null)}
            onCompare={onCompare}
          />
        ) : (
          <ModelCatalog
            query={query}
            onChoose={onChooseExample}
            onCompare={onCompare}
          />
        )
      ) : tab === 'concepts' ? (
        <div className="learn-concept-cards">
          {concepts.map((d) => (
            <article
              key={d.id}
              style={{ '--concept-color': d.color } as React.CSSProperties}
            >
              <span>{d.tag}</span>
              <h3>{d.title}</h3>
              <p>{d.description}</p>
              <div>
                <small>THE PROBLEM</small>
                <p>{d.problem}</p>
                <small>A RESPONSE</small>
                <p>{d.solution}</p>
              </div>
              <button
                onClick={() => {
                  const w = detailWorlds[d.id] || {
                    layer: 'fleet' as Layer,
                    traffic: 'requests' as Traffic,
                  }
                  onLocate(w.layer, w.traffic, d.id)
                }}
              >
                Locate {d.title} in 3D
                <ArrowRight size={14} />
              </button>
            </article>
          ))}
          {!concepts.length && <p>No matching concepts. Try another term.</p>}
        </div>
      ) : tab === 'glossary' ? (
        <div className="learn-glossary">
          {terms.map(([term, description]) => (
            <article key={term}>
              <h3>{term}</h3>
              <p>{description}</p>
              <button
                onClick={() => {
                  const w = conceptWorld(term)
                  onLocate(w.layer, w.traffic, w.node)
                }}
              >
                See this in the world
                <ArrowUpRight size={13} />
              </button>
            </article>
          ))}
          {!terms.length && <p>No matching glossary entries.</p>}
        </div>
      ) : (
        <div className="learn-source-list">
          {references.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
              <span>{s.org}</span>
              <h3>
                {s.title}
                <ArrowUpRight size={14} />
              </h3>
              <p>{s.note}</p>
            </a>
          ))}
          {!references.length && <p>No matching sources.</p>}
        </div>
      )}
      <button className="learn-reading-link" onClick={onReading}>
        <BookOpen size={15} />
        Open the complete field guide
        <ArrowUpRight size={13} />
      </button>
    </div>
  )
}
