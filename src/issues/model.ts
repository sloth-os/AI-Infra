import { hotIssues, issueById, type IssueId } from './catalog.ts'
export type IssuePanel = 'top10' | 'brief' | 'lab' | 'sources'
export interface IssueView {
  id: 'hot-issues'
  stage: number
  panel: IssuePanel
  playing: boolean
  applied: boolean
  inputs: Record<string, number>
}
export interface IssueMetric {
  label: string
  value: string
  formula: string
  note: string
}
export interface IssueResult {
  metrics: IssueMetric[]
  pressure: number
  ratio: number
  amount: number
  baseline: number
  candidate: number
  visualCount: number
  note: string
}
export const fmt = (n: number, digits = 2) =>
  n.toLocaleString('en-US', { maximumFractionDigits: digits })
export const size = (n: number) => {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
  const index = n > 0 ? Math.min(5, Math.floor(Math.log2(n) / 10)) : 0
  return `${fmt(n / 1024 ** index)} ${units[index]}`
}
export function issueIndex(n: number) {
  return Math.max(0, Math.min(9, Math.trunc(Number.isFinite(n) ? n : 0)))
}
export function defaultIssueInputs(id: IssueId) {
  return Object.fromEntries(
    issueById(id)!.controls.map((c) => [c.key, c.value]),
  )
}
export function sanitizeIssueInputs(
  id: IssueId,
  raw: Record<string, unknown>,
): Record<string, number> {
  return Object.fromEntries(
    issueById(id)!.controls.map((c) => {
      const value = Number(raw[c.key]),
        finite =
          raw[c.key] !== null &&
          raw[c.key] !== undefined &&
          raw[c.key] !== '' &&
          Number.isFinite(value)
      let n = finite
        ? Math.max(
            c.min,
            Math.min(
              c.max,
              c.min + Math.round((value - c.min) / c.step) * c.step,
            ),
          )
        : c.value
      if (c.key === 'gang')
        n = [2, 4, 8].reduce(
          (a, b) => (Math.abs(b - n) < Math.abs(a - n) ? b : a),
          8,
        )
      return [c.key, n]
    }),
  )
}
export function defaultIssueView(): IssueView {
  return {
    id: 'hot-issues',
    stage: 0,
    panel: 'top10',
    playing: false,
    applied: false,
    inputs: defaultIssueInputs('power'),
  }
}
export function selectIssue(
  view: IssueView,
  stage: number,
  automatic = false,
): IssueView {
  const index = issueIndex(stage)
  return {
    ...view,
    stage: index,
    panel: 'brief',
    playing: automatic && view.playing,
    applied: index === view.stage ? view.applied : false,
    inputs:
      index === view.stage
        ? view.inputs
        : defaultIssueInputs(hotIssues[index].id),
  }
}
export function clearIssueParams(url: URL) {
  for (const key of [...url.searchParams.keys()])
    if (key === 'issue' || key === 'hot' || key.startsWith('hot_'))
      url.searchParams.delete(key)
}
export function parseIssueLocation(href: string): IssueView | null {
  const q = new URL(href).searchParams,
    found = issueById(q.get('issue'))
  if (!found && q.get('hot') !== 'all') return null
  const index = found ? hotIssues.indexOf(found) : 0,
    raw: Record<string, unknown> = {}
  for (const c of hotIssues[index].controls)
    if (q.has(`hot_${c.key}`)) raw[c.key] = q.get(`hot_${c.key}`)
  const panel = q.get('hot_panel'),
    allowed: IssuePanel[] = ['top10', 'brief', 'lab', 'sources']
  return {
    id: 'hot-issues',
    stage: index,
    panel: allowed.includes(panel as IssuePanel)
      ? (panel as IssuePanel)
      : found
        ? 'brief'
        : 'top10',
    playing: false,
    applied: q.get('hot_applied') === 'true',
    inputs: sanitizeIssueInputs(hotIssues[index].id, raw),
  }
}
export function issueUrl(base: string, view: IssueView) {
  const url = new URL(base)
  clearIssueParams(url)
  for (const key of [...url.searchParams.keys()])
    if (
      ['example', 'examples', 'stage', 'lifecycle'].includes(key) ||
      key.startsWith('ex_') ||
      key.startsWith('lc_')
    )
      url.searchParams.delete(key)
  const topic = hotIssues[issueIndex(view.stage)]
  url.searchParams.set('view', 'guide')
  url.searchParams.set('learn', 'fusion')
  url.searchParams.set('issue', topic.id)
  url.searchParams.set('hot_panel', view.panel)
  url.searchParams.set('hot_applied', String(view.applied))
  for (const [key, value] of Object.entries(
    sanitizeIssueInputs(topic.id, view.inputs),
  ))
    url.searchParams.set(`hot_${key}`, String(value))
  return url.toString()
}
const kvToken = 2 * 80 * 8 * 128 * 2
const row = (
  label: string,
  value: string,
  formula: string,
  note: string,
): IssueMetric => ({ label, value, formula, note })
export function issueResults(view: IssueView): IssueResult {
  const id = hotIssues[issueIndex(view.stage)].id,
    p = sanitizeIssueInputs(id, view.inputs),
    a = view.applied
  switch (id) {
    case 'power': {
      const it = (p.gpus * p.watts) / 1e6,
        original = (it * p.pue) / 100,
        effectivePue = a ? Math.max(100, p.pue - 10) : p.pue
      const facility = (it * effectivePue) / 100,
        fraction = Math.min(1, p.supply / facility, p.cooling / it),
        active = Math.floor(p.gpus * fraction)
      return {
        metrics: [
          row(
            'GPU-only facility floor',
            `${fmt(facility)} MW`,
            `${fmt(p.gpus)} × ${p.watts} W × PUE ${fmt(effectivePue / 100)} ÷ 1e6`,
            'Lower bound: other IT power is excluded. No measured facility PUE is implied.',
          ),
          row(
            'Ideal capped GPU allocation',
            `${fmt(active, 0)} GPUs`,
            'requested × min(1, facility budget / demand, heat-removal budget / GPU IT heat)',
            'An ideal steady power/cooling cap, not a deployment forecast or workload throughput.',
          ),
          row(
            'GPU IT heat floor',
            `${fmt(it)} MW`,
            `${fmt(p.gpus)} × ${p.watts} W ÷ 1e6`,
            'Changing PUE does not reduce GPU heat. Host/NIC/storage heat is additional.',
          ),
        ],
        pressure: Math.max(facility / p.supply, it / p.cooling),
        ratio: fraction,
        amount: facility,
        baseline: original,
        candidate: (it * Math.max(100, p.pue - 10)) / 100,
        visualCount: Math.ceil(fraction * 24),
        note: 'Electrical budget and heat removal are independent constraints.',
      }
    }
    case 'kv-memory': {
      const before = kvToken * p.context * p.concurrency,
        bytes = before * (a ? 0.5 : 1),
        perSequence = bytes / p.concurrency,
        slots = Math.floor((p.budget * 2 ** 30) / perSequence)
      return {
        metrics: [
          row(
            'Requested KV payload',
            size(bytes),
            `${p.concurrency} × ${p.context} positions × ${a ? kvToken / 2 : kvToken} bytes/position`,
            'Model-group payload only; weights, scale metadata and workspace are additional.',
          ),
          row(
            'Payload-only admission cap',
            `${fmt(Math.min(p.concurrency, slots), 0)} / ${p.concurrency}`,
            `${p.budget} GiB budget ÷ ${size(perSequence)} per sequence`,
            'No guaranteed runtime fit or quality result. Actual allocation and kernels add overhead.',
          ),
          row(
            'Requested positions',
            `${fmt(p.concurrency * p.context, 0)}`,
            'concurrent sequences × reserved positions per sequence',
            'Total position reservations requested before admission. Precision changes bytes per position, not the requested workload.',
          ),
        ],
        pressure: bytes / (p.budget * 2 ** 30),
        ratio: Math.min(1, bytes / (p.budget * 2 ** 30)),
        amount: bytes,
        baseline: before,
        candidate: before / 2,
        visualCount: Math.min(
          64,
          Math.ceil((bytes / (p.budget * 2 ** 30)) * 32),
        ),
        note: '8-bit is a payload assumption; real scale metadata and quality require validation.',
      }
    }
    case 'disaggregation': {
      const prompt = kvToken * p.context,
        total = prompt * p.streams,
        bw = p.bandwidth * (a ? 2 : 1),
        time = (total / (((bw * 1e9) / 8) * 0.7)) * 1000
      return {
        metrics: [
          row(
            'One prompt’s KV',
            size(prompt),
            `${p.context} × ${kvToken} bytes`,
            'A full BF16 dense-GQA prompt, not API text or output-token bytes.',
          ),
          row(
            'Shared-endpoint wire floor',
            `${fmt(time)} ms`,
            `${size(total)} ÷ (${bw} Gb/s ÷ 8 × 70%)`,
            'All concurrent handoffs share this assumed endpoint. End-to-end handoff is slower.',
          ),
          row(
            'Simultaneous state copies',
            `${p.streams}`,
            `${p.streams} × ${size(prompt)} = ${size(total)}`,
            'An endpoint upgrade changes the floor, not the amount of KV state.',
          ),
        ],
        pressure: time / 200,
        ratio: Math.min(1, time / 1000),
        amount: total,
        baseline: (total / (((p.bandwidth * 1e9) / 8) * 0.7)) * 1000,
        candidate: (total / (((p.bandwidth * 2e9) / 8) * 0.7)) * 1000,
        visualCount: Math.min(16, p.streams),
        note: 'The intervention assumes a 2× endpoint; it is not a measured network or GPU speedup.',
      }
    }
    case 'moe': {
      const assignments = p.tokens * 2,
        hot = (p.tokens * p.skew) / 100,
        uniform = (assignments - hot) / 15
      const before = Math.ceil(Math.max(hot, uniform)),
        candidate = Math.ceil(Math.max(hot / 2, uniform)),
        peak = a ? candidate : before,
        bytes = assignments * 8192 * 2
      return {
        metrics: [
          row(
            'Logical expert assignments',
            fmt(assignments, 0),
            `${p.tokens} token positions × top-2`,
            'Logical router choices are unchanged by a compatible redundant expert.',
          ),
          row(
            'Toy hottest physical worker',
            `${fmt(peak, 0)} visits`,
            a
              ? 'max(hot-expert assignments ÷ 2, remaining assignments ÷ 15)'
              : 'max(hot-expert assignments, remaining assignments ÷ 15)',
            'Fractional expected counts are rounded up. This is not step latency or achieved load balancing.',
          ),
          row(
            'One-way assignment payload',
            size(bytes),
            `${fmt(assignments, 0)} × 8,192 elements × 2 bytes`,
            'Logical activation payload; combine, metadata, replication and transport wire volume are additional.',
          ),
        ],
        pressure: peak / (assignments / 16),
        ratio: Math.min(1, peak / assignments),
        amount: bytes,
        baseline: before,
        candidate,
        visualCount: 16,
        note: 'Two replicas need extra state and correct routing; expert semantics are preserved in the assumption.',
      }
    }
    case 'reasoning': {
      const acceptance = p.acceptance / 100,
        advance = Array.from({ length: 5 }, (_, i) => acceptance ** i).reduce(
          (x, y) => x + y,
          0,
        )
      const effective = (4 + p.step) / advance,
        step = a ? effective : p.step,
        latency = 500 + p.output * step
      return {
        metrics: [
          row(
            'Toy completion time',
            `${fmt(latency / 1000)} s`,
            `assumed 500ms TTFT + ${p.output} × ${fmt(step)}ms`,
            'Expected serial decode work only; queueing, batching effects and runtime overhead are outside this toy.',
          ),
          row(
            'Decode step / expected token',
            `${fmt(step)} ms`,
            a
              ? `(4 × 1ms drafting + ${p.step}ms verification) ÷ ${fmt(advance, 3)} expected tokens`
              : `${p.step}ms baseline target step`,
            'At low acceptance the extra draft work can lose. This is not a measured speculative-decoding speedup.',
          ),
          row(
            'Expected advance / verify cycle',
            a ? `${fmt(advance, 3)} tokens` : '1 token',
            '1 + p + p² + p³ + p⁴',
            'Independent conditional acceptance assumption, including a correction/bonus token.',
          ),
        ],
        pressure: step / p.step,
        ratio: Math.min(1, p.acceptance / 100),
        amount: latency,
        baseline: 500 + p.output * p.step,
        candidate: 500 + p.output * effective,
        visualCount: a ? 5 : 1,
        note:
          effective > p.step
            ? 'At this acceptance rate, the modeled intervention is slower.'
            : 'Acceptance and cycle costs determine the toy gain; quality and real kernel behavior are not predicted.',
      }
    }
    case 'precision': {
      const count = p.parameters * 1e9,
        full = count * 2,
        payload = (count * p.bits) / 8,
        scales = Math.ceil(count / p.block) * 4,
        packed = payload + scales
      return {
        metrics: [
          row(
            'Weight representation floor',
            size(a ? packed : full),
            a
              ? `${p.parameters}B × ${p.bits}/8 bytes + one FP32 scale per ${p.block} values`
              : `${p.parameters}B × 2 BF16 bytes`,
            'Generic flat storage model, not an NVFP4 tensor layout or peak VRAM.',
          ),
          row(
            'Assumed scale metadata',
            a ? size(scales) : '0 B (BF16)',
            `ceil(parameters ÷ ${p.block}) × 4 bytes`,
            'Actual recipes use different scales, shapes, padding and extra representations.',
          ),
          row(
            'Storage reduction with candidate',
            `${fmt(full / packed)}×`,
            'BF16 payload ÷ (packed payload + declared scales)',
            'A storage ratio. It does not predict throughput, training stability or model quality.',
          ),
        ],
        pressure: (a ? packed : full) / full,
        ratio: (a ? packed : full) / full,
        amount: a ? packed : full,
        baseline: full,
        candidate: packed,
        visualCount: a ? p.bits : 16,
        note: 'Weight precision and KV precision are separate decisions; no quality gain/loss is inferred.',
      }
    }
    case 'rl': {
      const completions = p.prompts * p.group,
        tokens = completions * p.length,
        full = 70e9 * 2 * p.destinations,
        adapters = 41943040 * 2 * p.destinations
      return {
        metrics: [
          row(
            'Online completions / round',
            fmt(completions, 0),
            `${p.prompts} prompts × ${p.group} completions`,
            'Generation, reward/verifier evaluation and learner optimization are distinct pools.',
          ),
          row(
            'New rollout token positions',
            fmt(tokens, 0),
            `${fmt(completions, 0)} × ${p.length}`,
            'Fixed completion length assumption. Prefill, early termination and tail variability are additional.',
          ),
          row(
            'Logical publication payload',
            size(a ? adapters : full),
            a
              ? `41,943,040 BF16 adapter parameters × ${p.destinations} destinations`
              : `70B BF16 policy weights × ${p.destinations} destinations`,
            'Not actual collective wire bytes or synchronization time. Adapter mode assumes a compatible resident base/runtime.',
          ),
        ],
        pressure: tokens / 131072,
        ratio: a ? adapters / full : 1,
        amount: a ? adapters : full,
        baseline: full,
        candidate: adapters,
        visualCount: p.group,
        note: 'Smaller publication does not remove rollout, verifier, activation or learner costs.',
      }
    }
    case 'placement': {
      const total = p.nodes * p.free,
        before = p.nodes * Math.floor(p.free / p.gang),
        packed =
          Math.floor(total / 8) * Math.floor(8 / p.gang) +
          Math.floor((total % 8) / p.gang),
        groups = a ? packed : before
      return {
        metrics: [
          row(
            'Free GPU slots',
            `${fmt(total, 0)} GPUs`,
            `${p.nodes} nodes × ${p.free} free slots`,
            'The total is unchanged by ideal repacking.',
          ),
          row(
            'Feasible node-local groups',
            fmt(groups, 0),
            a
              ? 'pack free slots into 8-slot nodes, then count local gangs'
              : `${p.nodes} × floor(${p.free} ÷ ${p.gang})`,
            'Ideal homogeneous placement only. Compaction assumes movable work and excludes restart/transfer cost.',
          ),
          row(
            'GPUs per local group',
            `${p.gang}`,
            'group size must remain within one 8-GPU node',
            'Free GPUs across different nodes cannot be combined under this locality requirement.',
          ),
        ],
        pressure: groups ? total / Math.max(1, groups * p.gang) : 2,
        ratio: total ? (groups * p.gang) / total : 0,
        amount: total,
        baseline: before,
        candidate: packed,
        visualCount: p.nodes * 8,
        note: 'This is an allocatability upper bound, not an automatic migration guarantee or throughput estimate.',
      }
    }
    case 'reliability': {
      const baselineT = p.interval * 60,
        mtbf = p.mtbf * 3600,
        ideal = Math.sqrt(2 * p.save * mtbf),
        interval = a ? ideal : baselineT
      const waste = (t: number) => p.save / t + (t / 2 + p.restore) / mtbf
      return {
        metrics: [
          row(
            'First-order expected waste',
            `${fmt(waste(interval) * 100)}%`,
            `C/T + (T/2 + R)/M with T=${fmt(interval)}s`,
            'Approximation under independent uniform failures and small overhead; not measured goodput.',
          ),
          row(
            'Checkpoint interval',
            `${fmt(interval / 60)} min`,
            a
              ? '√(2 × blocking save cost × whole-job MTBF)'
              : `${p.interval} min selected baseline`,
            'Derived optimum for this simple equation; production durability, correlation and recovery choices differ.',
          ),
          row(
            'Expected rework / failure',
            `${fmt(interval / 120)} min`,
            'T ÷ 2',
            'Longer intervals reduce checkpoint duty but increase expected lost work per failure.',
          ),
        ],
        pressure: waste(interval) / 0.1,
        ratio: Math.max(0, Math.min(1, 1 - waste(interval))),
        amount: interval,
        baseline: waste(baselineT),
        candidate: waste(ideal),
        visualCount: Math.max(1, Math.min(16, Math.ceil(interval / 120))),
        note: 'The MTBF belongs to the whole job in this assumption; it is not a per-GPU reliability claim.',
      }
    }
    case 'isolation': {
      const common = (p.blocks * p.overlap) / 100,
        unique = p.blocks - common,
        before = common + p.tenants * unique,
        isolated = p.tenants * p.blocks,
        blocks = a ? isolated : before
      return {
        metrics: [
          row(
            'Illustrative resident blocks',
            fmt(blocks),
            a
              ? `${p.tenants} × ${p.blocks} tenant-scoped blocks`
              : `shared ${fmt(common)} + ${p.tenants} × private ${fmt(unique)}`,
            'Expected block-equivalent count; fractional common portions are an aggregate approximation.',
          ),
          row(
            'Cross-tenant reuse scope',
            a ? 'Partitioned' : 'One shared class',
            a
              ? 'authenticated identity + version/context → enforced scope'
              : 'identical prefix bytes grouped globally in the unsafe baseline',
            'A scope illustration, not a security implementation or proof against every side channel.',
          ),
          row(
            'Added block equivalents',
            `${fmt(isolated - before)}`,
            'tenant-scoped representation − unsafe globally shared representation',
            'Within-tenant reuse remains possible. No breach probability or latency estimate is made.',
          ),
        ],
        pressure: a ? 0.2 : 1.5,
        ratio: blocks / isolated,
        amount: blocks,
        baseline: before,
        candidate: isolated,
        visualCount: p.tenants,
        note: 'Authenticate and enforce scope on the server; client-selected salts alone are not authorization.',
      }
    }
  }
}
