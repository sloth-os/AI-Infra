import { ChevronLeft, ChevronRight, Crosshair, Pause } from 'lucide-react'
import type { GameState, Job, JobPhase } from './model'
import { kvBytes } from '../model'

export const REQUEST_STAGES: Record<
  JobPhase,
  { label: string; detail: string }
> = {
  queued: {
    label: 'Admission',
    detail: 'The router waits for a free prefill engine and enough KV memory.',
  },
  prefill: {
    label: 'Prefill',
    detail:
      'Prompt tokens become embeddings, then attention computes keys and values for every layer.',
  },
  ready: {
    label: 'Await decode',
    detail:
      'Prefill is complete. The scheduler waits for an available decode slot.',
  },
  transfer: {
    label: 'KV handoff',
    detail:
      'Keys and values cross the shared fabric. The payload is much larger than the original prompt text.',
  },
  decode: {
    label: 'Decode',
    detail:
      'Each iteration attends to retained KV, emits a new token, and extends the sequence.',
  },
  done: {
    label: 'Stream',
    detail:
      'The response reaches its user. The reservation is released for the next request.',
  },
}
const steps: JobPhase[] = ['queued', 'prefill', 'transfer', 'decode', 'done']

export function RequestLens({
  state,
  job,
  onSelect,
  onPause,
}: {
  state: GameState
  job: Job | undefined
  onSelect: (id: number | null) => void
  onPause: () => void
}) {
  const jobs = state.jobs.filter((j) => j.phase !== 'done')
  const index = jobs.findIndex((j) => j.id === job?.id)
  const cycle = (direction: number) => {
    if (jobs.length)
      onSelect(
        jobs[(Math.max(0, index) + direction + jobs.length) % jobs.length].id,
      )
  }
  const phase = job?.phase === 'ready' ? 'transfer' : job?.phase
  const failed = job?.phase === 'done' && job.generated < job.output
  return (
    <section className="game-request-lens" aria-label="Live request inspector">
      <div className="game-request-heading">
        <span>
          <Crosshair size={12} /> LIVE REQUEST LENS
        </span>
        <div>
          <button
            onClick={() => cycle(-1)}
            aria-label="Inspect previous request"
            disabled={!jobs.length}
          >
            <ChevronLeft size={13} />
          </button>
          <button
            onClick={() => cycle(1)}
            aria-label="Inspect next request"
            disabled={!jobs.length}
          >
            <ChevronRight size={13} />
          </button>
          <button
            onClick={onPause}
            aria-label="Pause to inspect request"
            disabled={state.phase !== 'playing'}
          >
            <Pause size={12} />
          </button>
        </div>
      </div>
      {job ? (
        <>
          <div className="game-request-summary">
            <strong>
              REQ {String(job.id).padStart(3, '0')}{' '}
              <small>· TENANT {job.tenant + 1}</small>
            </strong>
            <span
              className={
                state.time - job.born > job.deadline * 0.75 ? 'danger' : ''
              }
            >
              {Math.max(0, job.deadline - (state.time - job.born)).toFixed(1)}s
              to deadline
            </span>
          </div>
          <ol>
            {steps.map((step, i) => (
              <li
                key={step}
                className={`${step === phase ? (failed ? 'danger' : 'current') : ''} ${phase && i < steps.indexOf(phase) ? 'complete' : ''}`}
              >
                <i />
                {step === 'done' && failed
                  ? 'Expired'
                  : REQUEST_STAGES[step].label}
              </li>
            ))}
          </ol>
          <div className="game-request-bytes">
            <span>
              <b>{job.input.toLocaleString()}</b> prompt tokens
            </span>
            <span>
              <b>{(kvBytes(job.input) / 2 ** 20).toFixed(0)} MiB</b> prompt KV
            </span>
            <span>
              <b>
                {Math.floor(job.generated + 1e-6)} / {job.output}
              </b>{' '}
              output tokens
            </span>
            {job.cacheHit && <em>PREFIX HIT</em>}
          </div>
          <p>
            {failed
              ? 'The deadline expired before the answer was complete. Memory was released and service integrity was damaged.'
              : REQUEST_STAGES[job.phase].detail}
          </p>
        </>
      ) : (
        <div className="game-request-idle">
          The next request is on its way. Build a prefill + decode path to give
          it somewhere to go.
        </div>
      )}
    </section>
  )
}
