# Cloud provider scenario

## Learn through the same physical world

Open `?view=explore&provider=cloud` for the Learning version, or choose **Cloud provider scenario** in **Connections** at any hardware level. The cloud game’s **Learning mode** button opens this story at its current scale. The reader can return to the retained cloud game. Both modes keep their existing canvases and cameras.

Switching between this lesson and its game pauses their separate clocks and retains both the Learning policy/replay settings and the Game run. Entering the lesson for the first time uses its default plan; browser history and shared links restore their own serialized lesson state.

Learning provides three sections inside the shared level reader:

- **Service boundary** explains the resource envelope, admission, device binding, artifact transfer, customer runtime, checkpoint acknowledgment and lease return. A responsibility table distinguishes the physical cloud from the model/API provider. A link follows the selected customer’s pre-training, post-training or inference into the existing lifecycle lesson on the same hardware.
- **Capacity lab** runs a baseline and a selectable policy plan from the same initial district and workload arrivals. The eight policies are free to toggle, with two at each physical scale. A policy change rewinds the experiment. Enabling placement includes the explicit rolling-repack request at time zero; devices still move only after a real cohort drain.
- **Evidence** retains the primary Kubernetes, Kueue and NVIDIA documentation, synthetic manifest formulas and scope limitations described below.

Use the dock’s replay slider, play/pause and 1×/2×/4× controls. **Baseline / My plan** changes the allocation shown on the existing 3D infrastructure at the same teaching time. Select a customer, server and GPU to inspect its actual lease, memory footprint and resource envelope. The comparison table reports committed jobs, served toy requests, OOM events, fabric bytes, cache hits, readiness, wasted work and leased/useful GPU-seconds for both runs. Low network traffic from a blocked job is not counted as improved service.

The paired replay ends when the plan satisfies its workload goal or at 60 teaching seconds. The baseline is advanced only to the same elapsed time; a completed plan is never compared against a longer baseline run. Quarter-second snapshots use identical integration steps, with the final interval shortened if the goal completes. Within a stable lease stage, moving payloads interpolate its byte/compute progress between adjacent samples. The reference request timeline stays frozen while this story is active. Playback never automatically moves the selected hardware scale or awards game medals.

Sharing retains the project prefix, workspace, scale, policy mask, selected tenant/server/GPU, comparison side, reader section, speed and replay time. Reloaded links start paused. The `provider=cloud` and `cp_` parameters are removed when choosing another story. Reduced motion leaves manual scrubbing and experiments available; WebGL fallback uses the same physical hierarchy and numerical replay. Compact layouts keep the replay slider and scale/camera controls available outside the scrolling reader.

The Learning implementation is in `src/learning/provider/`; it reuses the pure capacity model and physical annotation adapter in `src/game/provider/`. It does not create another world or replace the existing workload models. `tests/provider-learning.test.ts` checks matched time, resource bounds, policy-dependent outcomes, semantic/physical mappings, interpolation and safe URL round trips. Browser checks cover mixed discovery, one persistent canvas, replay/pause, sources, sharing, lifecycle links, mode handoff, mobile controls, reduced motion and fallback.

A pixel-level browser regression verifies that the paused hardware remains visible after a responsive resize. Resize notifications explicitly invalidate the WebGL frame, including repeated notifications with unchanged dimensions; settled scenes still skip redundant GPU draws.

## Play the capacity game

Open `?scenario=cloud-provider` or select **Cloud provider** with the cloud icon in the game header. A launch button also appears under the desktop campaign heading. The scenario shares Lifecycle Command’s existing physical world, camera and Fleet → Pod → Server → GPU rail. Switching roles pauses and retains each run; it never starts a separate 3D world.

You own a district of **64 dedicated GPU slots**, eight servers, two Pods. Three **fictional teaching customers** request capacity: Nova trains, Forge tunes, Orbit serves inference. Names and workload manifests do not describe real vendors. Other hardware visible in the reference fleet lies outside the district.

