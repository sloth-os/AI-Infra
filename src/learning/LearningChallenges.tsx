import { useState } from 'react'
import {
  ArrowDown,
  Check,
  ChevronDown,
  Lightbulb,
  RotateCcw,
  Star,
  Target,
  Trophy,
} from 'lucide-react'
import {
  evaluateChallenge,
  learningChallenges,
  readChallengeProgress,
} from './challenges'
import type { ChallengeId, LearningChallenge } from './challenges'
import type { Parameters, Strategy } from '../model'
import './challenges.css'
const key = 'strata-learning-challenges-v1'
function load() {
  try {
    return readChallengeProgress(localStorage.getItem(key))
  } catch {
    return {}
  }
}
export default function LearningChallenges({
  params,
  strategy,
  onLoad,
}: {
  params: Parameters
  strategy: Strategy
  onLoad: (challenge: LearningChallenge) => void
}) {
  const [open, setOpen] = useState(false),
    [active, setActive] = useState<ChallengeId | null>(null),
    [attempts, setAttempts] = useState(0),
    [hint, setHint] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [progress, setProgress] = useState(load)
  const c = learningChallenges.find((c) => c.id === active),
    outcome = active ? evaluateChallenge(active, params, strategy) : null
  const start = (id: ChallengeId) => {
    const mission = learningChallenges.find((c) => c.id === id)!
    setActive(id)
    setAttempts(0)
    setHint(false)
    setSubmitted(false)
    onLoad(mission)
  }
  const submit = () => {
    setAttempts((n) => n + 1)
    setSubmitted(true)
    if (c && outcome?.pass) {
      const stars = hint ? 1 : attempts > 1 ? 2 : 3,
        next = { ...progress, [c.id]: Math.max(progress[c.id] || 0, stars) }
      setProgress(next)
      try {
        localStorage.setItem(key, JSON.stringify(next))
      } catch {
        /* Progress is optional. */
      }
    }
  }
  return (
    <section
      className={`learn-challenges ${c ? 'has-challenge' : ''}`}
      aria-label="Learning challenge missions"
    >
      <button
        className="challenge-toggle"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <Target size={16} />
        <span>
          Learn by solving
          <small>
            {Object.keys(progress).length} / 4 missions mastered ·{' '}
            {(Object.values(progress) as number[]).reduce(
              (a, b) => a + b * 100,
              0,
            )}{' '}
            XP
          </small>
        </span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="challenge-body">
          <p>
            Take an infrastructure brief, change the controls, then prove the
            design with the same model that drives the 3D world. There is no
            time limit.
          </p>
          <div className="challenge-catalog">
            {learningChallenges.map((m, i) => (
              <button
                key={m.id}
                aria-pressed={active === m.id}
                onClick={() => start(m.id)}
              >
                <span>
                  0{i + 1}
                  <small>{m.subtitle}</small>
                </span>
                <strong>{m.title}</strong>
                <small
                  className="challenge-stars"
                  aria-label={`${progress[m.id] || 0} stars`}
                >
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      size={10}
                      fill={
                        (progress[m.id] || 0) >= n ? 'currentColor' : 'none'
                      }
                    />
                  ))}
                </small>
              </button>
            ))}
          </div>
          {c && outcome && (
            <div className="challenge-mission">
              <span>ACTIVE BRIEF · {c.subtitle}</span>
              <h3>{c.title}</h3>
              <p>{c.brief}</p>
              <div className="challenge-checks">
                {outcome.checks.map((check) => (
                  <div key={check.label} data-pass={check.pass}>
                    <i>
                      {check.pass ? <Check size={12} /> : <Target size={12} />}
                    </i>
                    <span>
                      {check.label}
                      <small>{check.detail}</small>
                    </span>
                  </div>
                ))}
              </div>
              <div className="challenge-actions">
                <button onClick={submit}>
                  <Check size={13} />
                  Check my solution
                </button>
                <button
                  aria-label="Show challenge hint"
                  onClick={() => setHint(true)}
                >
                  <Lightbulb size={13} />
                  Hint
                </button>
                <button
                  aria-label="Reset active challenge"
                  onClick={() => start(c.id)}
                >
                  <RotateCcw size={13} />
                </button>
              </div>
              {hint && <p className="challenge-hint">{c.hint}</p>}
              {submitted && (
                <div
                  role="status"
                  className={`challenge-result ${outcome.pass ? 'complete' : ''}`}
                >
                  {outcome.pass ? <Trophy size={16} /> : <Target size={16} />}
                  <span>
                    {outcome.pass
                      ? 'Design validated. Mission mastered.'
                      : 'Keep iterating: the unmet requirements are listed above.'}
                    <small>
                      {outcome.pass
                        ? `${progress[c.id] || 0} stars recorded · ${hint ? 'Try another run without a hint for more stars.' : 'The saved result is your best for this mission.'}`
                        : 'You can compare strategies and adjust the controls below.'}
                    </small>
                  </span>
                </div>
              )}
              <p className="challenge-scroll">
                <ArrowDown size={12} />
                Use the live strategy and workload controls below.
              </p>
            </div>
          )}
          <p className="challenge-scope">
            Synthetic dense 70B / TP=8 teaching model. Stars measure puzzle
            completion, not production readiness. Your best results stay in this
            browser.
          </p>
        </div>
      )}
    </section>
  )
}
