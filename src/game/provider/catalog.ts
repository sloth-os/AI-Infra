import type { Layer } from '../../content'
import type { Policy } from './model'

export const PROVIDER_SOURCES = [
  {
    title: 'Kueue · ClusterQueue and cohorts',
    url: 'https://kueue.sigs.k8s.io/docs/concepts/cluster_queue/',
    supports:
      'Admission, nominal quotas, borrowing and reclaim. Our 24/24/16 split and policy rules are a game model.',
  },
  {
    title: 'Kueue · Topology-aware scheduling',
    url: 'https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/',
    supports:
      'Workload placement within node, rack and block domains. This game requests one eight-device server per training gang.',
  },
  {
    title: 'Kubernetes · Dynamic Resource Allocation',
    url: 'https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/',
    supports:
      'Device claims, device selection and allocation. A claim alone does not configure every tenant isolation boundary.',
  },
  {
    title: 'Kubernetes · Multi-tenancy',
    url: 'https://kubernetes.io/docs/concepts/security/multi-tenancy/',
    supports:
      'Namespace, network, storage and runtime boundaries; strong isolation requires more than a namespace.',
  },
  {
    title: 'Kubernetes · Disruptions',
    url: 'https://kubernetes.io/docs/concepts/workloads/pods/disruptions/',
    supports:
      'Voluntary disruption budgets help preserve availability. They do not make an application checkpoint-consistent.',
  },
  {
    title: 'NVIDIA · MIG User Guide',
    url: 'https://docs.nvidia.com/datacenter/tesla/mig-user-guide/introduction.html',
    supports:
      'Supported MIG profiles provide hardware memory and compute partitions. Profile and interconnect support depend on hardware and software.',
  },
  {
    title: 'NVIDIA · GPU time-slicing',
    url: 'https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html',
    supports:
      'Time-slicing oversubscribes access, without MIG-style memory and fault isolation. Replicas do not multiply physical memory.',
  },
] as const

export const PROVIDER_DECISIONS: {
  id: Policy
  level: Layer
  title: string
  option: string
  effect: string
  tradeoff: string
}[] = [
  {
    id: 'fair',
    level: 'fleet',
    title: 'Tenant admission',
    option: 'Fair quota + idle borrowing',
    effect:
      'Protect tenant quotas; lend idle devices and prioritize queued serving leases. Account for borrowed allocations.',
    tradeoff:
      'Borrowed batch work can be recalled. Quotas are entitlements, not physically separate GPUs.',
  },
  {
    id: 'headroom',
    level: 'fleet',
    title: 'Peak capacity',
    option: 'Protect eight burst GPUs',
    effect:
      'Limit batch leases to 40 GPUs, leaving capacity for Orbit to grow from 16 to 24 GPUs.',
    tradeoff:
      'Some devices stay idle before the burst. Target ready capacity, rather than maximizing occupancy.',
  },
  {
    id: 'qos',
    level: 'pod',
    title: 'Shared storage fabric',
    option: 'Weighted transfer queues',
    effect:
      'Give serving image transfers weight five; batch transfers weight one. Each Pod shares the same 100 Gbit/s budget.',
    tradeoff:
      'Serving starts sooner while batch transfers wait longer. QoS creates no extra bandwidth.',
  },
  {
    id: 'cache',
    level: 'pod',
    title: 'Artifact distribution',
    option: 'Scoped local artifact cache',
    effect:
      'Keep up to 128 GiB per server, keyed by tenant and artifact digest/version. Repeated loads read local disk.',
    tradeoff:
      'Cold loads still cross the fabric. Local disk is modeled at 20 GiB/s and is separate from GPU memory.',
  },
  {
    id: 'placement',
    level: 'rack',
    title: 'Physical placement',
    option: 'Pack replicas; preserve gangs',
    effect:
      'Pack two-GPU replicas within servers, balance them across two Pods, and reserve all eight local GPUs for each training gang.',
    tradeoff:
      'This changes future admission. Run the rolling plan to move existing replicas after their current cohort.',
  },
  {
    id: 'checkpoint',
    level: 'rack',
    title: 'Borrowed lease reclaim',
    option: 'Checkpoint before release',
    effect:
      'When capacity is recalled, wait for a batch boundary, write the customer checkpoint, then acknowledge release.',
    tradeoff:
      'Devices remain leased during the write. The model provider must supply a valid checkpoint/restore protocol.',
  },
  {
    id: 'isolation',
    level: 'gpu',
    title: 'Tenant device boundary',
    option: 'VM + dedicated GPU leases',
    effect:
      'Require tenant VM/runtime boundaries, dedicated devices, scoped network identity and storage access on new leases.',
    tradeoff:
      'Free VRAM on a leased GPU is not allocatable to another tenant. The game models a policy, not a security test.',
  },
  {
    id: 'envelope',
    level: 'gpu',
    title: 'Per-device admission',
    option: 'Use approved memory envelope',
    effect:
      'Forge explicitly permits its eight-GPU profile: 320 / 8 + 16 = 56 GiB per GPU, versus 96 GiB on four GPUs.',
    tradeoff:
      'The cloud cannot silently quantize a model or change its parallelism. It selects only customer-approved profiles.',
  },
]
export const PROVIDER_LESSONS: Record<
  Layer,
  { title: string; goal: string; process: string; contract: string }