## Service boundary

The cloud receives a resource envelope: identity, device class/count, topology, peak per-device memory, artifact references, capacity targets and recovery protocol. It supplies physical devices, claims/leases, placement, networking, storage, tenant boundaries and metering. The model provider owns the model, objective, runtime, user APIs, parallelism compatibility and checkpoint semantics. Customer prompts do not pass through the cloud resource scheduler in this scenario.

The model operator scenario explains forward/backward passes, objectives, prefill, decode and KV residency. This scenario shows how those workloads obtain dependable physical capacity together.

## Four physical-level problems

| Level  | Initial problem                                                                                        | Intervention and observable result                                                                                                                                                         |
| ------ | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fleet  | Capacity competes across three customers; an inference burst arrives at 18 game seconds.               | Fair quota/idle borrowing, plus protected peak capacity. Observe admitted work, GPU-seconds and cloud-ready replica time.                                                                  |
| Pod    | Artifacts and checkpoint writes contend for one bounded storage/uplink budget.                         | Weighted transfer queues and tenant-scoped local artifact caches. Observe actual shared wire rate, transferred bytes and cache hits.                                                       |
| Server | Every server holds a two-GPU replica: 48 GPUs are free but no complete eight-GPU local domain is free. | Pack replicas while spreading across Pods; roll existing leases after their current cohort. Eight-device training gangs start only after a domain becomes available.                       |
| GPU    | Forge’s four-device manifest needs 96 GiB per rank on an 80 GiB device.                                | Select its explicitly approved eight-device profile, at 56 GiB/rank, and require dedicated tenant device/runtime boundaries. Observe valid completed jobs instead of repeated runtime OOM. |

Install policies with 280 engineering credits. Installation pauses the clock and affects future admissions. At Server, **Run rolling placement plan** requests an actual drain/rebind; purchasing placement does not teleport live jobs. One old replica per Pod drains at a time, after its cohort completes, with at least one ready replica left in that Pod. New leases are excluded from repeated draining.

Cloud-ready capacity is a provisioning target, not the model provider’s end-user latency. Orbit replicas remain warm across cohorts; they reload artifacts only when newly admitted or relocated. A GPU’s unused VRAM stays inside its dedicated lease and cannot be assigned to another tenant.

## Declared simulation inputs

- 8 servers × 8 whole GPUs, 4 servers per Pod. Each device has an illustrative 80 GiB budget, without claiming a specific accelerator product.
- Peak memory = declared shardable state / approved GPU count + 16 GiB workspace. Nova: 448/8+16=72 GiB. Orbit: 64/2+16=48 GiB. Forge: 320/4+16=96 GiB (invalid) or 320/8+16=56 GiB (approved). The cloud selects an approved manifest; it does not silently change model precision or tensor parallelism.
- Opaque artifact/input bundles are 96/16/80 GiB for Nova/Orbit/Forge, distinct from resident GPU state. Durable batch checkpoints are 8/4 GiB. Their contents and correctness belong to the customer.
- Each Pod has 100 Gbit/s × 70% useful transfer capacity. GiB/s conversion uses `Gbit/s × 10^9 / 8 / 2^30`. Concurrent transfers divide this fixed budget; serving weight is five with QoS, batch one. No simulated QoS policy creates bandwidth.
- Artifact cache: 128 GiB per server, LRU eviction, keys include tenant and immutable artifact digest/version. Cache hits share the server’s 20 GiB/s local disk budget. Caches are separate from HBM. Seed inference replicas already have warm weights; persistent cohorts do not repeatedly load weights.
- Transfer time = physical seconds × 0.18. Nova compute takes 12 game seconds; Forge 8; Orbit cohorts take 3 and deliver eight toy requests. No FLOPS or token-rate benchmark is implied.
- Nominal quotas: Nova 24, Orbit 24, Forge 16 GPUs. Fair admission permits idle borrowing. Peak protection caps batch allocations at 40 GPUs, allowing Orbit’s 16→24 GPU expansion. Before the burst, eight devices can intentionally remain idle.
- Reclaiming borrowed batch capacity without acknowledgment loses computed work. Safe reclaim waits for a two-second compute boundary, writes a customer checkpoint while retaining devices, then acknowledges release. Re-admission restores remaining work. Disruption budgets and checkpoints do not guarantee recovery from all failures.
- Illustrative tariff: $2 per leased GPU-hour, using game seconds. Engineering credits are a separate gameplay budget. GPU occupancy includes staging, writes and compute. Useful batch GPU-seconds count only when the checkpoint completes; serving compute counts live. In-flight batch work is not yet committed useful work.
- Shift limit 120 game seconds; the burst arrives at 18. Provision 12 replicas within 10 game seconds of that request. Fair admission and the peak policy must already be installed, with eight GPUs actually free when the burst arrives; buying reserve afterward cannot earn this evidence. Inspect every level, finish at least two Nova and two Forge jobs, deliver at least 128 requests, and verify all four level contracts. Purchases and camera visits alone never award a contract.

