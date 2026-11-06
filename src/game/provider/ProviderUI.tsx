import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Check,
  Cloud,
  Cpu,
  Gauge,
  Globe2,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minus,
  Network,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Server,
  ShieldCheck,
  X,
} from 'lucide-react'
import type { Layer } from '../../content'
import type { SceneHandle } from '../../components/InfrastructureScene'
import { VisualSettings } from '../../components/VisualSettings'
import { CAMPAIGN_LEVELS, LEVEL_NAMES } from '../campaign/catalog'
import {
  PROVIDER_DECISIONS,
  PROVIDER_LESSONS,
  PROVIDER_SOURCES,
} from './catalog'
import { allocated, BURST_AT, COSTS, GPU_GIB, TENANTS, WINDOW } from './model'
import type { Tenant } from './model'
import type { ProviderController } from './useProvider'
import { ScenarioSwitch } from './ScenarioSwitch'
import './provider.css'

const icons = { fleet: Globe2, pod: Network, rack: Server, gpu: Cpu }
export function ProviderUI({
  c,
  level,
  visit,
  scene,
  onScenario,
  onServing,
  onLearn,
  panel,
  setPanel,
  labels,
  setLabels,
  cinema,
  setCinema,
}: {
  c: ProviderController
  level: Layer
  visit: (level: Layer) => void
  scene: RefObject<SceneHandle | null>
  onScenario: (s: 'model' | 'cloud-provider') => void
  onServing: () => void
  onLearn: () => void
  panel: boolean
  setPanel: (v: boolean) => void
  labels: boolean
  setLabels: (v: boolean) => void
  cinema: boolean
  setCinema: (v: boolean) => void
}) {
  const { state: s, metrics: m, dispatch, job } = c
  const [dialog, setDialog] = useState<'help' | 'sources' | null>(null)
  const workshop = useRef<HTMLElement>(null)
  const lesson = PROVIDER_LESSONS[level]
  const lease = allocated(s).find(
    (j) => j.server === c.server && j.slots.includes(c.gpu),
  )
  useEffect(() => {
    if (workshop.current) workshop.current.scrollTop = 0
  }, [level, panel])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(
          (event.target as HTMLElement).tagName,
        )
      )
        return
      if (event.key === 'Escape') {
        setDialog(null)
        setCinema(false)
        return
      }
      if (dialog) return
      if ('1234'.includes(event.key) && event.key.length === 1) {
        event.preventDefault()
        visit(CAMPAIGN_LEVELS[Number(event.key) - 1])
      }
      if (
        event.code === 'Space' &&
        !['BUTTON', 'A'].includes((event.target as HTMLElement).tagName)
      ) {
        event.preventDefault()
        c.toggle()
      }
      if (event.key.toLowerCase() === 'h') setPanel(!panel)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [dialog, visit, c.toggle, panel, setPanel, setCinema])
  const details =
    level === 'fleet'
      ? [
          ['Leased / physical GPUs', `${m.used} / 64`],
          ['Cloud-ready / requested replicas', `${m.ready} / ${m.desired}`],
        ]
      : level === 'pod'
        ? [
            [
              'Pod A / B wire rate',
              `${m.wireRates.map((v) => v.toFixed(1)).join(' / ')} GiB/s`,
            ],
            [
              'Cache hits / fabric bytes',
              `${s.cacheHits} / ${s.wireGiB.toFixed(1)} GiB`,
            ],
          ]
        : level === 'rack'
          ? [
              ['Empty NVLink domains', `${m.emptyServers} / 8`],
              ['Cohorts drained / restores', `${s.drains} / ${s.restores}`],
            ]
          : [
              [
                'Selected GPU peak / budget',
                `${lease?.peakGiB || 0} / ${GPU_GIB} GiB`,
              ],
              [
                'Runtime OOM / valid Forge jobs',
                `${s.oom} / ${s.completed.tune}`,
              ],
            ]
  const openDialog = (next: 'help' | 'sources') => {
    dispatch({ type: 'pause' })
    setDialog(next)
  }
  return (
    <>
      <header className="campaign-header">
        <button onClick={onServing} aria-label="Return to serving district">
          <Cloud size={23} />
          <span>
            strata<span>.</span>
            <small>CLOUD CAPACITY COMMAND</small>
          </span>
        </button>
        <nav aria-label="Cloud model provider tenants">
          {(['train', 'tune', 'serve'] as Tenant[]).map((t) => (
            <button
              key={t}
              onClick={() => c.setTenant(t)}
              aria-pressed={c.tenant === t}
              style={{ color: TENANTS[t].color }}
            >
              <span>
                {t === 'train'
                  ? 'Pre-training'
                  : t === 'tune'
                    ? 'Post-training'
                    : 'Inference'}
              </span>
              <small>{s.completed[t]}</small>
            </button>
          ))}
        </nav>
        <div className="campaign-header-tools">
          <ScenarioSwitch value="cloud-provider" onChange={onScenario} />
          <button onClick={onLearn} aria-label="Learning mode">
            <BookOpen size={17} />
          </button>
          <button
            onClick={() => openDialog('help')}
            aria-label="Cloud scenario instructions"
          >
            <ShieldCheck size={17} />
          </button>
          <button onClick={onServing} aria-label="Serving district">
            <ArrowLeft size={17} />
          </button>
        </div>
      </header>
      {!cinema && (
        <>
          <div className="campaign-heading">
            <span>NEW SCENARIO · THREE CUSTOMERS · 64 PHYSICAL GPUS</span>
            <h1>Run the cloud behind the models.</h1>
            <p>
              Cloud: devices, fabric, leases. Customers: models, runtimes, APIs.
            </p>
          </div>
          <div
            className="campaign-score"
            aria-label="Cloud operation telemetry"
          >
            <div>
              <small>ENGINEERING CREDITS</small>
              <strong>{s.credits}</strong>
            </div>
            <div>
              <small>TRAIN / TUNE / API REQUESTS</small>
              <strong>
                {s.completed.train}
                <em> / </em>
                {s.completed.tune}
                <em> / </em>
                {s.served}
              </strong>
            </div>
            <div>
              <small>VERIFIED CONTRACTS</small>
              <strong>
                {m.contracts}
                <em>/4</em>
              </strong>
            </div>
            <div>
              <small>SHIFT CLOCK</small>
              <strong>
                {s.time.toFixed(1)}
                <em>/{WINDOW}s</em>
              </strong>
            </div>
          </div>
          <nav
            className="campaign-scale"
            aria-label="Game infrastructure scale"
          >
            {CAMPAIGN_LEVELS.map((l, i) => {
              const Icon = icons[l]
              return (
                <button
                  key={l}
                  aria-label={`${i + 1} ${LEVEL_NAMES[l]} game level`}
                  aria-pressed={l === level}
                  onClick={() => visit(l)}
                >
                  <Icon size={18} />
                  <span>
                    {LEVEL_NAMES[l]}
                    <small>
                      {l === 'fleet'
                        ? 'Quota + peak'
                        : l === 'pod'
                          ? 'Bytes + cache'
                          : l === 'rack'
                            ? 'Topology + drain'
                            : 'HBM + identity'}
                    </small>
                  </span>
                  <b>
                    {s.evidence[l] ? (
                      <Check size={13} />
                    ) : (
                      String(i + 1).padStart(2, '0')
                    )}
                  </b>
                </button>
              )
            })}
          </nav>
          <div className="provider-capacity-note" aria-live="polite">
            <span>
              {s.time < BURST_AT
                ? `BURST AT ${BURST_AT}s`
                : 'PEAK CAPACITY REQUESTED'}
            </span>
            <strong>
              {s.burstReady === null
                ? `${m.ready} / ${m.desired} replicas ready`
                : `${s.burstReady.toFixed(1)}s to peak readiness`}
            </strong>
            <small>
              {m.free} free GPUs · {m.emptyServers} empty eight-GPU domains
            </small>
          </div>
          <div
            className="campaign-camera"
            aria-label="Cloud 3D camera controls"
          >
            <button
              aria-label="Cloud view from above"
              onClick={() => scene.current?.view('top')}
            >
              <Globe2 size={17} />
            </button>
            <button
              aria-label="Reset cloud camera"
              onClick={() => scene.current?.reset()}
            >
              <RotateCcw size={17} />
            </button>
            <button
              aria-label="Zoom cloud camera in"
              onClick={() => scene.current?.zoom(1)}
            >
              <Plus size={17} />
            </button>
            <button
              aria-label="Zoom cloud camera out"
              onClick={() => scene.current?.zoom(-1)}
            >
              <Minus size={17} />
            </button>
            <button
              aria-label="Toggle cloud labels"
              aria-pressed={labels}
              onClick={() => setLabels(!labels)}
            >
              <Gauge size={17} />
            </button>
            <button
              aria-label="Cloud cinema mode"
              onClick={() => setCinema(true)}
            >
              <Maximize2 size={17} />
            </button>
          </div>
          {panel && (
            <aside
              ref={workshop}
              className="campaign-panel provider-workshop"
              aria-label="Cloud capacity workshop"
            >
              <div className="campaign-panel-top">
                <span>YOU ARE THE CLOUD PROVIDER</span>
                <button
                  className="campaign-configure"
                  aria-label="Configure this level"
                  onClick={() => {
                    const action =
                      workshop.current?.querySelector<HTMLButtonElement>(
                        '.campaign-decision button:not(:disabled)',
                      )
                    action?.scrollIntoView({ block: 'center' })
                    action?.focus({ preventScroll: true })
                  }}
                >
                  Configure
                </button>
                <button
                  onClick={() => setPanel(false)}
                  aria-label="Close cloud workshop"
                >
                  <X size={16} />
                </button>
              </div>
              <h2>{lesson.title}</h2>
              <details className="campaign-explanation">
                <summary>Goal and service responsibilities</summary>
                <p className="campaign-goal">{lesson.goal}</p>
                <p>{lesson.process}</p>
              </details>
              {PROVIDER_DECISIONS.filter((d) => d.level === level).map((d) => (
                <section className="campaign-decision" key={d.id}>
                  <h3>{d.title}</h3>
                  <div role="group" aria-label={d.title}>
                    <button
                      aria-label={`Install ${d.option}`}
                      aria-pressed={s.config[d.id]}
                      disabled={
                        !s.config[d.id] &&
                        (s.credits < COSTS[d.id] ||
                          ['won', 'lost'].includes(s.status))
                      }
                      onClick={() => dispatch({ type: 'buy', policy: d.id })}
                    >
                      <span>{d.option}</span>
                      <small>
                        {s.config[d.id] ? 'INSTALLED' : `${COSTS[d.id]} CR`}
                      </small>
                    </button>
                  </div>
                  <details className="campaign-explanation">
                    <summary>Effect and trade-off</summary>
                    <p>{d.effect}</p>
                    <p>{d.tradeoff}</p>
                  </details>
                  {d.id === 'placement' && (
                    <button
                      className="provider-repack"
                      aria-label="Run rolling placement plan"
                      disabled={
                        !s.config.placement ||
                        ['won', 'lost'].includes(s.status)
                      }
                      onClick={() => dispatch({ type: 'repack' })}
                    >
                      <RotateCcw size={15} />
                      Run rolling placement plan
                      <small>{s.drains} replica cohorts drained</small>
                    </button>
                  )}
                </section>
              ))}
              <div
                className="campaign-local-metrics"
                aria-label="Cloud level performance readout"
              >
                {details.map(([label, value]) => (
                  <div key={label}>
                    <small>{label}</small>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>
              <details className="provider-accounting provider-allocation">
                <summary>Inspect physical allocation</summary>
                <div className="provider-inspect">
                  <label>
                    Physical server
                    <select
                      aria-label="Inspect cloud server"
                      value={c.server}
                      onChange={(e) => c.setServer(Number(e.target.value))}
                    >
                      {Array.from({ length: 8 }, (_, i) => (
                        <option key={i} value={i}>
                          Pod {i < 4 ? 'A' : 'B'} · Server {i + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    aria-label="Follow tenant lease"
                    aria-pressed={c.follow}
                    onClick={() => c.setFollow(!c.follow)}
                  >
                    {c.follow ? 'Following lease' : 'Follow lease'}
                  </button>
                </div>
                {(level === 'rack' || level === 'gpu') && (
                  <div
                    className="provider-device-map"
                    role="group"
                    aria-label="Eight physical GPU slots"
                  >
                    {m.owners
                      .slice(c.server * 8, c.server * 8 + 8)
                      .map((t, i) => (
                        <button
                          key={i}
                          style={
                            {
                              '--owner-color': t ? TENANTS[t].color : '#566a77',
                            } as React.CSSProperties
                          }
                          aria-label={`Inspect GPU ${i + 1}: ${t ? TENANTS[t].name : 'idle'}`}
                          aria-pressed={c.gpu === i}
                          onClick={() => c.setGpu(i)}
                        >
                          <Cpu size={14} />
                          <b>{i + 1}</b>
                          <small>{t ? t.toUpperCase() : 'IDLE'}</small>
                        </button>
                      ))}
                  </div>
                )}
                <div
                  className="provider-tenant-ledger"
                  aria-label="Tenant allocation ledger"
                >
                  {(['train', 'serve', 'tune'] as Tenant[]).map((t) => (
                    <div key={t}>
                      <i style={{ background: TENANTS[t].color }} />
                      <span>
                        {TENANTS[t].name}
                        <small>
                          {t === 'serve'
                            ? 'Persistent replicas · end-user API owner'
                            : 'Checkpointable eight-device batch gang'}
                        </small>
                      </span>
                      <strong>
                        {m.held[t]}
                        <small>/ {TENANTS[t].quota} quota</small>
                      </strong>
                    </div>
                  ))}
                </div>
              </details>
              <section
                className={`campaign-contract ${s.evidence[level] ? 'is-complete' : ''}`}
                data-complete={s.evidence[level]}
              >
                <span>
                  {s.evidence[level]
                    ? 'CONTRACT VERIFIED'
                    : 'EARN THROUGH COMPLETED WORK'}
                </span>
                <p>{lesson.contract}</p>
              </section>
              <details className="provider-accounting">
                <summary>Efficiency, billing and the service boundary</summary>
                <dl>
                  <dt>Average physical occupancy</dt>
                  <dd>{(m.utilization * 100).toFixed(1)}%</dd>
                  <dt>Useful / leased GPU time</dt>
                  <dd>{(m.efficiency * 100).toFixed(1)}%</dd>
                  <dt>Leased GPU-seconds</dt>
                  <dd>{s.leasedGpuSeconds.toFixed(1)}</dd>
                  <dt>Committed useful GPU-seconds</dt>
                  <dd>{s.usefulGpuSeconds.toFixed(1)}</dd>
                  <dt>Lost uncheckpointed GPU-seconds</dt>
                  <dd>{s.wastedGpuSeconds.toFixed(1)}</dd>
                  <dt>Mean admitted queue wait</dt>
                  <dd>{m.queueMean.toFixed(1)}s</dd>
                  <dt>Peak reserve observed at burst</dt>
                  <dd>
                    {s.time < BURST_AT
                      ? 'Pending'
                      : s.burstProtected
                        ? 'Yes'
                        : 'No'}
                  </dd>
                  <dt>Illustrative device bill</dt>
                  <dd>${m.bill.toFixed(3)}</dd>
                </dl>
                <p>
                  Occupancy includes loading, writes and compute. Useful batch
                  work counts only after checkpoint acknowledgment; service
                  compute counts live. The tariff is $2 / leased GPU-hour in
                  game seconds, separate from engineering credits.
                </p>
                <p>
                  Cloud-ready replica time measures provisioning. It does not
                  estimate the model provider’s user-facing first-token latency,
                  output quality or tokens per second.
                </p>
              </details>
              <details className="provider-accounting">
                <summary>MIG, time-slicing and dedicated leases</summary>
                <p>
                  This scenario leases whole devices. On supported hardware, MIG
                  partitions compute and memory into defined profiles.
                  Time-slicing shares execution access without MIG-style
                  memory/fault isolation. Neither option turns 80 GiB into
                  unlimited memory. Topology and runtime compatibility must be
                  checked for the customer’s workload.
                </p>
              </details>
              <button
                className="provider-sources"
                onClick={() => openDialog('sources')}
              >
                <BookOpen size={14} />
                Research, formulas and assumptions
              </button>
            </aside>
          )}
        </>
      )}
      <div className="campaign-dock provider-dock">
        <div className="campaign-live-stage">
          <span>
            <i />
            {s.status.toUpperCase()} / {TENANTS[c.tenant].name.split(' · ')[0]}
          </span>
          <strong>
            Lease #{job.id} · {job.state}
          </strong>
          <small>{Math.floor(c.progress * 100)}%</small>
          <div
            role="progressbar"
            aria-label="Actual cloud lease progress"
            aria-valuenow={Math.floor(c.progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <i style={{ width: `${c.progress * 100}%` }} />
          </div>
        </div>
        <p className="campaign-payload">{s.feedback}</p>
        <nav
          className="campaign-stages"
          aria-label="Cloud service responsibility chain"
          style={{ '--stage-count': 4 } as React.CSSProperties}
        >
          {[
            ['fleet', 'Admit envelope'],
            ['pod', 'Stage artifact'],
            ['gpu', 'Customer runtime'],
            ['rack', 'Return lease'],
          ].map(([l, title], i) => (
            <button
              key={l}
              onClick={() => visit(l as Layer)}
              aria-label={`Inspect cloud stage ${title}`}
              aria-current={level === l ? 'step' : undefined}
            >
              <b>0{i + 1}</b>
              <span>
                {title}
                <small>{LEVEL_NAMES[l as Layer]}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="campaign-transport">
          <button
            className="campaign-run"
            aria-label={
              s.status === 'running' ? 'Pause cloud shift' : 'Run cloud shift'
            }
            disabled={s.status === 'won' || s.status === 'lost'}
            onClick={c.toggle}
          >
            {s.status === 'running' ? <Pause size={16} /> : <Play size={16} />}
            <span>{s.status === 'running' ? 'Pause' : 'Run cloud shift'}</span>
          </button>
          <button
            aria-label="Change cloud simulation speed"
            onClick={() =>
              c.setSpeed(c.speed === 1 ? 2 : c.speed === 2 ? 4 : 1)
            }
          >
            {c.speed}×
          </button>
          <button
            aria-label="Cloud scenario research"
            onClick={() => openDialog('sources')}
          >
            <BookOpen size={15} />
            <span>Research</span>
          </button>
          <span className="campaign-transport-space" />
          <button
            className="campaign-panel-toggle"
            aria-expanded={panel}
            title={
              panel
                ? 'Hide controls and explore the 3D world'
                : 'Open cloud controls'
            }
            aria-label={panel ? 'Hide cloud workshop' : 'Show cloud workshop'}
            onClick={() => {
              setPanel(!panel)
              setCinema(false)
            }}
          >
            {panel ? (
              <PanelRightClose size={15} />
            ) : (
              <PanelRightOpen size={15} />
            )}
            <span>{panel ? '3D view' : 'Controls'}</span>
          </button>
          <button
            aria-label="Restart cloud scenario"
            onClick={() => dispatch({ type: 'reset' })}
          >
            <RotateCcw size={15} />
          </button>
          {cinema && (
            <button
              aria-label="Exit cloud cinema"
              onClick={() => setCinema(false)}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      <span className="campaign-scope-note">
        64 DEVICE SLOTS · FICTIONAL CUSTOMERS · GAME TIMING · SOURCED MECHANISMS
        · NO VENDOR BENCHMARK
      </span>
      {(s.status === 'won' || s.status === 'lost') && (
        <div
          className="campaign-result"
          role="region"
          aria-label={
            s.status === 'won'
              ? 'Cloud provider shift complete'
              : 'Cloud provider shift ended'
          }
        >
          <ShieldCheck size={28} />
          <span>
            {s.status === 'won'
              ? 'THREE CUSTOMERS. FOUR VERIFIED LEVELS.'
              : 'REPLAN CAPACITY AND ADMISSION'}
          </span>
          <h2>
            {s.status === 'won'
              ? 'The cloud delivered.'
              : 'The shift needs another plan.'}
          </h2>
          <p>
            {s.completed.train} training jobs · {s.completed.tune} tuning jobs ·{' '}
            {s.served} requests · {m.contracts}/4 contracts
          </p>
          <button onClick={() => dispatch({ type: 'reset' })}>
            Replay and compare with the baseline
          </button>
          <button onClick={() => onScenario('model')}>
            Run the model operator scenario
          </button>
        </div>
      )}
      {dialog && (
        <ProviderDialog
          title={
            dialog === 'help'
              ? 'How to run the cloud provider scenario'
              : 'Cloud provider research and assumptions'
          }
          onClose={() => setDialog(null)}
        >
          {dialog === 'help' ? (
            <>
              <p>
                Own the physical cloud. Serve Nova’s pre-training, Forge’s
                post-training and Orbit’s inference at Fleet, Pod, Server and
                GPU levels in one shared 3D world.
              </p>
              <ol>
                <li>
                  Inspect each scale with 1–4. Install its two policies with
                  your 280 engineering credits.
                </li>
                <li>
                  At Server, install physical placement and run the rolling
                  placement plan. Merely purchasing a policy never moves a live
                  lease.
                </li>
                <li>
                  At GPU, validate Forge’s approved memory profile and isolate
                  new leases.
                </li>
                <li>
                  Run the shift. Watch bytes, device bindings and real job
                  completions. Orbit requests four more replicas at 18 game
                  seconds.
                </li>
                <li>
                  Earn four contracts through completed work and inspect every
                  scale. Compare idle capacity with useful progress.
                </li>
              </ol>
              <p>
                Space runs/pauses; H shows the workshop. Changing scenarios or
                leaving Game pauses and retains the run. Engineering policy
                purchases also pause work. Native tenant buttons select the
                traced lease; they do not change workloads.
              </p>
              <VisualSettings />
            </>
          ) : (
            <>
              <p>
                The mechanisms below are grounded in primary documentation. The
                64-GPU district, fictional customers, manifests, storage rates,
                clock, currency and target are explicit teaching assumptions.
              </p>
              <div className="campaign-source-list">
                {PROVIDER_SOURCES.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <strong>{source.title}</strong>
                    <small>{source.supports}</small>
                  </a>
                ))}
              </div>
              <p>
                Eight servers × eight dedicated devices; two Pods × four
                servers. Each GPU has an illustrative 80 GiB budget. Peak
                residency = shardable customer-declared state / approved GPU
                count + 16 GiB workspace: Nova 448/8+16=72; Orbit 64/2+16=48;
                Forge 320/4+16=96 (invalid), or 320/8+16=56 (approved). These
                are synthetic workload manifests, not any named model’s measured
                footprint.
              </p>
              <p>
                Artifact bundles are 96/16/80 GiB for Nova/Orbit/Forge, distinct
                from resident state. Checkpoint objects are 8/4 GiB for batch
                customers. Local disk caches are 128 GiB/server with LRU
                eviction and tenant + digest/version keys; hits still read disk
                at 20 GiB/s. Each Pod’s fixed wire budget is 100 Gbit/s × 70%,
                converted to GiB/s using 10⁹ / 8 / 2³⁰. Transfers take physical
                seconds × 0.18 in game time; serving transfer weight is five,
                batch one. Compute intervals are 12/3/8 game seconds; serving
                replicas persist and deliver eight toy requests per cohort.
              </p>
              <p>
                Nominal quotas: Nova 24, Orbit 24, Forge 16 GPUs. Protected peak
                policy caps batch at 40, leaving room for 24 serving GPUs.
                Borrowed jobs may be recalled. Safe reclaim waits for a
                two-second compute boundary, writes the customer checkpoint,
                acknowledges it and resumes remaining work after re-admission.
                Killing without acknowledgment loses computed work. A voluntary
                disruption policy cannot protect against every hardware failure.
              </p>
              <p>
                The 18-second burst requests 12 replicas; cloud-ready target is
                10 game seconds. No user-facing token latency, optimizer
                convergence, security guarantee, real packet trace, thermal
                model, device failure rate or financial forecast is simulated.
                The customer chooses model semantics, validated profiles and
                checkpoint correctness. Background hardware outside the
                highlighted 64-slot district is a reference view.
              </p>
            </>
          )}
        </ProviderDialog>
      )}
    </>
  )
}
function ProviderDialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
    const el = ref.current
    return () => el?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="campaign-dialog"
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <header>
        <h2>{title}</h2>
        <button aria-label="Close cloud dialog" onClick={onClose}>
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  )
}