> = {
  fleet: {
    title: 'Sell reliable capacity, not idle silicon.',
    goal: 'Serve three model providers with quota, borrowing, capacity guarantees and a burst-ready target.',
    process:
      'A provider submits a resource envelope: device class/count, topology, peak memory, region, identity, artifact references and recovery protocol. Admission checks quota and availability before binding leases. Their own runtime serves user APIs and executes training.',
    contract:
      'Finish two Nova and two Forge jobs, deliver 128 Orbit requests, and ready all 12 replicas within 10 game seconds. Fair admission and eight protected free GPUs must be in place when the burst arrives.',
  },
  pod: {
    title: 'Make bytes arrive before compute needs them.',
    goal: 'Observe contention between cold images, training inputs and checkpoint writes on a bounded fabric.',
    process:
      'The shared storage/uplink budget is 100 Gbit/s × 70% useful rate per Pod, divided among active transfers. Weighted queues prioritize latency-sensitive image loads. Scoped disk caches avoid repeated fabric bytes. Intra-server NVLink is a separate domain.',
    contract:
      'Complete two batch jobs, transfer at least 32 GiB under QoS, and observe a real local-cache hit. Buying a cache without reusing an artifact earns no evidence.',
  },
  rack: {
    title: 'Turn fragmented GPUs into runnable gangs.',
    goal: 'Free complete eight-device NVLink domains without interrupting every serving replica.',
    process:
      'Eight servers start with one two-GPU Orbit replica each. There are 48 free devices but zero empty servers. Install physical placement, then run the rolling plan: one old replica per Pod finishes its cohort before moving. Nova can start only when all eight local device claims fit together.',
    contract:
      'Complete a Nova training job on one eight-GPU server under topology-aware placement. See the GPU colors change only when a lease actually releases or binds.',
  },
  gpu: {
    title: 'Validate each device and each tenant boundary.',
    goal: 'Reject an impossible memory shape, choose an approved profile and isolate leases.',
    process:
      'Every GPU has an illustrative 80 GiB budget. Nova needs 448 / 8 + 16 = 72 GiB per rank. Orbit needs 64 / 2 + 16 = 48 GiB. Forge requests 320 / 4 + 16 = 96 GiB; its approved eight-GPU profile needs 56 GiB. Memory is never pooled across unrelated cards.',
    contract:
      'Finish a Forge job using its valid eight-device profile and the tenant isolation policy. A successful allocation or a purchased toggle alone does not verify the contract.',
  },
}