The renderer colors **actual device claims**: blue training, green inference, purple tuning, dim idle, red memory overflow. Fleet shows 64 slots on two highlighted Pod blocks; Pod shows 32 on the first four physical bays; Server shows its eight actual device positions. GPU uses tiles of 2.5 GiB on the selected device, including overflow when an invalid lease is present. Animated artifact and checkpoint paths use the traced lease’s real server; runtime memory and collective paths stay within that lease’s physical domain. The progress input comes from simulated transferred bytes or compute work, not an independent looping movie.

## Primary research

Reviewed official documentation for the mechanisms below. The simulation is an original, deliberately bounded teaching model; it is not an implementation of every scheduler rule in these systems.

- [Kueue ClusterQueue](https://kueue.sigs.k8s.io/docs/concepts/cluster_queue/) and [cohorts](https://kueue.sigs.k8s.io/docs/concepts/cohort/): admission, nominal quotas, lending, borrowing and reclaim.
- [Kueue topology-aware scheduling](https://kueue.sigs.k8s.io/docs/concepts/topology_aware_scheduling/): required/preferred node, rack and block placement domains.
- [Kubernetes Dynamic Resource Allocation](https://kubernetes.io/docs/concepts/scheduling-eviction/dynamic-resource-allocation/): resource claims and device allocation.
- [Kubernetes multi-tenancy](https://kubernetes.io/docs/concepts/security/multi-tenancy/): namespaces, network/storage boundaries and stronger runtime isolation. Namespaces alone do not implement the policy modeled here.
- [Kubernetes disruptions](https://kubernetes.io/docs/concepts/workloads/pods/disruptions/): voluntary availability protections and their limits; checkpoint correctness remains application-specific.
- [NVIDIA MIG guide](https://docs.nvidia.com/datacenter/tesla/mig-user-guide/introduction.html): hardware partitions and memory/fault isolation on supported profiles. Device/interconnect compatibility must be checked.
- [NVIDIA GPU time-slicing](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/gpu-sharing.html): shared execution access without MIG-style memory/fault isolation; requesting additional replicas does not imply proportional compute or more physical memory.

Excluded: optimizer convergence, model quality, measured GPU performance, packet-level routing, adversarial isolation verification, thermal/power simulation, real failure rates and financial forecasting. The previous lifecycle and learning scenarios retain their own explicitly scoped models.

## Verification

`tests/provider.test.ts` verifies device-claim conservation, server gang placement, per-device envelopes, bounded cache/network budgets, persistent warm replicas, pause/reset behavior, safe rolling drains, borrowed-work reclaim and a full playable strategy. Browser coverage verifies the shared canvas, level navigation, actual completion, role switching, responsive controls, reduced motion, research dialogs and WebGL fallback.
