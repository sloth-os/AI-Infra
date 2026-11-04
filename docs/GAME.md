# Fleet Command game design and simulation

Fleet Command is a browser-only real-time strategy game about the constraints of AI serving. The main loop is **observe → build → serve → earn → rebalance**. The player wins a campaign mission by delivering its request target and meeting its additional infrastructure objective before the shift ends. Zero integrity or an incomplete shift ends the run. Sandbox traffic grows until the service fails or the player chooses **Finish this shift**.

## Campaign

| Mission          | Constraint                         | Delivery target | Additional objective                |
| ---------------- | ---------------------------------- | --------------: | ----------------------------------- |
| First light      | Incomplete compute path            |              12 | Build a working prefill/decode path |
| Rush hour        | Concurrent output demand           |              36 | Enable continuous batching          |
| Memory garden    | Long-context admission             |              22 | Add a KV bank                       |
| Crossing streams | Shared KV transfer bandwidth       |              24 | Reach at least 400 Gb/s             |
| Familiar voices  | Repeated, tenant-specific prefixes |              40 | Enable reuse and earn 8 hits        |
| The long shift   | Burst traffic and an outage        |              60 | Batching, a KV bank, and 400 Gb/s   |

Every mission is available immediately. A seeded request generator makes strategies reproducible. The final mission triggers a 12-second prefill outage at game second 24; selecting that engine offers a 40-credit immediate repair. The outage can also be allowed to expire.

## Service path

1. A request arrives from one of three tenants, with a mission-defined input length, output target, and deadline. Tenant colors identify it in the 3D world.
2. It waits in the admission queue until a prefill engine and enough memory are free. The game reserves the full prompt-plus-output KV footprint at admission.
3. An idle prefill engine processes the uncached prompt tokens. With prefix reuse, an idle worker holding the exact tenant-scoped key is preferred. Compatible prefixes save up to 1,536 tokens, bounded by 75% of the prompt. Prefixes become warm only after prefill finishes; each engine retains at most three prefix keys.
4. Finished prefill waits for a decode slot. Assignment reserves that slot throughout KV transfer and decoding.
5. Prompt KV travels over the shared fabric. All simultaneous transfers share the available bandwidth. Increasing link capacity changes their actual completion time.
6. The decode engine generates the target output while retaining the KV reservation. Continuous batching adds concurrent slots and shares aggregate decode throughput across active sequences.
7. Completion earns credits and releases memory. A missed deadline releases the reservation, damages integrity, and earns no completion reward.

The live request lens follows these same objects. Its token counter, phase, tenant, memory size, and remaining deadline come from simulation state. A highlighted packet and its route correspond to that request. The orbital motion, trails, crystal rotation, and layout are illustrative; one moving object represents a request or KV payload rather than an individual wire packet.

## Construction and economy

| Module         | Cost | Base power | Level 1 capacity               |
| -------------- | ---: | ---------: | ------------------------------ |
| Prefill engine |  120 |          3 | 850 input tokens / game second |
| Decode engine  |  100 |          2 | 48 output tokens / game second |
| KV memory bank |   80 |          1 | +2,048 MiB                     |
| Fabric switch  |  110 |          2 | +200 Gb/s                      |

Modules have three levels. An upgrade costs `round(base cost × 0.65 × current level)`. Compute engines add one power unit per additional level; banks and switches add one at level three. Prefill rate is `850 × (1 + 0.65 × (level − 1))`; decode rate is `48 × (1 + 0.55 × (level − 1))`. Bank capacity and fabric bandwidth grow linearly with level.

Batching research costs 85 credits. It changes a decode engine from one slot to `min(4, level + 1)` slots. With `n` actively decoding sequences, aggregate output rate is multiplied by `1 + 0.55 × (n − 1)` and divided equally among them. A sequence transferring KV occupies a slot but contributes no output yet.

Prefix research costs 70 credits and reserves 256 MiB of memory. This is a fixed gameplay budget for warm prefix metadata/state, not a faithful prefix cache allocator. Compatible warm keys are scoped to a tenant and never reused across tenants. Three 120-credit power upgrades each add eight units to the initial 18-unit budget.

Each successful request earns 12 credits and `100 + max(0, round(deadline headroom × 5))` points, plus 15 points on a prefix hit. Victory adds `integrity × 4 + remaining shift seconds × 2`, rounded. Missed deadlines subtract eight integrity; rejection from a full 64-request queue subtracts two. Recycling returns 60% of invested credits, rounded down. Busy compute engines and memory banks required by retained requests cannot be recycled.

Campaign medals award three stars for at least 90% integrity and mean completed-request latency below ten game seconds; two stars require 65% integrity, otherwise one star. Best scores and stars are validated before reading from local storage. There is no remote leaderboard, account, telemetry, or backend.

## Reference calculations and teaching time

Prompt and output KV use the existing analytical reference in `src/model.ts`:

```
KV bytes per token = 2 (K and V) × 80 layers × 8 KV heads
                     × 128 dimensions × 2 bytes = 327,680
prompt KV MiB = input tokens × 327,680 / 2^20
reservation MiB = (input tokens + output tokens) × 327,680 / 2^20
```

A 2,048-token prompt therefore transfers **640 MiB** across the reference tensor-parallel group. Fabric rates are decimal gigabits per second; memory is binary MiB. The transfer model assumes 70% useful line rate and **stretches transfer wall time by 45×** to expose congestion during a short playable shift. The game explicitly labels its balanced time and currency.

This is a small serving district, not a literal 100,000-GPU simulator. Engine geometry is symbolic; a bank pools memory without modeling physical HBM placement. Routing uses available phase slots and prefix locality; it does not model actual schedulers, packet switching, tensor-parallel collectives, per-rank cache layouts, kernel timing, or complete transformer computation. Game deadlines, throughput curves, power units, and costs are design parameters. The separate Learning mode explains actual architectures and larger fleet trade-offs with its own documented assumptions in [MODEL.md](MODEL.md), [MOTION.md](MOTION.md), and [RESEARCH.md](RESEARCH.md).

## Controls and accessibility

The 3D world supports click/tap selection, drag orbit, and zoom. Equivalent labeled sector buttons support keyboard and touch input. Native dialogs trap focus and support Escape. Mission control, help, request inspection, and Learning mode pause a running shift. Building, upgrading, research, and recycling remain available while paused. Returning from Learning mode preserves the current run; reloading resets the run while retaining recorded personal bests.

Hidden tabs do not advance the simulation. Off-screen or inactive renderers stop drawing. Reduced-motion preferences disable ambient movement and CSS transitions; the pause control freezes meaningful gameplay motion and deadlines. A no-WebGL tactical grid retains the complete simulation, missions, economy, and results.

## Verification

`tests/game.test.ts` checks valid budgets, rejected actions, immutable updates, pause, deadline losses, memory admission and safe recycling, tenant-scoped reuse, real bandwidth effects, batching throughput, repairs, local progress validation, and a winning strategy for each campaign mission. Browser tests exercise actual 3D raycast construction, a complete first-mission victory, persisted medals, sandbox economy, Learning-mode round trips, mobile controls, live request inspection, and the no-WebGL fallback.
