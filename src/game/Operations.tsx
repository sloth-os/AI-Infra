import { useState } from 'react'
import {
  Check,
  ChevronDown,
  Gauge,
  ShieldCheck,
  Waves,
  Zap,
} from 'lucide-react'
import { MODULES, PADS, SURGE, getGameMetrics, serviceContracts } from './model'
import type { DispatchPolicy, GameAction, GameState } from './model'
import './operations.css'
export function GameOperations({
  state: s,
  onAction,
}: {
  state: GameState
  onAction: (action: GameAction) => unknown
}) {
  const [selected, setSelected] = useState<number | null>(null),
    [expanded, setExpanded] = useState(false)
  const units = s.units.filter((u) => u.type !== 'cache'),
    target = units.find((u) => u.id === selected) || units[0]
  const m = getGameMetrics(s),
    cooldown = Math.max(0, s.surgeReadyAt - s.time),
    active = Math.max(0, s.surgeUntil - s.time)
  const canSurge =
    !!target &&
    cooldown === 0 &&
    s.energy >= SURGE.cost &&
    m.power + SURGE.power <= m.maxPower &&
    target.offlineUntil <= s.time
  return (
    <section className="game-operations" aria-label="Live operations console">
      <span className="ops-kicker">
        <Gauge size={13} /> LIVE OPERATIONS{' '}
        <small>{s.streak} delivery streak</small>
      </span>
      <h3>Schedule. Reserve. Recover.</h3>
      <label className="ops-select">
        Queue scheduling policy
        <select
          aria-label="Queue scheduling policy"
          value={s.dispatchPolicy}
          onChange={(e) =>
            onAction({
              type: 'dispatch',
              policy: e.target.value as DispatchPolicy,
            })
          }
        >
          <option value="fifo">FIFO · oldest arrival first</option>
          <option value="deadline">Earliest deadline first</option>
          <option value="shortest">Shortest prompt first</option>
        </select>
      </label>
      <p>
        {s.dispatchPolicy === 'fifo'
          ? 'Predictable arrival order. An expensive head request can delay smaller requests.'
          : s.dispatchPolicy === 'deadline'
            ? 'Uses absolute expiry time (arrival + deadline), so urgent waiting requests go first.'
            : 'Prioritizes smaller prompts. Long requests can wait longer or miss their deadline.'}{' '}
        Running requests keep their worker; this is not preemption.
      </p>
      <label className="ops-check">
        <input
          type="checkbox"
          aria-label="Allow memory backfill"
          checked={s.memoryBackfill}
          onChange={(e) =>
            onAction({ type: 'backfill', enabled: e.target.checked })
          }
        />
        Let fitting requests bypass a memory-blocked head
      </label>
      <div className={`ops-capacitor ${active ? 'surging' : ''}`}>
        <div>
          <span>
            <Zap size={12} />
            Reserve capacitor
          </span>
          <strong>
            {Math.floor(s.energy)}
            <small> / 100</small>
          </strong>
        </div>
        <div
          className="ops-energy"
          role="meter"
          aria-label="Reserve energy"
          aria-valuenow={Math.floor(s.energy)}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${s.energy}%` }} />
        </div>
        <label className="ops-select">
          Reserve target
          <select
            aria-label="Capacity reserve target"
            value={target?.id ?? ''}
            disabled={!target}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            {!target && (
              <option value="">Build a compute engine or switch</option>
            )}
            {units.map((u) => (
              <option value={u.id} key={u.id}>
                {PADS[u.pad].name} · {MODULES[u.type].name} L{u.level}
              </option>
            ))}
          </select>
        </label>
        <button
          className="ops-surge"
          disabled={!canSurge}
          onClick={() => target && onAction({ type: 'surge', unit: target.id })}
        >
          <Zap size={14} />
          {active
            ? `Surge active · ${active.toFixed(1)}s`
            : cooldown
              ? `Reserve cooldown · ${cooldown.toFixed(1)}s`
              : 'Activate capacity surge'}
        </button>
        <p>
          {SURGE.multiplier}× one engine’s compute or one switch’s bandwidth for{' '}
          {SURGE.duration}s. Costs {SURGE.cost} energy and reserves +
          {SURGE.power} power; {SURGE.cooldown}s cooldown, +{SURGE.recharge}{' '}
          energy/s while running.{' '}
          {s.phase === 'paused'
            ? 'Armed effects wait for the simulation to resume.'
            : ''}
        </p>
      </div>
      <button
        className="ops-contract-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <ShieldCheck size={14} />
        Optional service contracts
        <ChevronDown size={13} />
      </button>
      {expanded && (
        <div className="ops-contracts">
          {serviceContracts(s).map((c) => (
            <article key={c.id}>
              <div>
                <strong>{c.title}</strong>
                <span>
                  {s.claimed.includes(c.id)
                    ? 'CLAIMED'
                    : `${c.progress}/${c.goal}`}
                </span>
              </div>
              <p>{c.detail}</p>
              <button
                disabled={!c.ready || s.claimed.includes(c.id)}
                onClick={() => onAction({ type: 'claim', contract: c.id })}
              >
                {s.claimed.includes(c.id) ? (
                  <>
                    <Check size={12} />
                    Reward claimed
                  </>
                ) : (
                  `Claim ${c.reward} credits + 150 score`
                )}
              </button>
            </article>
          ))}
        </div>
      )}
      {s.mission === 'sandbox' && (
        <div className="ops-drills">
          <span className="ops-kicker">
            <Waves size={13} />
            SANDBOX STRESS DRILLS
          </span>
          <p>
            Inject up to 8 real requests into the existing queue. They reserve
            KV and can miss deadlines. Fifteen-second drill cooldown.
          </p>
          <div>
            <button
              disabled={s.time < s.drillReadyAt}
              onClick={() => onAction({ type: 'drill', kind: 'burst' })}
            >
              Launch burst drill
            </button>
            <button
              disabled={s.time < s.drillReadyAt}
              onClick={() => onAction({ type: 'drill', kind: 'context' })}
            >
              Launch context drill
            </button>
          </div>
          {s.time < s.drillReadyAt && (
            <small>
              Drill ready in {(s.drillReadyAt - s.time).toFixed(1)}s
            </small>
          )}
        </div>
      )}
      <p className="ops-scope">
        Game rules and synthetic rates. These controls illustrate scheduling,
        headroom and bottleneck trade-offs; reserve factors are not GPU
        specifications.
      </p>
    </section>
  )
}
