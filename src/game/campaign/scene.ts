import type { Layer } from '../../content'
import type {
  ContextFrame,
  Pattern,
} from '../../learning/infrastructure/context'
import { pipelineSchedule } from '../../lifecycle/model.ts'
import { LEVEL_LESSONS, PHASE_NAMES } from './catalog.ts'
import { operationMetrics } from './model.ts'
import type { OperationState } from './model'

export function campaignFrame(s: OperationState, layer: Layer): ContextFrame {
  const m = operationMetrics(s),
    stage = m.stages[s.stage],
    lesson = LEVEL_LESSONS[s.phase][layer]
  const node =
    layer === 'fleet'
      ? stage.id === 'checkpoint' || stage.id === 'publish'
        ? 'storage'
        : s.phase === 'inference'
          ? 'gateway'
          : 'scheduler'
      : layer === 'pod'
        ? stage.id === 'prepare'
          ? 'prefill'
          : 'fabric'
        : layer === 'rack'
          ? 'nvlink'
          : s.phase === 'posttrain'
            ? 'tensor'
            : 'hbm'
  const pattern: Pattern =
    s.phase === 'inference'
      ? layer === 'pod' &&
        s.config.serving === 'split' &&
        stage.id === 'handoff'
        ? 'transfer'
        : 'pages'
      : layer === 'fleet'
        ? stage.id === 'checkpoint' || stage.id === 'publish'
          ? 'checkpoint'
          : 'tokens'
        : layer === 'pod' || layer === 'rack'
          ? s.phase === 'posttrain' && s.method === 'grpo'
            ? 'rollouts'
            : 'gradients'
          : s.phase === 'posttrain'
            ? s.method === 'grpo'
              ? 'rollouts'
              : 'tokens'
            : 'gradients'
  const schedule =
    s.phase === 'pretrain' && layer === 'rack'
      ? pipelineSchedule(2, Number(s.config.microbatches))
      : undefined
  return {
    key: `campaign:${s.phase}:${s.method}:${layer}:${s.stage}:${s.cycles}:${s.policyVersion}:${JSON.stringify(s.config)}`,
    kind: 'lifecycle',
    id: `${s.phase}:${s.method}`,
    layer,
    title: `${PHASE_NAMES[s.phase]} operation`,
    color: m.blocked
      ? '#e3a080'
      : s.phase === 'pretrain'
        ? '#9bc9e7'
        : s.phase === 'posttrain'
          ? '#c4abe9'
          : '#b7d99b',
    stage: s.stage,
    steps: m.stages.map((x) => ({ title: x.title, layer: x.layer })),
    playing: s.status === 'running' && !m.blocked,
    duration: stage.seconds,
    node,
    traffic: s.phase === 'inference' ? 'kv' : 'collectives',
    heading: lesson.title,
    explanation: lesson.process,
    payload: `${stage.title}: ${stage.payload}${layer === 'fleet' && pattern === 'tokens' ? ` · Bright: useful positions (${s.config.packing === 'packed' ? '94' : '55'}%); dim: padding; 32 aggregate tiles.` : s.phase === 'pretrain' && layer === 'gpu' ? ` · ${m.residentGiB.toFixed(1)} / 80 GiB resident; 32 tiles = one HBM budget; display caps at 64.` : ''}`,
    scope:
      'Playable reference model · timing coefficients are game assumptions',
    boundary: lesson.goal,
    pattern,
    count:
      s.phase === 'inference'
        ? Math.min(64, Math.ceil((32 * m.kvGiB) / m.kvBudget))
        : s.phase === 'pretrain' && layer === 'gpu'
          ? Math.min(64, Math.ceil((32 * m.residentGiB) / 80))
          : s.phase === 'posttrain' && s.method === 'grpo'
            ? layer === 'pod'
              ? 8
              : 16
            : 32,
    applied: true,
    pressure:
      s.phase === 'inference' ? m.kvGiB / m.kvBudget : m.residentGiB / 80,
    probability: 0.8,
    values:
      layer === 'fleet' && pattern === 'tokens'
        ? Array.from({ length: 32 }, (_, i) =>
            i < Math.round(32 * (s.config.packing === 'packed' ? 0.94 : 0.55))
              ? 1
              : 0,
          )
        : s.phase === 'posttrain' && s.method === 'grpo'
          ? layer === 'pod'
            ? Array.from({ length: 8 }, (_, i) =>
                i < Number(s.config.roles) ? 1 : -1,
              )
            : m.advantages
          : s.phase === 'posttrain' && s.method === 'sft'
            ? Array.from({ length: 32 }, (_, i) =>
                s.config.objective === 'valid' && i < 24 ? 0 : 1,
              )
            : undefined,
    schedule: schedule
      ? Array.from({ length: 8 }, (_, rank) =>
          schedule[Math.floor(rank / 4)].map((cell) =>
            cell.kind === 'forward' ? 1 : cell.kind === 'backward' ? -1 : 0,
          ),
        )
      : undefined,
    scheduleSlot: 0,
    supplementRole:
      s.phase === 'posttrain' && s.method === 'grpo' && layer === 'pod'
        ? 'worker-roles'
        : undefined,
    metrics: [],
    workload: s.phase === 'inference' ? 'text' : 'training',
  }
}
