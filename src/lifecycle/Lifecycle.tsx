import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Copy,
  Layers3,
  RotateCcw,
} from 'lucide-react'
import {
  lifecycleChoices,
  lifecyclePhases,
  lifecycleReviewed,
  lifecycleSources,
  lifecycleStages,
  methodNames,
  phaseInfo,
} from './catalog'
import type { LifecyclePhase, PostMethod } from './catalog'
import {
  byteSize,
  defaultLifecycleInputs,
  dpoLoss,
  groupAdvantages,
  lifecycleBudgets,
  lifecycleMetrics,
  lifecycleUrl,
  number,
  pipelineSchedule,
  sanitizeLifecycleInputs,
} from './model'
import type { LifecycleInputs, LifecycleView } from './model'
import './lifecycle.css'

function References({ ids }: { ids: string[] }) {
  return (
    <div className="life-references">
      {[...new Set(ids)].map((id) => (
        <a
          key={id}
          href={lifecycleSources[id].url}
          target="_blank"
          rel="noreferrer"
        >
          {lifecycleSources[id].title}
          <ArrowUpRight size={11} />
        </a>
      ))}
    </div>
  )
}
export function LifecyclePhases({
  phase,
  onChange,
}: {
  phase: LifecyclePhase
  onChange: (phase: LifecyclePhase) => void
}) {
  return (
    <nav className="life-phase-switch" aria-label="AI lifecycle phases">
      {lifecyclePhases.map((p, i) => (
        <button
          key={p.id}
          aria-pressed={p.id === phase}
          onClick={() => onChange(p.id)}
          style={{ '--phase-color': p.color } as React.CSSProperties}
        >
          <span>0{i + 1}</span>
          {p.title}
          {i < 2 && <ArrowRight size={12} />}
        </button>
      ))}
    </nav>
  )
}
function MethodPicker({
  view,
  onChange,
}: {
  view: LifecycleView
  onChange: (view: LifecycleView) => void
}) {
  return view.phase === 'posttrain' ? (
    <label className="model-select-label">
      Post-training recipe
      <select
        aria-label="Post-training method"
        value={view.method}
        onChange={(e) =>
          onChange({
            ...view,
            method: e.target.value as PostMethod,
            stage: 0,
            playing: false,
          })
        }
      >
        {Object.entries(methodNames).map(([id, label]) => (
          <option key={id} value={id}>
            {label}
          </option>
        ))}
      </select>
    </label>
  ) : null
}
function SFTToy() {
  const [assistantOnly, setAssistantOnly] = useState(true)
  const words = ['User:', '2 + 2?', 'Assistant:', '4', '<eos>']
  const losses = [1.6, 1.2, 0.7, -Math.log(0.8), -Math.log(0.9)]
  const selected = losses.filter((_, i) => !assistantOnly || i >= 3)
  return (
    <section className="life-toy">
      <span className="model-kicker">SFT · INSPECT THE LOSS MASK</span>
      <label className="life-check">
        <input
          type="checkbox"
          checked={assistantOnly}
          onChange={(e) => setAssistantOnly(e.target.checked)}
        />
        Only assistant response targets
      </label>
      <div className="life-token-strip">
        {words.map((word, i) => (
          <span key={word} data-active={!assistantOnly || i >= 3}>
            <code>{word}</code>
            <small>{assistantOnly && i < 3 ? 'mask = 0' : 'mask = 1'}</small>
          </span>
        ))}
      </div>
      <output>
        Mean toy token loss:{' '}
        {(selected.reduce((a, b) => a + b, 0) / selected.length).toFixed(3)}
      </output>
      <p>
        Known targets, shifted by one position; colored tokens contribute to
        loss. Fixed invented token losses illustrate masking only. A real
        assistant mask requires a compatible chat template.
      </p>
    </section>
  )
}
function DPOToy() {
  const [policyGap, setPolicyGap] = useState(2),
    [referenceGap, setReferenceGap] = useState(1),
    [beta, setBeta] = useState(0.1)
  return (
    <section className="life-toy">
      <span className="model-kicker">DPO · INSPECT THE PAIR OBJECTIVE</span>
      {[
        {
          label: 'Policy chosen−rejected log-prob gap',
          value: policyGap,
          change: setPolicyGap,
          min: -5,
          max: 5,
          step: 0.5,
        },
        {
          label: 'Reference chosen−rejected log-prob gap',
          value: referenceGap,
          change: setReferenceGap,
          min: -5,
          max: 5,
          step: 0.5,
        },
        {
          label: 'DPO beta',
          value: beta,
          change: setBeta,
          min: 0.1,
          max: 2,
          step: 0.1,
        },
      ].map((p) => (
        <label className="life-range" key={p.label}>
          {p.label}
          <output>{p.value.toFixed(1)}</output>
          <input
            aria-label={p.label}
            type="range"
            min={p.min}
            max={p.max}
            step={p.step}
            value={p.value}
            onChange={(e) => p.change(Number(e.target.value))}
          />
        </label>
      ))}
      <output data-testid="dpo-loss">
        DPO loss: {dpoLoss(policyGap, referenceGap, beta).toFixed(4)}
      </output>
      <p>
        −log σ(β × (policy gap − reference gap)). These are invented sequence
        log-prob gaps, not a model evaluation. No online rollout or separate
        learned reward is required for this offline objective.
      </p>
    </section>
  )
}
function GRPOToy({
  p,
  onInputs,
}: {
  p: LifecycleInputs
  onInputs: (p: LifecycleInputs) => void
}) {
  const rewards = Array.from({ length: p.group }, (_, i) =>
      p.equalRewards ? 1 : Number(i >= p.group / 2),
    ),
    a = groupAdvantages(rewards)
  return (
    <section className="life-toy">
      <span className="model-kicker">GRPO · ONE PROMPT’S GROUP</span>
      <label className="life-check">
        <input
          type="checkbox"
          checked={p.equalRewards}
          onChange={(e) => onInputs({ ...p, equalRewards: e.target.checked })}
        />
        Give every completion the same reward
      </label>
      <div className="life-reward-grid">
        {rewards.map((reward, i) => (
          <div key={i} data-positive={a[i] > 0}>
            <span>sample {i + 1}</span>
            <code>r = {reward}</code>
            <strong>A = {a[i].toFixed(2)}</strong>
          </div>
        ))}
      </div>
      <p>
        {p.equalRewards
          ? 'Equal rewards → zero relative signal in this toy, even though generation still costs tokens.'
          : 'The group mean is 0.5. Low-reward samples get negative advantages; high-reward samples get positive advantages.'}{' '}
        Population standard deviation + ε is used here. This is one
        group-normalization example, not the full GRPO loss; trainer variants
        differ.
      </p>
      <p>
        No separate learned critic is required. A KL reference is optional in
        the cited TRL revision, which defaults beta to 0.
      </p>
    </section>
  )
}
function PipelineToy({
  p,
  onInputs,
}: {
  p: LifecycleInputs
  onInputs: (p: LifecycleInputs) => void
}) {
  const schedule = pipelineSchedule(p.pp, p.accumulation),
    total = schedule[0].length
  const tick = Math.min(p.scheduleSlot, total - 1)
  return (
    <section className="life-toy">
      <span className="model-kicker">
        GPipe · FORWARD → BACKWARD → ONE UPDATE
      </span>
      <label className="life-range">
        Inspect schedule slot
        <output>
          {tick + 1} / {total}
        </output>
        <input
          aria-label="Pipeline schedule slot"
          type="range"
          min={0}
          max={total - 1}
          value={tick}
          onChange={(e) =>
            onInputs({ ...p, scheduleSlot: Number(e.target.value) })
          }
        />
      </label>
      <div className="life-schedule-scroll">
        <div
          className="life-schedule"
          style={{ '--slots': total } as React.CSSProperties}
        >
          {schedule.map((row, i) => (
            <div key={i}>
              <b>PP {i}</b>
              {row.map((cell, j) => (
                <span
                  key={j}
                  data-kind={cell.kind}
                  data-current={j === tick}
                  title={`Stage ${i}, slot ${j + 1}: ${cell.kind}${cell.microbatch === undefined ? '' : ` microbatch ${cell.microbatch + 1}`}`}
                >
                  {cell.microbatch === undefined
                    ? '·'
                    : `${cell.kind === 'forward' ? 'F' : 'B'}${cell.microbatch + 1}`}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <p>
        Blue = forward, violet = backward, dots = idle. Selecting a slot pauses
        playback and colors the PP stage tiles in the existing server GPUs. All
        microbatches use one parameter version. Balanced stages and equal slot
        costs are assumed; real backward cost, communication, 1F1B and
        interleaving change the timeline.
      </p>
    </section>
  )
}
function LifecycleNumber({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  const [draft, setDraft] = useState(String(value))
  useEffect(() => setDraft(String(value)), [value])
  const commit = () => {
    const n =
      draft.trim() === '' || !Number.isFinite(Number(draft))
        ? value
        : Math.round(Math.max(min, Math.min(max, Number(draft))))
    setDraft(String(n))
    onChange(n)
  }
  return (
    <label>
      {label}
      <input
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step={step}
        value={draft}
        onChange={(e) => {
          const text = e.target.value,
            n = Number(text)
          setDraft(text)
          if (text !== '' && Number.isFinite(n) && n >= min && n <= max)
            onChange(n)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
    </label>
  )
}

function LifecycleLab({
  view,
  onChange,
}: {
  view: LifecycleView
  onChange: (view: LifecycleView) => void
}) {
  const p = view.inputs,
    m = lifecycleMetrics(p)
  const change = (next: LifecycleInputs) =>
    onChange({ ...view, inputs: sanitizeLifecycleInputs(next), playing: false })
  const select = <K extends keyof LifecycleInputs>(
    key: K,
    label: string,
    options: (string | number)[],
    labels?: string[],
  ) => (
    <label>
      {label}
      <select
        aria-label={label}
        value={String(p[key])}
        onChange={(e) =>
          change({
            ...p,
            [key]:
              typeof p[key] === 'number'
                ? Number(e.target.value)
                : e.target.value,
          })
        }
      >
        {options.map((v, i) => (
          <option key={v} value={v}>
            {labels?.[i] || String(v)}
          </option>
        ))}
      </select>
    </label>
  )
  const numeric = (
    key: keyof LifecycleInputs,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <LifecycleNumber
      key={key}
      label={label}
      value={Number(p[key])}
      min={min}
      max={max}
      step={step}
      onChange={(n) => change({ ...p, [key]: n })}
    />
  )
  return (
    <div className="life-lab">
      <p className="model-section-note">
        Sizing exercise for an illustrative dense decoder, not a vendor
        deployment or benchmark. All controls update local calculations and
        representative 3D glyphs.
      </p>
      <div className="model-budget-inputs">
        {select(
          'shape',
          'Teaching model shape',
          ['7b', '70b'],
          ['Illustrative 7B · 32 layers', 'Illustrative 70B · 80 layers'],
        )}
        {view.phase !== 'posttrain' && (
          <>
            {select('tp', 'Tensor parallel ranks', [1, 2, 4, 8])}
            {select('pp', 'Pipeline stages', [1, 2, 4, 8])}
          </>
        )}
        {view.phase === 'pretrain' ? (
          <>
            {select('dp', 'Data parallel replicas', [1, 2, 4, 8, 16, 32, 64])}
            {select(
              'sharding',
              'Training state strategy',
              ['ddp', 'zero1', 'zero2', 'zero3'],
              [
                'DDP · replicated',
                'ZeRO-1 · optimizer',
                'ZeRO-2 · + gradients',
                'ZeRO-3 · + parameters',
              ],
            )}
            {numeric('microbatch', 'Sequences per microbatch', 1, 16)}
            {numeric('accumulation', 'Accumulated microbatches', 1, 64)}
            {numeric('sequence', 'Training sequence tokens', 128, 32768, 128)}
            <label className="life-check">
              <input
                type="checkbox"
                checked={p.checkpoint}
                onChange={(e) => change({ ...p, checkpoint: e.target.checked })}
              />
              Activation checkpointing
            </label>
          </>
        ) : view.phase === 'posttrain' ? (
          <>
            {select(
              'tuning',
              'Policy update scope',
              ['full', 'lora'],
              ['Full policy weights', 'LoRA · Q and O projections'],
            )}
            {p.tuning === 'lora' &&
              select('rank', 'LoRA rank', [8, 16, 32, 64])}
            {numeric(
              'rolloutReplicas',
              view.method === 'grpo'
                ? 'Rollout publication destinations'
                : 'Release publication destinations',
              1,
              64,
            )}
            {view.method === 'grpo' && (
              <>
                {numeric('rolloutPrompts', 'Prompts per rollout round', 1, 256)}
                {select('group', 'Completions per prompt', [2, 4, 8, 16])}
                {numeric(
                  'completion',
                  'New tokens per completion',
                  16,
                  4096,
                  16,
                )}
              </>
            )}
          </>
        ) : (
          <>
            {numeric('fleet', 'Fleet GPU count', 1, 100000)}
            {numeric('batch', 'Concurrent sequences per group', 1, 512)}
            {numeric('prompt', 'Prompt tokens per sequence', 128, 32768, 128)}
            {numeric('output', 'Reserved output tokens', 1, 8192)}
            <label className="life-check">
              <input
                type="checkbox"
                checked={p.disaggregated}
                onChange={(e) =>
                  change({ ...p, disaggregated: e.target.checked })
                }
              />
              Disaggregate prefill and decode
            </label>
            {select(
              'network',
              'Handoff endpoint bandwidth (Gb/s)',
              [25, 100, 200, 400, 800],
            )}
          </>
        )}
      </div>
      <div className="model-budget-results">
        {lifecycleBudgets(view).map((b) => (
          <article key={b.label}>
            <span>{b.label}</span>
            <strong>
              {b.value} <small>{b.unit}</small>
            </strong>
            <code>{b.formula}</code>
            <p>{b.note}</p>
          </article>
        ))}
      </div>
      {view.phase === 'pretrain' ? (
        <>
          <h3>Persistent model state per GPU</h3>
          <p>
            Chosen layout: BF16 weights 2 B + gradients 2 B + FP32 master 4 B +
            Adam moments 8 B = 16 B/parameter. Different frameworks/precision
            settings use different layouts.
          </p>
          <div className="life-state-bars">
            {m.states.map((s) => (
              <div key={s.mode} data-selected={s.mode === p.sharding}>
                <span>{s.mode.toUpperCase()}</span>
                <i
                  style={{
                    width: `${Math.max(2, (s.bytes / m.states[0].bytes) * 100)}%`,
                  }}
                />
                <strong>{byteSize(s.bytes)}</strong>
              </div>
            ))}
          </div>
          <div className="life-formula-list">
            <p>
              <b>One hidden tensor:</b> {byteSize(m.activation)} = b × S × H × 2
              B.{' '}
              {p.checkpoint
                ? 'Recomputation is enabled in this teaching plan: fewer saved intermediates, more backward compute.'
                : 'Without recomputation, more intermediates may remain live.'}{' '}
              This is not total activation memory; the state bars do not include
              activations.
            </p>
            <p>
              <b>Ideal GPipe bubble:</b> {number(m.bubble * 100, 2)}% =
              (PP−1)/(microbatches+PP−1).
            </p>
            <p>
              <b>Rough dense compute:</b> {(m.trainingFlops / 1e15).toFixed(2)}{' '}
              PFLOP per optimizer step = 6 × P × global tokens. Additional
              attention, recomputation and optimizer work are outside this
              convention.
            </p>
            <p>
              <b>Input ID payload:</b> {byteSize(m.tokens * 8)} per global step
              at int64; model communication is separate.
            </p>
          </div>
          <PipelineToy p={p} onInputs={change} />
        </>
      ) : view.phase === 'posttrain' ? (
        <>
          <h3>Separate trainable state from the rest</h3>
          <p>
            {p.tuning === 'lora'
              ? `Adapter count: L × 2 targets × r × (H + H) = ${number(m.adapterParams)}. Q and O are square in this teaching model. Logical BF16 frozen base + unsharded adapter training state: ${byteSize(m.loraState)}.`
              : `Logical unsharded policy training state: ${byteSize(m.shape.parameters * 16)}.`}{' '}
            This excludes activations, reference/reward models, rollout
            weights/KV and buffers. No peak-VRAM or fit claim is made.
          </p>
          <p>
            Naive full-weight publication: {byteSize(m.publishFull)}. Compatible
            adapter-only publication: {byteSize(m.publishAdapters)}. These are
            logical BF16 payloads for {p.rolloutReplicas} destinations, before
            transport strategy or runtime reload.
          </p>
          {view.method === 'sft' ? (
            <SFTToy />
          ) : view.method === 'dpo' ? (
            <DPOToy />
          ) : (
            <GRPOToy p={p} onInputs={change} />
          )}
        </>
      ) : (
        <div className="life-formula-list">
          <h3>Inside one model-parallel group</h3>
          <p>
            <b>BF16 weight floor per rank:</b> {byteSize(m.weightRank)}.{' '}
            <b>Reserved KV per rank:</b> {byteSize(m.kvRank)}, assuming an even
            TP × PP split with supported KV-head/layer divisibility. Workspace,
            uneven layers, allocator overhead and redundancy are additional.
          </p>
          <p>
            <b>One prompt’s KV:</b> {byteSize(m.promptKV)}. K/V use 2 × layers ×
            8 KV heads × 128 head dimension × 2 bytes per position in this
            illustrative GQA model. MHA, MLA, hybrid caches, quantized KV and
            prefix sharing need different budgets.
          </p>
          <p>
            <b>Placement:</b>{' '}
            {p.disaggregated
              ? 'Separate prefill/decode pools require explicit KV ownership and handoff. The fleet replica count above is a generic TP×PP grouping, not a sizing of the two pools.'
              : 'Prefill and decode share one group; no cross-stage KV copy is included. Local HBM and TP/PP traffic remain.'}
          </p>
          <p>
            <b>Performance:</b> Measure p95/p99 TTFT, TPOT and goodput using
            matched lengths, quality, precision, topology and concurrency. Fleet
            GPU count alone cannot determine requests per second.
          </p>
        </div>
      )}
      <button
        className="model-text-link"
        onClick={() => change({ ...defaultLifecycleInputs })}
      >
        <RotateCcw size={13} />
        Reset lifecycle experiment
      </button>
    </div>
  )
}
function LifecycleOperations({ view }: { view: LifecycleView }) {
  const m = lifecycleMetrics(view.inputs),
    p = view.inputs
  return (
    <div className="life-operations">
      <h3>Which bytes cross which boundary?</h3>
      <div className="life-traffic-map">
        {(view.phase === 'pretrain'
          ? [
              [
                'Storage → CPU → GPU',
                'Documents → token IDs. Prefetch to avoid GPU input stalls.',
              ],
              [
                'Tensor parallel',
                'Layer activation collectives within one model stage; place on fast links.',
              ],
              [
                'Pipeline parallel',
                'Forward hidden states →; activation gradients ←.',
              ],
              [
                'Data parallel',
                'Gradient reduction or sharded parameter/gradient exchanges among distinct-data replicas.',
              ],
              [
                'GPU → durable storage',
                'Distributed model/optimizer checkpoint and training progress.',
              ],
            ]
          : view.phase === 'posttrain'
            ? [
                [
                  'Dataset → learner',
                  view.method === 'dpo'
                    ? 'Chosen/rejected pairs; optional cached reference scores.'
                    : view.method === 'sft'
                      ? 'Demonstrations plus valid response masks.'
                      : 'Prompts, targets and reward specification.',
                ],
                [
                  'Learner ↔ model ranks',
                  'Backward, trainable-state reductions and model-parallel activations.',
                ],
                [
                  'Learner → rollout/evaluation',
                  'Versioned full weights or compatible adapter updates.',
                ],
                [
                  'Rollout → evaluator → learner',
                  view.method === 'grpo'
                    ? 'Generated tokens, old log-probs and version → rewards/advantages. Scores are smaller than bulk weight sync.'
                    : 'Not required for this offline SFT/DPO optimization path.',
                ],
              ]
            : [
                [
                  'Client → router → replica',
                  'Prompt and metadata; bounded admission, version and cache-aware placement.',
                ],
                [
                  'Within TP/PP group',
                  'Model-parallel activation traffic each prompt/decode iteration.',
                ],
                [
                  'Prefill → decode pool',
                  p.disaggregated
                    ? `${byteSize(m.promptKV)} prompt KV in this exercise, plus coordination.`
                    : 'No cross-stage KV handoff with colocated prefill/decode.',
                ],
                [
                  'Replica → client',
                  'Small incremental output-token stream; request KV remains worker-owned.',
                ],
                [
                  'Completion / cancellation',
                  'Release KV/slots; keep model weights warm for later users.',
                ],
              ]
        ).map(([title, description]) => (
          <article key={title}>
            <NetworkGlyph />
            <div>
              <b>{title}</b>
              <p>{description}</p>
            </div>
          </article>
        ))}
      </div>
      {view.phase === 'pretrain' && (
        <section className="life-toy">
          <span className="model-kicker">
            COLLECTIVE VOLUME · TWO DISTINCT REFERENCES
          </span>
          <p>
            <b>DDP ring all-reduce:</b> {byteSize(m.gradRing)} sent per rank =
            2(D−1)/D × (2P/(TP×PP)). With DP=1 it is zero.
          </p>
          <p>
            <b>One ZeRO-3 full parameter-gather sweep:</b>{' '}
            {byteSize(m.parameterGather)} received per rank = (D−1)/D ×
            (2P/(TP×PP)). Actual training also needs gradient reduce-scatter and
            may gather parameters repeatedly.
          </p>
          <p>
            These are ideal algorithmic byte references, not interchangeable
            full-step traffic totals. Reduce bucket overlap, resharding,
            topology and accumulation policy affect observed time.
          </p>
        </section>
      )}
      <h3>Solutions and their performance trade-offs</h3>
      {lifecycleChoices[view.phase].map((c) => (
        <article className="model-choice" key={c.name}>
          <h3>{c.name}</h3>
          <p>
            <b>Solves:</b> {c.solves}
          </p>
          <p>
            <b>Costs:</b> {c.cost}
          </p>
          <p>
            <b>Measure:</b> {c.measure}
          </p>
        </article>
      ))}
      <div className="model-representation">
        <span>ARTIFACT BRIDGE</span>
        <code>
          Corpus → base model → policy / adapter → warm serving replicas →
          outputs
        </code>
        <p>
          Resume checkpoints carry optimizer/training progress. Serving bundles
          carry compatible weights, tokenizer and configuration. KV caches
          belong to requests and policy versions. A chat request does not
          automatically update weights.
        </p>
      </div>
      <References
        ids={
          view.phase === 'pretrain'
            ? ['megatron', 'zero', 'fsdp', 'nccl', 'gpipe', 'checkpoint']
            : view.phase === 'posttrain'
              ? ['sft', 'dpo', 'grpo', 'rollout', 'lora']
              : ['cache', 'paged', 'disagg']
        }
      />
    </div>
  )
}
function NetworkGlyph() {
  return (
    <span className="life-network-glyph" aria-hidden="true">
      ●<i />●
    </span>
  )
}
export function LifecycleStudy({
  view,
  onChange,
  onCompare,
  startLab = false,
}: {
  view: LifecycleView
  onChange: (view: LifecycleView) => void
  onCompare: () => void
  startLab?: boolean
}) {
  const [tab, setTab] = useState<'flow' | 'lab' | 'operations' | 'sources'>(
      startLab ? 'lab' : 'flow',
    ),
    [copied, setCopied] = useState(false)
  const study = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (startLab) setTab('lab')
  }, [startLab])
  const readingStage = tab === 'flow' ? view.stage : null
  useEffect(() => {
    study.current?.closest('.learn-panel')?.scrollTo(0, 0)
  }, [tab, view.phase, view.method, readingStage])
  const info = phaseInfo(view.phase),
    stage = lifecycleStages(view.phase, view.method)[view.stage]
  const share = async () => {
    const url = lifecycleUrl(location.href, view)
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
      className="model-study-content life-study"
      ref={study}
      data-testid="lifecycle-study"
    >
      <LifecyclePhases
        phase={view.phase}
        onChange={(phase) =>
          onChange({ ...view, phase, stage: 0, playing: false })
        }
      />
      <div className="model-study-actions">
        <button onClick={onCompare}>
          <Layers3 size={13} />
          Compare all three
        </button>
        <button
          aria-label="Share lifecycle experiment"
          onClick={() => void share()}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied' : 'Share experiment'}
        </button>
      </div>
      <MethodPicker view={view} onChange={onChange} />
      <nav className="model-detail-tabs" aria-label="Lifecycle study sections">
        {(['flow', 'lab', 'operations', 'sources'] as const).map((t) => (
          <button key={t} aria-pressed={t === tab} onClick={() => setTab(t)}>
            {t === 'flow'
              ? 'Data & compute'
              : t === 'lab'
                ? 'Sizing lab'
                : t === 'operations'
                  ? 'Network & choices'
                  : 'Evidence'}
          </button>
        ))}
      </nav>
      {tab === 'flow' ? (
        <>
          <span className="model-kicker">
            {info.title.toUpperCase()}{' '}
            {view.phase === 'posttrain' ? `· ${view.method.toUpperCase()}` : ''}{' '}
            · STAGE {view.stage + 1} / 6
          </span>
          <h2>{stage.title}</h2>
          <p>{stage.detail}</p>
          <div className="model-representation">
            <span>INPUT → OUTPUT</span>
            <code>{stage.input}</code>
            <ArrowRight size={16} />
            <code>{stage.output}</code>
          </div>
          {(
            [
              ['GPU / CPU work', stage.compute],
              ['Live state', stage.memory],
              ['Data movement', stage.traffic],
              ['Bottleneck', stage.problem],
              ['Response', stage.solution],
              ['Performance implication', stage.performance],
            ] as const
          ).map(([label, body]) => (
            <div className="life-explanation" key={label}>
              <span className="model-kicker">{label.toUpperCase()}</span>
              <p>{body}</p>
            </div>
          ))}
          <References ids={stage.sources} />
          <p className="model-section-note">
            Choose a walkthrough step or zoom level to follow the transformation
            on the existing hardware. Glowing parcels represent workflow
            dependencies, not identical byte sizes. 3D glyphs aggregate large
            tensors and GPU groups.
          </p>
        </>
      ) : tab === 'lab' ? (
        <LifecycleLab view={view} onChange={onChange} />
      ) : tab === 'operations' ? (
        <LifecycleOperations view={view} />
      ) : (
        <>
          <div className="model-evidence">
            <span>PRIMARY SOURCES · REVIEWED {lifecycleReviewed}</span>
            <p>
              Mechanisms are grounded in official documentation and papers.
              Numeric results in the sizing lab are derived from explicit toy
              assumptions. We did not train a model, run inference, or benchmark
              a GPU in this website.
            </p>
          </div>
          <div className="model-source-list">
            {Object.entries(lifecycleSources).map(([id, s]) => (
              <article key={id}>
                <span>{s.org}</span>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title}
                  <ArrowUpRight size={13} />
                </a>
                <p>{s.supports}</p>
              </article>
            ))}
          </div>
          <p className="model-section-note">
            Pinned library revisions and paper versions make recipe assumptions
            reviewable. Production systems can combine techniques differently;
            dense-decoder formulas do not cover every MoE, diffusion, speech or
            hybrid-cache architecture.
          </p>
        </>
      )}
    </div>
  )
}
export function LifecycleComparison() {
  return (
    <section className="life-comparison model-comparison">
      <span className="model-kicker">
        ONE MODEL · THREE DIFFERENT INFRASTRUCTURE JOBS
      </span>
      <h1>From learning weights to serving people.</h1>
      <p>
        This walkthrough follows a dense decoder-only language model. Other
        architectures change the tensors and objectives, while the distinction
        between weight updates and request state still matters.
      </p>
      <div className="life-comparison-grid">
        {lifecyclePhases.map((p) => (
          <article
            key={p.id}
            style={{ '--phase-color': p.color } as React.CSSProperties}
          >
            <span>{p.title}</span>
            <h2>{p.purpose}</h2>
            <h3>Objective</h3>
            <p>{p.objective}</p>
            <h3>Live state</h3>
            <p>{p.state}</p>
            <h3>Artifact</h3>
            <p>{p.artifact}</p>
            <a
              href={`${import.meta.env.BASE_URL}?view=guide&learn=fusion&lifecycle=${p.id}`}
              target="_blank"
              rel="noreferrer"
            >
              Open 3D workflow
              <ArrowUpRight size={13} />
            </a>
          </article>
        ))}
      </div>
      <h2>Post-training has different loops</h2>
      <div className="life-comparison-table">
        <table>
          <thead>
            <tr>
              <th>Recipe</th>
              <th>Training data</th>
              <th>Extra services</th>
              <th>What changes?</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>SFT</th>
              <td>Demonstrations and response masks</td>
              <td>No required rollout, reward or reference</td>
              <td>Policy/adapters via token cross-entropy</td>
            </tr>
            <tr>
              <th>DPO</th>
              <td>Offline chosen/rejected pairs</td>
              <td>Frozen reference scores; can precompute</td>
              <td>Policy/adapters via pair objective</td>
            </tr>
            <tr>
              <th>GRPO</th>
              <td>Online G completions per prompt</td>
              <td>
                Generation + reward function/model; optional KL reference; no
                required critic
              </td>
              <td>Policy/adapters via relative-reward objective</td>
            </tr>
            <tr>
              <th>PPO-based RLHF</th>
              <td>Online samples + preferences used to train reward</td>
              <td>Typical actor, critic/value, reward and reference roles</td>
              <td>Actor and critic with different losses</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h2>Compare performance with the right question</h2>
      <p>
        Pre-training: useful tokens per GPU-second and quality at a fixed
        data/compute budget. Post-training: held-out behavior and reward/task
        success alongside rollout, verifier, synchronization and learner costs.
        Inference: goodput at TTFT/TPOT tail-latency and quality targets. These
        metrics cannot be collapsed into a universal “fastest AI infrastructure”
        ranking.
      </p>
      <h2>One fleet can host all three</h2>
      <p>
        Reserve coherent topology for synchronous training jobs, give online
        rollouts their own scheduling/memory budget, and keep serving capacity
        warm with bounded admission. They compete for GPUs, fabric and storage,
        but their states, failure recovery and service-level objectives differ.
        100,000 GPUs is a capacity pool, not necessarily one training job or one
        inference replica.
      </p>
      <References
        ids={[
          'zero',
          'gpipe',
          'sft',
          'dpo',
          'grpo',
          'rlhf',
          'rollout',
          'cache',
          'disagg',
        ]}
      />
      <p className="model-section-note">
        Sources reviewed {lifecycleReviewed}. Browser-local educational
        calculations and representative motion; no external model execution or
        measured GPU benchmarks.
      </p>
    </section>
  )
}
export function LifecycleReferenceSection() {
  return (
    <section className="real-model-reference life-reference">
      <h2>The model lifecycle on AI infrastructure</h2>
      <p>
        Follow data, weight updates, optimizer state, rollout workers and
        request KV through three source-backed interactive 3D workflows.
      </p>
      <div className="model-reference-list">
        {lifecyclePhases.map((p) => (
          <a
            key={p.id}
            href={`${import.meta.env.BASE_URL}?view=guide&learn=fusion&lifecycle=${p.id}`}
            target="_blank"
            rel="noreferrer"
          >
            <strong>
              {p.title}
              <ArrowUpRight size={13} />
            </strong>
            <span>{p.subtitle}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
