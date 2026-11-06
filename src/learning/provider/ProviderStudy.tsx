import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Check,
  Cloud,
  Copy,
  RotateCcw,
} from 'lucide-react'
import type { Layer } from '../../content'
import type { LifecyclePhase } from '../../lifecycle/catalog'
import {
  PROVIDER_DECISIONS,
  PROVIDER_LESSONS,
  PROVIDER_SOURCES,
} from '../../game/provider/catalog'
import { POLICIES, providerMetrics, TENANTS } from '../../game/provider/model'
import type { Tenant } from '../../game/provider/model'
import {
  hasPolicy,
  providerLessonUrl,
  replaySnapshot,
  resourceEnvelope,
} from './model'
import type { ProviderLesson } from './model'
import './provider-learning.css'

export function ProviderStudy({
  view,
  layer,
  onChange,
  onWorkload,
  onGame,
}: {
  view: ProviderLesson
  layer: Layer
  onChange: (v: ProviderLesson) => void
  onWorkload: (phase: LifecyclePhase) => void
  onGame: () => void
}) {
  const r = replaySnapshot(view),
    [copied, setCopied] = useState(false)
  useEffect(() => setCopied(false), [view])
  const update = (next: Partial<ProviderLesson>) =>
    onChange({ ...view, ...next, playing: false })
  const changePlan = (mask: number) =>
    update({ policies: mask, time: 0, side: 'plan' })
  const share = async () => {
    try {
      await navigator.clipboard.writeText(
        providerLessonUrl(location.href, view),
      )
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }
  const rows = [
    [
      'Training jobs committed',
      r.baseline.completed.train,
      r.plan.completed.train,
    ],
    ['Tuning jobs committed', r.baseline.completed.tune, r.plan.completed.tune],
    ['API requests delivered', r.baseline.served, r.plan.served],
    [
      'Free GPUs / empty servers',
      `${providerMetrics(r.baseline).free} / ${providerMetrics(r.baseline).emptyServers}`,
      `${providerMetrics(r.plan).free} / ${providerMetrics(r.plan).emptyServers}`,
    ],
    [
      'Fabric transferred (GiB)',
      r.baseline.wireGiB.toFixed(1),
      r.plan.wireGiB.toFixed(1),
    ],
    ['Actual local cache hits', r.baseline.cacheHits, r.plan.cacheHits],
    ['Runtime OOM events', r.baseline.oom, r.plan.oom],
    [
      'Compute lost (GPU-s)',
      r.baseline.wastedGpuSeconds.toFixed(1),
      r.plan.wastedGpuSeconds.toFixed(1),
    ],
    [
      'Peak-ready delay (s)',
      r.baseline.burstReady === null
        ? 'Pending'
        : r.baseline.burstReady.toFixed(1),
      r.plan.burstReady === null ? 'Pending' : r.plan.burstReady.toFixed(1),
    ],
    [
      'Leased GPU-seconds',
      r.baseline.leasedGpuSeconds.toFixed(1),
      r.plan.leasedGpuSeconds.toFixed(1),
    ],
    [
      'Committed useful GPU-s',
      r.baseline.usefulGpuSeconds.toFixed(1),
      r.plan.usefulGpuSeconds.toFixed(1),
    ],
  ]
  return (
    <div
      className="model-study-content provider-study"
      data-testid="cloud-provider-study"
      data-replay-time={r.time.toFixed(2)}
      data-snapshot-time={r.state.time.toFixed(2)}
      data-side={view.side}
    >
      <div className="model-study-actions">
        <span>
          <Cloud size={14} />
          CLOUD PROVIDER LAB
        </span>
        <button
          aria-label="Share cloud provider lesson"
          onClick={() => void share()}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Share'}
        </button>
      </div>
      <nav
        className="model-detail-tabs"
        aria-label="Cloud provider lesson sections"
      >
        {(['service', 'lab', 'sources'] as const).map((tab) => (
          <button
            key={tab}
            aria-pressed={view.panel === tab}
            onClick={() => update({ panel: tab })}
          >
            {tab === 'service'
              ? 'Service boundary'
              : tab === 'lab'
                ? 'Capacity lab'
                : 'Evidence'}
          </button>
        ))}
      </nav>
      {view.panel === 'lab' ? (
        <>
          <div className="provider-learning-intro">
            <h3>Compare the same arrivals on the same devices.</h3>
            <p>
              Both runs start with eight warm two-GPU inference replicas, one on
              every server. Nova requests training; Forge requests tuning; Orbit
              grows from eight to twelve replicas at 18 teaching seconds.
            </p>
            <p>
              The 3D world shows{' '}
              <strong>
                {view.side === 'plan' ? 'your plan' : 'the baseline'}
              </strong>{' '}
              at {r.time.toFixed(1)}s. Use the replay slider to inspect
              allocations, transferred bytes and completed work. The baseline is
              evaluated at exactly the same elapsed time.
            </p>
          </div>
          <div className="provider-plan-presets">
            <button onClick={() => changePlan(255)}>
              Use all eight policies
            </button>
            <button onClick={() => changePlan(0)}>Clear plan policies</button>
            <button
              aria-label="Rewind cloud comparison"
              onClick={() => update({ time: 0 })}
            >
              <RotateCcw size={13} />
              Rewind
            </button>
          </div>
          <div
            className="provider-learning-side"
            role="group"
            aria-label="3D cloud comparison run"
          >
            {(['baseline', 'plan'] as const).map((side) => (
              <button
                key={side}
                aria-pressed={view.side === side}
                onClick={() => update({ side })}
              >
                {side === 'baseline'
                  ? 'Show baseline in 3D'
                  : 'Show my plan in 3D'}
              </button>
            ))}
          </div>
          <section
            className="provider-level-policies"
            aria-label="Cloud policies at this level"
          >
            <h3>Policies at this level</h3>
            <p>
              Changing a policy rewinds both runs. All choices are free to
              compare. Placement includes a rolling repack request at the start;
              existing leases move only after a cohort finishes.
            </p>
            {PROVIDER_DECISIONS.filter((d) => d.level === layer).map((d) => (
              <article key={d.id}>
                <label>
                  <input
                    type="checkbox"
                    aria-label={`Cloud policy: ${d.option}`}
                    checked={hasPolicy(view, d.id)}
                    onChange={() =>
                      changePlan(view.policies ^ (1 << POLICIES.indexOf(d.id)))
                    }
                  />
                  <span>{d.option}</span>
                </label>
                <p>{d.effect}</p>
                <small>{d.tradeoff}</small>
              </article>
            ))}
          </section>
          <label className="provider-learning-select">
            Trace a model provider
            <select
              aria-label="Learning cloud tenant"
              value={view.tenant}
              onChange={(e) => update({ tenant: e.target.value as Tenant })}
            >
              {(['train', 'tune', 'serve'] as Tenant[]).map((t) => (
                <option key={t} value={t}>
                  {TENANTS[t].name}
                </option>
              ))}
            </select>
          </label>
          <div className="provider-learning-inspect">
            <label>
              Server
              <select
                aria-label="Learning cloud server"
                value={view.server}
                onChange={(e) => update({ server: Number(e.target.value) })}
              >
                <option value={-1}>Follow traced lease</option>
                {Array.from({ length: 8 }, (_, n) => (
                  <option key={n} value={n}>
                    Pod {n < 4 ? 'A' : 'B'} · Server {n + 1}
                  </option>
                ))}
              </select>
            </label>
            <label>
              GPU
              <select
                aria-label="Learning cloud GPU"
                value={view.gpu}
                onChange={(e) => update({ gpu: Number(e.target.value) })}
              >
                {Array.from({ length: 8 }, (_, n) => (
                  <option key={n} value={n}>
                    GPU {n + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="provider-learning-key">
            <i style={{ background: TENANTS.train.color }} />
            Nova training · <i style={{ background: TENANTS.serve.color }} />
            Orbit inference · <i style={{ background: TENANTS.tune.color }} />
            Forge tuning · dim = idle
          </p>
          <div className="provider-comparison">
            <table aria-label="Matched-time cloud performance comparison">
              <caption>
                Baseline and plan at {r.state.time.toFixed(2)} teaching seconds
              </caption>
              <thead>
                <tr>
                  <th>Observed result</th>
                  <th>Baseline</th>
                  <th>My plan</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, a, b]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>{a}</td>
                    <td>{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            GPU occupancy includes staging, writes and compute. Useful batch
            time counts after durable checkpoint acknowledgment; serving compute
            counts live. Fewer wire bytes can also mean that a blocked job did
            no work, so compare completed work alongside traffic.
          </p>
          <p>
            The paired replay ends when the plan meets its workload target, or
            at 60 teaching seconds. The original Game scenario retains its
            separate 120-second shift. Cloud-ready time measures replica
            provisioning; end-user token latency belongs to the model provider’s
            runtime.
          </p>
          <details className="provider-envelope">
            <summary>Inspect the submitted resource envelope</summary>
            <pre>{JSON.stringify(resourceEnvelope(view), null, 2)}</pre>
            <p>
              The cloud binds physical claims against customer-approved
              manifests. This illustrative envelope is not a real vendor API or
              Kubernetes manifest.
            </p>
          </details>
          <button
            className="model-text-link"
            onClick={() => update({ panel: 'service' })}
          >
            Read the cloud / model provider responsibilities
            <ArrowRight size={14} />
          </button>
        </>
      ) : view.panel === 'service' ? (
        <>
          <h3>What does the physical cloud provide?</h3>
          <p>{PROVIDER_LESSONS[layer].goal}</p>
          <table className="provider-boundary-table">
            <thead>
              <tr>
                <th>Cloud provider</th>
                <th>Model provider</th>
              </tr>
            </thead>
            <tbody>
              {[
                [
                  'Devices, hosts, health and physical availability',
                  'Models, training objectives and runtime correctness',
                ],
                [
                  'Admission, quotas, topology and resource leases',
                  'Approved parallel layouts and per-rank memory envelopes',
                ],
                [
                  'Tenant VM/device, network and storage boundaries',
                  'User API, authentication, prompts and application logic',
                ],
                [
                  'Artifact distribution and checkpoint transport',
                  'Artifact identity, checkpoint contents and restore acknowledgment',
                ],
                [
                  'Provisioning targets, metering and capacity recovery',
                  'Token-service latency, model quality and customer demand',
                ],
              ].map(([cloud, model]) => (
                <tr key={cloud}>
                  <td>{cloud}</td>
                  <td>{model}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <h3>A request through the service boundary</h3>
          <ol>
            <li>
              The model provider submits identity, device shape, memory profile,
              topology and artifact references.
            </li>
            <li>
              The cloud checks entitlements and binds a compatible set of
              physical devices together.
            </li>
            <li>
              Scoped artifacts cross the storage fabric or come from a
              compatible local cache.
            </li>
            <li>
              The customer’s runtime loads state and executes forward/backward,
              tuning or prefill/decode work.
            </li>
            <li>
              Scale changes and maintenance use readiness, cohort draining and
              the customer’s checkpoint protocol before leases return.
            </li>
          </ol>
          <p>
            The cloud scheduler receives resource envelopes. In this
            infrastructure-as-a-service scenario, it does not tokenize or decode
            the customer’s user prompts. A managed model API would add a serving
            layer above this boundary.
          </p>
          <h3>Three workloads on one physical district</h3>
          {(['train', 'tune', 'serve'] as Tenant[]).map((t) => (
            <article className="provider-customer" key={t}>
              <strong style={{ color: TENANTS[t].color }}>
                {TENANTS[t].name}
              </strong>
              <p>
                {t === 'train'
                  ? 'Nova needs eight GPUs on one local domain, artifacts, long compute intervals and durable training checkpoints.'
                  : t === 'tune'
                    ? 'Forge needs a compatible training profile. Its four-GPU manifest exceeds per-device memory; its customer-approved eight-GPU profile fits.'
                    : 'Orbit keeps two-GPU inference replicas warm across user cohorts, spreads replicas across Pods and requests four more replicas at the burst.'}
              </p>
            </article>
          ))}
          <button
            className="model-text-link"
            onClick={() =>
              onWorkload(
                view.tenant === 'train'
                  ? 'pretrain'
                  : view.tenant === 'tune'
                    ? 'posttrain'
                    : 'inference',
              )
            }
          >
            Follow{' '}
            {view.tenant === 'train'
              ? 'pre-training'
              : view.tenant === 'tune'
                ? 'post-training'
                : 'inference'}{' '}
            inside the customer runtime
            <ArrowRight size={14} />
          </button>
          <button
            className="model-text-link"
            onClick={() => update({ panel: 'lab' })}
          >
            Compare capacity policies on this hardware
            <ArrowRight size={14} />
          </button>
        </>
      ) : (
        <>
          <h3>Primary documentation and simulation assumptions</h3>
          <p>
            The replay reuses the tested Cloud provider capacity model from Game
            mode. It does not run real models or claim measured GPU performance.
            These three customers and their manifests are fictional teaching
            examples.
          </p>
          <div className="provider-learning-sources">
            {PROVIDER_SOURCES.map((source) => (
              <a
                href={source.url}
                key={source.url}
                target="_blank"
                rel="noreferrer"
              >
                <BookOpen size={14} />
                <strong>{source.title}</strong>
                <small>{source.supports}</small>
              </a>
            ))}
          </div>
          <h3>Fixed inputs behind both runs</h3>
          <ul>
            <li>
              64 whole GPU leases; eight servers in two Pods; illustrative 80
              GiB per GPU.
            </li>
            <li>
              Per-rank peak = shardable state / approved GPU count + 16 GiB.
              Nova: 448/8+16=72; Orbit: 64/2+16=48; Forge: 320/4+16=96
              (invalid), or 320/8+16=56 (approved).
            </li>
            <li>
              Artifact/input bundles: 96 / 16 / 80 GiB for Nova / Orbit / Forge.
              Checkpoint objects: 8 / 4 GiB for batch jobs. Artifact bytes
              differ from GPU residency.
            </li>
            <li>
              Each Pod shares 100 Gbit/s × 70% useful bandwidth. GiB/s = Gbit/s
              × 10⁹ / 8 / 2³⁰. QoS weights serving five and batch one within
              that fixed budget.
            </li>
            <li>
              Each server’s 128 GiB scoped LRU cache shares a 20 GiB/s disk-read
              budget. Keys include tenant and artifact identity/version. Cache
              hits do not create GPU memory.
            </li>
            <li>
              Transfers take physical seconds × 0.18. Compute intervals are 12 /
              3 / 8 teaching seconds. Inference delivers eight toy requests per
              warm cohort.
            </li>
            <li>
              Quotas are 24 / 24 / 16 GPUs for training / serving / tuning. Peak
              policy caps batch leases at 40 GPUs. The 18-second burst needs 24
              serving GPUs.
            </li>
            <li>
              Rolling placement drains one old replica per Pod at a time, after
              its cohort. Checkpoint reclaim waits for a two-second compute
              boundary, writes durably, then releases devices.
            </li>
          </ul>
          <p>
            Full-device leases are used here. NVIDIA MIG can provide defined
            hardware partitions on supported devices; time-slicing shares
            execution without MIG-style memory/fault isolation. Neither
            multiplies physical HBM. Host health, physical failures, power,
            packet traces, security attacks, model quality and user-facing token
            latency are outside this simulation.
          </p>
        </>
      )}
      <button className="provider-learning-game" onClick={onGame}>
        Play the Cloud provider game scenario
        <ArrowRight size={14} />
      </button>
    </div>
  )
}

export function ProviderTimeline({
  view,
  onChange,
}: {
  view: ProviderLesson
  onChange: (v: ProviderLesson) => void
}) {
  const { replay, time } = replaySnapshot(view)
  return (
    <div
      className="provider-learning-timeline"
      aria-label="Cloud comparison replay"
    >
      <label>
        <span>
          {time.toFixed(1)} / {replay.end.toFixed(1)}s
        </span>
        <input
          type="range"
          aria-label="Cloud replay time"
          min={0}
          max={replay.end}
          step={0.05}
          value={time}
          onChange={(e) =>
            onChange({ ...view, time: Number(e.target.value), playing: false })
          }
        />
      </label>
      <select
        aria-label="Cloud replay speed"
        value={view.speed}
        onChange={(e) =>
          onChange({ ...view, speed: Number(e.target.value) as 1 | 2 | 4 })
        }
      >
        {[1, 2, 4].map((n) => (
          <option key={n} value={n}>
            {n}×
          </option>
        ))}
      </select>
      <div role="group" aria-label="Replay visible allocation">
        {(['baseline', 'plan'] as const).map((side) => (
          <button
            key={side}
            aria-pressed={view.side === side}
            onClick={() => onChange({ ...view, side, playing: false })}
          >
            {side === 'baseline' ? 'Baseline' : 'My plan'}
          </button>
        ))}
      </div>
    </div>
  )
}
