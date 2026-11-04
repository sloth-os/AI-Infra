# The educational performance model

The implementation is in `src/model.ts`. All values are synthetic estimates unless explicitly identified as hardware specifications. There is no benchmark dataset or live telemetry.

## Configuration

| Input                     |                                            Default | Meaning                                             |
| ------------------------- | -------------------------------------------------: | --------------------------------------------------- |
| GPUs                      |                                            100,000 | Homogeneous allocated fleet                         |
| Tensor parallelism        |                                                  8 | GPUs per replica (fixed)                            |
| Model weights             |                             70B × 2 bytes = 140 GB | Dense BF16 model                                    |
| HBM per GPU               |                                              80 GB | H100 SXM reference specification                    |
| Runtime reserve           |                                           6 GB/GPU | Assumed activations, workspaces, overhead           |
| KV dimensions             | 80 layers, 8 KV heads, 128 head dimension, 2 bytes | Illustrative GQA model                              |
| Incoming demand           |                                       18,000 req/s | Homogeneous stationary arrivals                     |
| Input / output            |                                 2,048 / 256 tokens | Fixed per-request lengths                           |
| Maximum active batch      |                                                 64 | Clamped to peak KV memory slots                     |
| Network line rate         |                                           400 Gb/s | Effective endpoint bandwidth assumed per TP replica |
| Useful network efficiency |                                                70% | Assumed, not measured                               |
| Prefill allocation        |                                                55% | Replica allocation in disaggregated mode            |
| GPU cost                  |                                     $2.50/GPU-hour | Placeholder economic assumption                     |

GB and GB/s use decimal units; MiB uses binary units. Network line rates are in **bits/s**.

## Memory accounting

```
replicas = floor(GPUs / 8)
KV bytes per token = 2 (K and V) × 80 × 8 × 128 × 2 = 327,680
peak KV per sequence = KV bytes per token × (input tokens + output tokens)
replica KV budget = 8 × (80 − 6) − 140 = 452 GB
memory slots = floor(replica KV budget / peak KV per sequence)
active batch = min(requested batch, memory slots)
```

The default prompt cache is exactly 640 MiB across all eight ranks, approximately 80 MiB per rank under even sharding. Peak prompt-plus-output cache is 720 MiB per sequence. We reserve full output space as a conservative capacity simplification. Page tables, allocation granularity, duplicated/replicated KV heads, and model-specific cache layouts are not modeled.

## Token rates and service demand

Teaching coefficients:

```
prefill input rate = 6,000 tokens/s per TP=8 replica
decode step (ms) = 12 + 0.4 × active batch
                  + 1.5 × (input + output / 2) / 1,024
decode output rate = active batch / (decode step / 1,000)
```

Static batching multiplies both phase rates by 0.68 to illustrate padding and fixed-cohort inefficiency. This factor is not a measured vLLM speedup. Prefix reuse reduces prefill work by the chosen reusable fraction, but does not remove retained KV memory. It assumes every request hits an exact compatible prefix and ignores lookup overhead.

```
prefill demand (replica-seconds/request) = uncached input / prefill rate
decode demand (replica-seconds/request) = output / decode rate
colocated capacity (req/s) = replicas / (prefill demand + decode demand)
split capacity = min(prefill replicas / prefill demand,
                     decode replicas / decode demand)
```

Separate phase pools are rounded to whole replicas and sum to the available replica count. The relative pool size matters: an oversized prefill pool can starve decode even when total GPU count is unchanged.

## Queue and latency

```
load rho = arriving req/s / capacity
queue heuristic (ms) = 0.25 × total service demand (seconds) × 1,000 × rho/(1−rho)
handoff time (ms) = prompt KV bytes / 1e9 / (network Gb/s / 8 × 0.7) × 1,000
TTFT (ms) = 12 + prefill demand × 1,000 + queue + handoff
```

For colocated strategies, handoff is zero; a heuristic decode interference factor `1 + 0.25 × min(1.5, rho)` increases TPOT. Split pools omit this interference factor. Static TPOT also reflects its efficiency penalty. These are simplified mean trends, not p50/p99 estimates.

At `rho >= 1`, queueing and TTFT are infinite in this stationary model. The interface reports **Over capacity**, not a fabricated finite latency. A finite displayed TPOT under overload describes an active iteration, not a queue-stability guarantee.

## Throughput and cost

```
accepted req/s = min(arrival rate, capacity)
output tokens/s = accepted req/s × output length
cost / million output tokens = GPUs × $2.50 / (3,600 × output tokens/s) × 1,000,000
aggregate split KV GB/s = accepted req/s × prompt KV bytes / 1e9
```

The throughput figure is a capacity ceiling under overload, not a claim that all offered requests complete. The cost includes every allocated GPU, including idle capacity. It omits networking, CPUs, memory, storage, electricity, cooling, and provider overhead. It is not a vendor quote.

## What the model cannot predict

- Real tail latency, SLO goodput, heterogeneous arrivals, queue policy, noisy neighbors, or token-length distributions.
- Real kernel speeds, arithmetic intensity, quadratic long-prompt attention, precision effects, prefix locality imbalance, speculative acceptance, or model quality.
- Fabric contention, shared-link oversubscription, incast, per-rank transfer scheduling, overlap, or endpoint bandwidth as a capacity bottleneck. Network speed affects handoff latency only; the capacity ceiling is compute/memory-derived.
- Cold starts, checkpoint loading, failures, retry storms, admission enforcement, storage performance, retrieval latency, or Internet RTT. The fixed 12 ms baseline is illustrative.
- Training, optimizer state, backward passes, pipeline bubbles, or MoE expert skew.

The explorer animates conceptual links for education. It is not a packet simulator or physical topology optimizer. Use measured workload traces and a suitable discrete-event or production load-testing system for actual capacity planning.
