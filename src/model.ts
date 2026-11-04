export type Strategy = 'static' | 'continuous' | 'disaggregated'
export interface Parameters {
  gpus: number
  arrivalRate: number
  inputTokens: number
  outputTokens: number
  batchSize: number
  networkGbps: number
  prefixHit: number
  prefillShare: number
}

export const defaults: Parameters = {
  gpus: 100_000,
  arrivalRate: 18_000,
  inputTokens: 2048,
  outputTokens: 256,
  batchSize: 64,
  networkGbps: 400,
  prefixHit: 0,
  prefillShare: 55,
}

export const assumptions = {
  parameters: 70e9,
  weightBytes: 2,
  layers: 80,
  kvHeads: 8,
  headDim: 128,
  kvBytes: 2,
  tensorParallel: 8,
  hbmGB: 80,
  runtimeGBPerGPU: 6,
  prefillTokensPerSecond: 6000,
  networkEfficiency: 0.7,
  hourlyGPUCost: 2.5,
}

export function kvBytes(tokens: number) {
  const a = assumptions
  return 2 * a.layers * a.kvHeads * a.headDim * a.kvBytes * tokens
}

// An explicit educational capacity model. These coefficients are assumptions,
// not fitted measurements or vendor benchmarks. See docs/MODEL.md.
export function simulate(p: Parameters, strategy: Strategy) {
  const a = assumptions
  const replicas = Math.floor(p.gpus / a.tensorParallel)
  const weightGB = (a.parameters * a.weightBytes) / 1e9
  const cacheGB = kvBytes(p.inputTokens + p.outputTokens) / 1e9
  const cacheBudgetGB =
    a.tensorParallel * (a.hbmGB - a.runtimeGBPerGPU) - weightGB
  const memorySlots = Math.max(0, Math.floor(cacheBudgetGB / cacheGB))
  const batch = Math.min(p.batchSize, memorySlots)
  const valid = replicas > 0 && batch > 0
  const efficiency = strategy === 'static' ? 0.68 : 1
  const input = p.inputTokens * (1 - p.prefixHit / 100)
  const prefillService = input / (a.prefillTokensPerSecond * efficiency)
  const decodeStepMs =
    12 + 0.4 * batch + 1.5 * ((p.inputTokens + p.outputTokens / 2) / 1024)
  const decodeTPS = (batch / (decodeStepMs / 1000)) * efficiency
  const decodeService = p.outputTokens / Math.max(1, decodeTPS)
  const prefillReplicas = Math.max(
    1,
    Math.min(replicas - 1, Math.round((replicas * p.prefillShare) / 100)),
  )
  const decodeReplicas = Math.max(0, replicas - prefillReplicas)
  const prefillCapacity =
    prefillService > 0 ? prefillReplicas / prefillService : Infinity
  const decodeCapacity = decodeReplicas / decodeService
  const capacity = !valid
    ? 0
    : strategy === 'disaggregated'
      ? Math.min(prefillCapacity, decodeCapacity)
      : replicas / (prefillService + decodeService)
  const utilization = capacity > 0 ? p.arrivalRate / capacity : Infinity
  const stable = valid && utilization < 1
  const transferMs =
    strategy === 'disaggregated'
      ? (kvBytes(p.inputTokens) /
          1e9 /
          ((p.networkGbps / 8) * a.networkEfficiency)) *
        1000
      : 0
  const queueMs = stable
    ? (utilization / (1 - utilization)) * (prefillService + decodeService) * 250
    : Infinity
  const interference =
    strategy === 'disaggregated' ? 1 : 1 + Math.min(1.5, utilization) * 0.25
  const tpotMs = (decodeStepMs / efficiency) * interference
  const ttftMs = stable
    ? 12 + prefillService * 1000 + queueMs + transferMs
    : Infinity
  const requestMs = stable ? ttftMs + (p.outputTokens - 1) * tpotMs : Infinity
  const acceptedRate = Math.min(p.arrivalRate, capacity)
  const outputTPS = acceptedRate * p.outputTokens
  const costPerMillion =
    outputTPS > 0
      ? ((p.gpus * a.hourlyGPUCost) / (outputTPS * 3600)) * 1e6
      : Infinity
  const networkLoadGBps =
    strategy === 'disaggregated'
      ? (acceptedRate * kvBytes(p.inputTokens)) / 1e9
      : 0
  return {
    replicas,
    weightGB,
    cacheGB,
    cacheBudgetGB,
    memorySlots,
    batch,
    valid,
    capacity,
    utilization,
    stable,
    transferMs,
    queueMs,
    tpotMs,
    ttftMs,
    requestMs,
    outputTPS,
    costPerMillion,
    networkLoadGBps,
    prefillReplicas,
    decodeReplicas,
    prefillService,
    decodeService,
  }
}

export function formatNumber(n: number, digits = 0): string {
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { maximumFractionDigits: digits })
    : '—'
}

export function duration(ms: number): string {
  if (!Number.isFinite(ms)) return 'Over capacity'
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`
}
