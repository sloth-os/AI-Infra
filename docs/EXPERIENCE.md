# Flow effects, operator gameplay and learning missions

The two modes share **Calm**, **Balanced** and **Cinematic** signal-effect settings, available from the sparkle control in their headers. The setting follows the user between modes and survives reloads; storage failures fall back to an in-memory preference. Changing quality does not recreate a canvas or change simulation coefficients, scheduling, memory calculations or model weights.

## Effects carry information

- **Soft signal heads and wakes** use the positions and colors already calculated for request, KV, collective, tensor and model/lifecycle pipelines. They do not create extra model requests or fake throughput. A procedural point shader provides radial falloff with no image downloads or full-screen bloom pass.
- **Event rings** mark actual construction, upgrades, faults, recovery, request phase changes, successful completions and missed deadlines. Rings have bounded pools and age on the simulation/lesson clock. Pausing freezes them; backward seeks remove effects from the previous timeline. Reduced motion uses static ring poses.
- **Output stream beads** appear while decode produces output, before the request completes. One gold teaching bead represents eight generated output tokens; it does not claim to be an HTTP/SSE packet or a fixed number of UTF-8 bytes. The renderer counts observed generated-token boundaries, bounds retained flights and never adds tokens to the game state. Calm/reduced-motion views omit this extra stream animation while keeping actual request state and counters.
- **KV handoff ribbons** connect each transferring request’s assigned prefill and decode engines. Twelve visual segments fill from the same `1 − remaining / stageTotal` byte-progress fraction used for the request path. Dim segments are pending work. This is a progress representation, not a claim that the game implements a twelve-shard protocol.
- **Pipeline parcels face their direction of travel**, including simultaneous opposite speech lanes and reverse activation-gradient flow in the pre-training lesson.
- **Hardware detail** adds schematic board contacts, cooling fins and switch indicators using the existing instanced geometry batches. These are teaching symbols rather than a physical reproduction of a specific GPU/server SKU.
- **Build feedback** uses a short eased scale transition. Building or inspecting while paused shows a full-size module immediately. Faulted module rotors stop. Reserve activation adds warm signals and a faster rotor only while the selected module actually has increased modeled capacity.

Shader point heads and instanced rings add a bounded number of draw calls. Buffers are reused, quality retains the existing adaptive pixel ratio, off-screen/hidden scenes stop rendering, and material/buffer cleanup includes new effect objects. Calm keeps essential paths and state. Reduced-motion preferences retain manual navigation and essential game-state progress without extra autonomous effects.

## Operator decisions

Open **Operations research** from the game dock. The native **Mission control** menu also exposes operations, including in tactical and no-WebGL layouts. Select a compute engine or switch in the 3D world to activate its reserve directly; **B** activates the selected module’s reserve when ordinary game shortcuts are available.

### Queue policies and memory backfill

| Policy            | Decision                                           | Trade-off                                                                             |
| ----------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| FIFO              | Oldest arrival first, with stable ID ties          | Predictable ordering; long or memory-blocked head requests can delay small requests   |
| Earliest deadline | Earliest absolute expiry (`born + deadline`) first | Gives urgent waiting work priority; already running work is not preempted or migrated |
| Shortest prompt   | Lowest input-token count, then arrival/ID          | Small prompts can finish sooner; long requests may wait or miss deadlines             |

Policies order both waiting admission and ready-for-decode work. Existing workers and reservations stay attached to running requests. The default is FIFO, preserving the original campaign behavior.

**Memory backfill** is optional and off by default. When enabled, admission can continue past a request whose retained KV reservation cannot fit, allowing another fitting request to use an idle prefill engine. It does not evict or shrink existing KV, grant extra memory, or guarantee fairness to the bypassed request. The same pooled-memory check still applies to every admitted request.

### Capacity reserve

A reserve is an explicitly synthetic **game ability**, not a hardware overclock specification:

| Rule                 | Value                                                                |
| -------------------- | -------------------------------------------------------------------- |
| Target               | One online prefill engine, decode engine or fabric switch            |
| Capacity factor      | 1.75× the chosen engine’s compute or switch’s bandwidth contribution |
| Duration             | 6 game seconds                                                       |
| Capacitor cost       | 60 energy                                                            |
| Extra reserved power | 2 game power units                                                   |
| Global cooldown      | 22 game seconds                                                      |
| Recharge             | 2 energy / game second, capped at 100                                |

Cache banks cannot be surged: extra compute/bandwidth does not fabricate KV capacity. The action validates energy, cooldown, online status and free power before spending anything. Another activation cannot stack during cooldown. Construction/upgrades account for reserved power, and the active module cannot be recycled until its reserve ends. Offline targets do not gain capacity. Pausing freezes duration, recharge and cooldown; a reserve can be prepared while paused and takes effect when game time resumes.

