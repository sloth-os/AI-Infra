import { useState } from 'react'
import {
  ArrowUpRight,
  Check,
  Copy,
  FlaskConical,
  Gauge,
  Network,
  Settings2,
} from 'lucide-react'
import { duration, formatNumber, kvBytes, simulate } from '../model'
import type { Parameters, Strategy } from '../model'
import { learningScenarioUrl } from './model'
import LearningChallenges from './LearningChallenges'
import type { LearningChallenge } from './challenges'

export const strategyNames: Record<Strategy, string> = {
  static: 'Static batching',
  continuous: 'Continuous batching',
  disaggregated: 'Split prefill & decode',
}
const strategies: Strategy[] = ['static', 'continuous', 'disaggregated']
const controls: {
  key: keyof Parameters
  label: string
  min: number
  max: number
  step: number
  unit: string
}[] = [
  {
    key: 'gpus',
    label: 'Modeled GPUs',
    min: 80,
    max: 100000,
    step: 80,
    unit: 'GPUs',
  },
  {
    key: 'arrivalRate',
    label: 'Incoming traffic',
    min: 100,
    max: 50000,
    step: 100,
    unit: 'req/s',
  },
  {
    key: 'inputTokens',
    label: 'Prompt length',
    min: 128,
    max: 32768,
    step: 128,
    unit: 'tokens',
  },
  {
    key: 'outputTokens',
    label: 'Output length',
    min: 32,
    max: 2048,
    step: 32,
    unit: 'tokens',
  },
  {
    key: 'batchSize',
    label: 'Active batch limit',
    min: 1,
    max: 256,
    step: 1,
    unit: 'sequences',
  },
  {
    key: 'networkGbps',
    label: 'Fabric endpoint',
    min: 25,
    max: 800,
    step: 25,
    unit: 'Gb/s',
  },
  {
    key: 'prefixHit',
    label: 'Reusable prompt prefix',
    min: 0,
    max: 90,
    step: 5,
    unit: '%',
  },
  {
    key: 'prefillShare',
    label: 'Prefill pool allocation',
    min: 10,
    max: 90,
    step: 5,
    unit: '%',
  },
]
export default function LearningLab({
  params,
  strategy,
  onStrategy,
  onParameters,
  onPreset,
  onWorkbench,
  onChallengeWorld,
}: {
  params: Parameters
  strategy: Strategy
  onStrategy: (s: Strategy) => void
  onParameters: (p: Parameters) => void
  onPreset: (id: string) => void
  onWorkbench: () => void
  onChallengeWorld?: (challenge: LearningChallenge) => void
}) {
  const [copied, setCopied] = useState(false)
  const result = simulate(params, strategy),
    outcomes = strategies.map((s) => ({
      strategy: s,
      result: simulate(params, s),
    }))
  const max = Math.max(
    params.arrivalRate,
    ...outcomes.map((o) => o.result.capacity),
  )
  const copy = async () => {
    const url = learningScenarioUrl(location.href, params, strategy)
    history.replaceState({}, '', url)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="learn-lab-content">
      <div className="learn-surface-kicker">
        <FlaskConical size={14} />
        THE TRADE-OFF LAB
      </div>
      <h2>Move the bottleneck.</h2>
      <p>
        Change the workload. Compare three serving strategies. The world’s load
        overlay and payload sizes use the same parameters.
      </p>
      <LearningChallenges
        params={params}
        strategy={strategy}
        onLoad={(c) => {
          onParameters({ ...c.initial })
          onStrategy(c.strategy)
          onChallengeWorld?.(c)
        }}
      />
      <div className="learn-presets">
        {[
          ['baseline', 'Baseline'],
          ['burst', 'Traffic spike'],
          ['context', 'Long context'],
          ['network', 'Slow fabric'],
        ].map(([id, label]) => (
          <button key={id} onClick={() => onPreset(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="learn-strategies" aria-label="Serving strategy">
        {strategies.map((s, i) => (
          <button
            key={s}
            aria-pressed={strategy === s}
            onClick={() => onStrategy(s)}
          >
            <span>0{i + 1}</span>
            {strategyNames[s]}
          </button>
        ))}
      </div>
      <div
        className={`learn-model-status ${result.stable ? 'stable' : 'overloaded'}`}
        role="status"
      >
        <Gauge size={17} />
        <span>
          {result.stable
            ? 'Within modeled capacity'
            : 'Over capacity: the queue grows without bound.'}
          <small>
            {formatNumber(result.capacity)} req/s capacity ·{' '}
            {Math.round(result.utilization * 100)}% offered load
          </small>
        </span>
      </div>
      <div className="learn-outcome-grid">
        <div>
          <span>First token estimate</span>
          <strong>
            {result.stable ? duration(result.ttftMs) : 'Over capacity'}
          </strong>
        </div>
        <div>
          <span>Time per output token</span>
          <strong>{duration(result.tpotMs)}</strong>
        </div>
        <div>
          <span>Model replicas</span>
          <strong>{formatNumber(result.replicas)}</strong>
        </div>
        <div>
          <span>KV handoff</span>
          <strong>{duration(result.transferMs)}</strong>
        </div>
      </div>
      <div className="learn-lab-controls">
        {controls.map((c) => (
          <label
            key={c.key}
            className={
              c.key === 'prefillShare' && strategy !== 'disaggregated'
                ? 'inactive'
                : ''
            }
          >
            <span>
              {c.label}
              <strong>
                {params[c.key].toLocaleString()}
                <small>{c.unit}</small>
              </strong>
            </span>
            <input
              type="range"
              aria-label={c.label}
              min={c.min}
              max={c.max}
              step={c.step}
              value={params[c.key]}
              disabled={
                c.key === 'prefillShare' && strategy !== 'disaggregated'
              }
              onChange={(e) =>
                onParameters({ ...params, [c.key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      <div
        className="learn-capacity-comparison"
        aria-label="Strategy capacity comparison"
      >
        <h3>Same fleet. Different constraints.</h3>
        {outcomes.map((o) => (
          <div key={o.strategy}>
            <span>
              {strategyNames[o.strategy]}
              <b>{formatNumber(o.result.capacity)} req/s</b>
            </span>
            <div>
              <i style={{ width: `${(o.result.capacity / max) * 100}%` }} />
              <em
                style={{
                  left: `${Math.min(100, (params.arrivalRate / max) * 100)}%`,
                }}
              />
            </div>
            <small>
              {o.result.stable
                ? `${duration(o.result.ttftMs)} first token`
                : 'Queue cannot reach steady state'}
            </small>
          </div>
        ))}
      </div>
      <div className="learn-lab-note">
        <Network size={15} />
        <p>
          {(kvBytes(params.inputTokens) / 2 ** 20).toFixed(0)} MiB of prompt KV
          across eight ranks. Split serving models the handoff; colocated
          serving skips it. The 3D schematic illustrates both paths.
        </p>
      </div>
      <p className="learn-assumption-note">
        Synthetic 70B BF16 model · TP = 8 · 70% useful network efficiency.
        Estimates are not benchmarks. Geometry represents a reference
        architecture.
      </p>
      <div className="learn-panel-actions">
        <button onClick={() => void copy()}>
          {copied ? <Check size={14} /> : <Copy size={14} />}{' '}
          {copied ? 'Scenario copied' : 'Copy learning scenario'}
        </button>
        <button onClick={onWorkbench}>
          <Settings2 size={14} />
          Full workbench
          <ArrowUpRight size={13} />
        </button>
      </div>
    </div>
  )
}
