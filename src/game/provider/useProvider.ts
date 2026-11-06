import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import type { Layer } from '../../content'
import {
  createProvider,
  POLICIES,
  providerMetrics,
  providerReducer,
} from './model'
import type { Tenant } from './model'
import { inspectLease, leaseProgress, providerFrame } from './scene'

export function useProvider(active: boolean, level: Layer) {
  const [state, dispatch] = useReducer(
    providerReducer,
    undefined,
    createProvider,
  )
  const [tenant, setTenant] = useState<Tenant>('train')
  const [chosenServer, setServer] = useState(0),
    [gpu, setGpu] = useState(0)
  const [follow, setFollow] = useState(true),
    [speed, setSpeed] = useState(1)
  const job = inspectLease(state, tenant),
    server = follow && job.server >= 0 ? job.server : chosenServer
  const metrics = useMemo(() => providerMetrics(state), [state])
  // Keep annotation geometry stable during time/byte ticks. Only bindings,
  // roles and stage changes rebuild it; actual progress has its own input.
  const signature = `${metrics.owners.join(',')}|${job.id}:${job.state}|${state.status}|${state.epoch}|${state.jobs
    .filter((j) => j.server === server)
    .map((j) => `${j.id}:${j.isolated}:${j.peakGiB}`)
    .join(',')}`
  const policyKey = POLICIES.filter((p) => state.config[p]).join(':')
  const frame = useMemo(
    () => providerFrame(state, level, tenant, server, gpu),
    [signature, level, tenant, server, gpu, policyKey],
  )
  const toggle = useCallback(
    () => dispatch({ type: state.status === 'running' ? 'pause' : 'run' }),
    [state.status],
  )
  useEffect(() => {
    if (!active) dispatch({ type: 'pause' })
  }, [active])
  useEffect(() => {
    if (active) dispatch({ type: 'visit', level })
  }, [active, level])
  useEffect(() => {
    if (!active || state.status !== 'running') return
    let raf = 0,
      last = performance.now(),
      accumulated = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min(0.5, Math.max(0, (now - last) / 1000))
      last = now
      if (document.hidden) return
      accumulated += dt * speed
      if (accumulated >= 0.1) {
        dispatch({ type: 'tick', dt: accumulated })
        accumulated = 0
      }
    }
    const reset = () => {
      last = performance.now()
      accumulated = 0
    }
    document.addEventListener('visibilitychange', reset)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('visibilitychange', reset)
    }
  }, [active, state.status, speed])
  return {
    state,
    dispatch,
    metrics,
    frame,
    job,
    progress: leaseProgress(job),
    tenant,
    setTenant,
    server,
    setServer: (n: number) => {
      setServer(n)
      setFollow(false)
    },
    gpu,
    setGpu,
    follow,
    setFollow,
    speed,
    setSpeed,
    toggle,
  }
}
export type ProviderController = ReturnType<typeof useProvider>