A request records whether it actually used increased prefill/decode capacity or a surged fabric contribution. Completing it increments reserve-assisted deliveries. Neither activating a reserve nor changing a queue policy automatically completes a request.

### Service contracts and stress drills

Optional contracts reward observed state and require an explicit claim:

| Contract          | Requirement                                                                   | Claim reward           |
| ----------------- | ----------------------------------------------------------------------------- | ---------------------- |
| Steady hands      | Best uninterrupted delivery streak ≥ 10                                       | 40 credits + 150 score |
| Reserve operator  | At least 3 delivered requests that used a reserve                             | 45 credits + 150 score |
| Balanced district | ≥ 10 deliveries, batching installed, a KV bank, and ≥ 400 Gb/s current fabric | 80 credits + 150 score |

Rewards can be claimed only once per run and do not change baseline campaign economics unless claimed. A rejected/expired request breaks the live streak; the best streak remains recorded for the current run. The normal completion reward stays 12 credits.

**Open horizon** adds optional burst and long-context drills. Each inserts up to eight real queued requests, bounded by the existing 64-request admission limit, with a fifteen-game-second drill cooldown. Context requests use 4,096/8,192 input tokens; burst requests use 256/512. They use normal KV reservations, workers, shared bandwidth, output generation and deadlines. They can overload the service and reduce integrity. Campaign missions do not accept drill actions.

## Learning by solving

In **Learning mode → Trade-off lab**, open **Learn by solving**. Four missions use the exact same declared dense 70B/TP=8 analytical model and parameters as the live lab and 3D load/KV view. Loading a mission atomically selects its appropriate scale, lens and component, then pauses the teaching clock for inspection.

| Mission                   | Fixed workload and constraints                                                                                                             | Example valid response                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Hold the traffic spike    | ≥ 3,200 req/s; 2,048 input / 256 output tokens; ≤ 8,000 GPUs; < 90% offered load; ≤ 80% explicitly eligible prefix reuse                   | Continuous batching and 80% compatible reusable prefix         |
| Give context a home       | ≥ 150 req/s; 32,768 input / 256 output tokens; ≤ 8,000 GPUs; no prefix reuse; requested batch must actually fit and service must be stable | Batch limit 32, below the model’s 41-slot KV cap               |
| Balance the two pools     | Split serving; ≥ 800 req/s; 4,096 input / 64 output tokens; ≤ 8,000 GPUs; no prefix reuse; < 90% offered load                              | Allocate 65% of replicas to prefill                            |
| Unblock the state handoff | Split serving; ≥ 800 req/s; 4,096 input / 256 output tokens; ≤ 8,000 GPUs; no prefix reuse; handoff < 50ms; endpoint ≤ 400 Gb/s            | Increase the endpoint to 400 Gb/s; modeled transfer is 38.35ms |

GPU budgets, minimum demand, prompt/output lengths, architecture requirements, eligible prefix limits and network budgets are all checked. A player cannot win by lowering demand, silently truncating context, buying an unlimited fleet, treating arbitrary prefixes as reusable, or switching away from a required split architecture. The context mission intentionally starts with a stable service whose requested batch is silently clamped; solving it requires recognizing that the requested batch itself does not fit.

Every mission has a live checklist, optional hint, reset and explicit **Check my solution** action. A valid solution earns three stars in the first two checks, two stars on later checks, or one star after a hint; the best result persists locally under known mission IDs with bounded integer stars. Each saved star is worth 100 learning XP. Saved stars measure puzzle completion, not production readiness or a benchmark. Different valid configurations can pass when they satisfy the same constraints.

These missions do not reuse the dense decoder formulas as universal estimates for the separate real-model field trips or the lifecycle labs. Their source/assumption records remain in [MODEL.md](MODEL.md), [RESEARCH.md](RESEARCH.md), [REAL-MODELS.md](REAL-MODELS.md) and [LIFECYCLE.md](LIFECYCLE.md).

## Access, layout and checks

All decisions have labeled conventional controls and work without WebGL. Quality menus support Escape/outside dismissal; native dialogs keep focus behavior. Mobile header menus stay in the viewport. Short-phone briefings scroll internally above their fixed footer, and the game viewport cannot scroll sideways toward projected labels or transformed preview geometry. Floating readers preserve their own scrolling.

The game model is deterministic and independent of the renderer. Tests cover policy ordering, retained-memory backfill, real reserve rates/costs/expiry/pause, single-switch effects, rejected actions, one-time contract rewards, delivery/streak accounting, bounded real stress requests, transfer geometry and output-token grouping. Learning tests prove each initial mission is unsolved, valid solutions exist, and shortcut configurations fail. Effect tests cover exact positions, bounded buffers, pause/reduced-motion/seek behavior and GPU-resource cleanup. Browser tests exercise both modes, shader compilation, mobile layouts, persistence, world alignment, real operations, mission solutions and reduced-motion/no-WebGL access.
