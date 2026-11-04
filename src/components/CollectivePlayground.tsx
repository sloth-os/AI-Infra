import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Check,
  ChevronRight,
  Network,
  Pause,
  Play,
  RotateCcw,
} from 'lucide-react'
import { ringAllReduce, RANKS } from '../collective'

const chunkColors = [
  '#b9a0df',
  '#91b9da',
  '#72beb6',
  '#b3c880',
  '#d5c17b',
  '#d7a783',
  '#cb98ae',
  '#9fa1d3',
]

export default function CollectivePlayground() {
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [rank, setRank] = useState(0)
  const { buffers, counts } = ringAllReduce(step)
  const complete = step === 14
  const phase =
    step === 0
      ? 'Ready to exchange'
      : step <= 7
        ? 'Reduce-scatter'
        : complete
          ? 'All-reduce complete'
          : 'All-gather'
  const positions = Array.from({ length: RANKS }, (_, i) => ({
    x: 300 + 211 * Math.cos(-Math.PI / 2 + (i / RANKS) * Math.PI * 2),
    y: 164 + 113 * Math.sin(-Math.PI / 2 + (i / RANKS) * Math.PI * 2),
  }))

  useEffect(() => {
    if (!playing) return
    const timer = window.setTimeout(() => {
      if (step >= 14) setPlaying(false)
      else setStep((s) => s + 1)
    }, 1100)
    return () => window.clearTimeout(timer)
  }, [playing, step])

  return (
    <section
      className="collective-playground"
      aria-label="Ring all-reduce playground"
    >
      <div className="collective-heading">
        <div>
          <span className="card-eyebrow">
            <Network size={14} /> THE COLLECTIVE PLAYGROUND
          </span>
          <h2>Eight GPUs. One shared answer.</h2>
          <p>
            Step through a real ring all-reduce algorithm. Each GPU starts with
            eight copies of its rank + 1. The goal: every GPU gets the sum, 36,
            in every chunk.
          </p>
        </div>
        <span className="outline-badge">8 ranks · 8 chunks · 14 exchanges</span>
      </div>
      <div className="collective-workspace">
        <div className="ring-diagram">
          <svg
            viewBox="0 0 600 330"
            role="img"
            aria-label={`Ring all-reduce, exchange ${step} of 14. ${phase}. Select a GPU below to inspect its chunks.`}
          >
            <defs>
              <marker
                id="ring-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b593" />
              </marker>
            </defs>
            {positions.map((from, i) => {
              const to = positions[(i + 1) % RANKS]
              const delta = { x: to.x - from.x, y: to.y - from.y }
              const distance = Math.hypot(delta.x, delta.y)
              const start = {
                x: from.x + (delta.x / distance) * 40,
                y: from.y + (delta.y / distance) * 28,
              }
              const end = {
                x: to.x - (delta.x / distance) * 40,
                y: to.y - (delta.y / distance) * 28,
              }
              return (
                <g key={`edge${i}`}>
                  <line
                    x1={start.x}
                    y1={start.y}
                    x2={end.x}
                    y2={end.y}
                    stroke={step > 0 ? '#8ea67b' : '#d5deca'}
                    strokeWidth="1.2"
                    markerEnd="url(#ring-arrow)"
                  />
                  {playing && (
                    <circle
                      r="3"
                      fill={chunkColors[(i - Math.min(step, 7) + 16) % 8]}
                    >
                      <animateMotion
                        dur="1.1s"
                        repeatCount="indefinite"
                        path={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                      />
                    </circle>
                  )}
                </g>
              )
            })}
            <text x="300" y="142" textAnchor="middle" className="ring-phase">
              {phase}
            </text>
            <text x="300" y="166" textAnchor="middle" className="ring-step">
              {step === 0 ? 'Start with local values' : `Exchange ${step} / 14`}
            </text>
            <text x="300" y="189" textAnchor="middle" className="ring-result">
              {complete
                ? 'Every chunk = 36 ✓'
                : step <= 7
                  ? 'Add incoming partial sums'
                  : 'Copy the fully reduced chunks'}
            </text>
            {positions.map((p, i) => (
              <g key={i} transform={`translate(${p.x - 42},${p.y - 25})`}>
                <rect
                  width="84"
                  height="51"
                  rx="7"
                  fill={rank === i ? '#e7efda' : '#f4f7ee'}
                  stroke={rank === i ? '#a2b987' : '#dfe6d5'}
                />
                <text x="42" y="17" textAnchor="middle" className="rank-label">
                  GPU {i}
                </text>
                {buffers[i].map((value, chunk) => (
                  <g key={chunk}>
                    <rect
                      x={7 + chunk * 9}
                      y="27"
                      width="7"
                      height="14"
                      rx="1.5"
                      fill={chunkColors[chunk]}
                      fillOpacity={0.3 + (counts[i][chunk] / 8) * 0.7}
                    >
                      <title>{`GPU ${i}, chunk ${chunk}: ${value} (${counts[i][chunk]} contributions)`}</title>
                    </rect>
                  </g>
                ))}
              </g>
            ))}
          </svg>
          <div className="ring-controls">
            <button
              className="button button-light"
              aria-label="Reset collective"
              onClick={() => {
                setStep(0)
                setPlaying(false)
              }}
            >
              <RotateCcw size={14} />
              Reset
            </button>
            <button
              className="button button-light"
              onClick={() => {
                if (complete) setStep(0)
                setPlaying(!playing)
              }}
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? 'Pause collective' : 'Play collective'}
            </button>
            <button
              className="button button-dark"
              onClick={() => {
                setPlaying(false)
                setStep((s) => Math.min(14, s + 1))
              }}
              disabled={complete}
            >
              Next exchange <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <aside className="ring-inspector">
          <span className="small-label">INSPECT A RANK</span>
          <div className="rank-picker">
            {positions.map((_, i) => (
              <button
                key={i}
                className={rank === i ? 'active' : ''}
                onClick={() => setRank(i)}
                aria-label={`Inspect rank ${i}`}
                aria-pressed={rank === i}
              >
                {i}
              </button>
            ))}
          </div>
          <h3>GPU {rank}’s vector</h3>
          <div
            className="chunk-values"
            aria-label={`Rank ${rank} chunk values`}
          >
            {buffers[rank].map((value, i) => (
              <div key={i} style={{ borderColor: chunkColors[i] }}>
                <small>C{i}</small>
                <strong>{value}</strong>
                <span>{counts[rank][i]}/8</span>
              </div>
            ))}
          </div>
          <div className="ring-status" aria-live="polite">
            {complete ? <Check size={16} /> : <ArrowRight size={16} />}
            <p>
              {complete
                ? 'All eight chunks now contain all eight contributions. Every rank has the identical reduced vector.'
                : step === 0
                  ? 'Each chunk contains only this GPU’s local contribution. No data has moved yet.'
                  : step <= 7
                    ? 'Each rank sends one chunk clockwise and adds the chunk arriving from its neighbor. After seven exchanges, each rank owns one complete sum.'
                    : 'Now pass completed chunks clockwise without adding them again. Seven more exchanges replicate the full reduced vector everywhere.'}
            </p>
          </div>
          <div className="ring-cost">
            <span className="small-label">WHY BANDWIDTH MATTERS</span>
            <code>
              14 steps · 1/8 vector per step
              <br />
              Bytes sent / rank = 1.75 × vector size
            </code>
            <p>
              For n ranks and M bytes: 2(n−1) steps, with M/n bytes per step. A
              simple time model is 2(n−1)α + 2(n−1)M/(nB). Actual NCCL may
              select ring, tree, or topology-specific algorithms.
            </p>
          </div>
        </aside>
      </div>
    </section>
  )
}
