> **Current integration:** hot issues, lifecycle and real models are now connected stories inside the four physical levels, reached through **Connections**. Their former standalone navigation and 3D platforms have been removed. See [CONNECTED-INFRASTRUCTURE.md](CONNECTED-INFRASTRUCTURE.md) for the current interaction, mappings, continuity and verification. The sections below retain the reference explorer's foundational behavior.

# Learning in 3D UI Fusion

Learning Fusion makes the infrastructure the shared workspace for Explore, Request journey, Trade-off lab, and Field guide. The renderer, hardware, teaching clock, workload, and serving strategy persist between those four views. Switching to Fleet Command pauses the learning world and preserves the game run; returning resumes the same learning canvas.

The **Connections** catalog includes six source-backed real models inside that same hardware world. Each model has a six-operation walkthrough across the physical levels, inspectable data representations, serving/source panels, quantitative data exercises, and a comparison reader. The reference infrastructure timeline pauses while a connected story is active; returning restores it. Case-study controls use their own published formats and do not alter the lab's parameters. See [REAL-MODELS.md](REAL-MODELS.md) for research, version boundaries, and calculations.

## Learn through the world

| Workspace       | Interaction                                                                                                                                             | What the learner can investigate                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Explore         | Select physical hardware or a projected label. A tether connects it to a stable explanation surface.                                                    | Understand its role, inspect problem/solution/trade-off, change the workload, focus the camera, or follow its request stage.                 |
| Request journey | Edit a local example prompt, include or skip retrieval, and choose or play seven stages. Each stage selects the relevant scale and data transformation. | API text, retrieval vectors, tokenization/routing, model embeddings and prefill, retained KV handoff, iterative decode, and streamed output. |
| Trade-off lab   | Change eight shared inputs and compare three serving strategies beside the 3D world.                                                                    | Offered load, queue stability, TTFT, per-token time, replica counts, KV memory, and handoff cost.                                            |
| Field guide     | Search concepts, glossary entries, or six primary sources. Locate a result in the infrastructure.                                                       | Connect terminology to the relevant hardware, then open the complete reader for deeper explanations.                                         |

Object explanations occupy a stable screen position so a moving camera or payload does not move actionable controls. Their reticles and tethers follow projected world coordinates in the renderer. Desktop placement clears the scale rail, camera rail, and command dock; mobile placement reserves room above the dock. Actual surface dimensions come from ResizeObserver. Long floating panels keep their dismissal controls visible while scrolling.

Focus clears the explanation and approaches the selected hardware. **Ride** clears the surfaces and follows the animated payload's actual position. **Tour** follows chapter boundaries across infrastructure scales. Isometric, top-down, front, exploded hardware, labels, heatmap, and cinema controls change the existing world. Manual camera gestures release automatic tracking and touring.

## One data state

All four lenses use `getMotionFrame` and the deterministic 48-second teaching timeline described in [MOTION.md](MOTION.md). Scrubbing, selecting a chapter, pausing, and changing playback speed operate on that clock.

The ring playground is synchronized with the world. Its slider maps completed exchanges 0–14 to the same timeline snapshots used by the rank labels, contribution tiles, and data parcels. The inspector reads `frame.buffers[rank]` and `frame.contributions[rank]`; fourteen exchanges leave all eight ranks with `[36, 36, 36, 36, 36, 36, 36, 36]`. It does not animate an independent approximation of the sum. Classic mode retains the original independent scratchpad.

The lab and world share all eight inputs and the selected static, continuous, or split prefill/decode strategy. `simulate(params, strategy)` drives the analytical comparison and the world frame's offered load. KV dimensions derive from the declared 80-layer, 8-KV-head, 128-head-dimension, BF16 model: **327,680 bytes per token** across TP=8. A 2,048-token prompt is **640 MiB** across the group and **80 MiB per rank**. Updating prompt length changes the lab, metrics, parcel inspector, journey handoff, and memory labels together. The lab's handoff estimate applies only to split serving; colocated strategies avoid that network transfer.

The journey shows prefill in the logical transformer world and handoff in the pod's KV world. Disabling retrieval skips that optional stage in both directions. Example JSON safely displays the edited prompt and calculates handoff bytes from the current parameters. The prompt stays in the browser; no model is executed.

Glossary navigation locates related infrastructure. Data parallelism leads to fleet routing, pipeline parallelism to a server's communication boundary, expert parallelism to the pod fabric, and tensor parallelism to local collectives. These associations locate an explanation; they do not claim to simulate complete pipeline or expert routing algorithms.

The geometry remains a **100,000-GPU reference architecture**, regardless of the lab's modeled fleet size. Hardware blocks aggregate machines. Animation runs in teaching time; colors, shapes, page tiles, and parcel speeds are illustrative. Performance is synthetic, not measured telemetry or a benchmark. The complete performance workbench exposes the original coefficients, queue/network assumptions, charts, and limitations from [MODEL.md](MODEL.md). The complete field guide retains the parallelism comparison, network domains, training distinction, glossary filters, and research links from [RESEARCH.md](RESEARCH.md).

## Controls and access

| Control                                      | Action                                                       |
| -------------------------------------------- | ------------------------------------------------------------ |
| Click/tap hardware or a projected annotation | Inspect the component or data parcel                         |
| Component picker                             | Select a labeled component when labels are hidden or overlap |
| 1–4                                          | Fleet, pod, server, GPU scale                                |
| Drag / pinch / wheel                         | Orbit and zoom                                               |
| Space outside a button or text field         | Pause or resume the teaching clock                           |
| Q / E                                        | Rotate the camera                                            |
| R                                            | Isometric view                                               |
| F                                            | Start or stop riding the teaching payload                    |
| H                                            | Cinema mode / restore controls                               |
| L                                            | Hide or show world labels                                    |
| Escape                                       | Dismiss the current surface, cinema mode, or native dialog   |

Every action also has a labeled conventional control. Inputs retain their normal editing keys. Spatial inspectors and floating panels are nonmodal. Full workbench, complete guide, and help use native dialogs with focus trapping and Escape dismissal. Off-screen world labels leave the tab order; the component picker remains available.

Reduced motion stops autonomous timeline playback and orbit, and applies camera and scale changes immediately. Manual scrubbing and stage selection still work. Without WebGL, the same controls, analytical lab, synchronized collective buffers, searchable library, and request journey operate over an accessible topology. A lost context disposes the renderer and uses this fallback without creating a hidden replacement.

The header's layout toggle preserves parameters, strategy, selection, and the explorer's teaching time while opening the classic interface. Returning to the Fusion journey frames the currently selected request stage. Fusion is the default for `?view=explore`, `?view=journey`, `?view=lab`, and `?view=guide`; `learn=classic` selects the original layout. Copied Fusion scenarios preserve the site's base path and include `view=lab`, `learn=fusion`, strategy, and all eight inputs.

## Implementation and verification

- `src/learning/LearningFusion.tsx` connects the persistent world, projected inspector, floating surfaces, journey, and camera interactions.
- `LearningLab.tsx` and `LearningLibrary.tsx` provide the shared experiments and contextual reference search.
- `src/learning/model.ts` contains pure navigation, URL, payload, exchange-time, and placement rules.
- `src/spatial.ts` shares bounded, stable placement with game Fusion.
- `InfrastructureScene.tsx` lazily creates the runtime on first activation and retains it across workspace changes. `src/scene/engine.ts` handles projection, picking, camera interpolation, payload following, and rendering.

Pure tests cover stage mapping, optional retrieval, exact collective snapshots, parallelism distinctions, parameterized URLs, strategy/model consistency, KV payload bytes, and stable placement. Browser tests exercise all four workspaces, shared model changes and reload, synchronized algorithms, local prompt handling, complete readers, camera tracking, cinema, layout continuity, mobile bounds, reduced motion, and unavailable WebGL. The existing game and classic-learning suites guard the preserved interfaces. No runtime dependencies or external services were added.

## AI lifecycle workflows

**Connections** links pre-training, post-training and inference to the same fleet, pod, server and GPU. Each phase has six 3D stages and a flow, sizing, network/choices and evidence reader. SFT, DPO and GRPO switch post-training data, loss and infrastructure roles. Topology, sharding, LoRA, rollout and KV controls change both the declared calculations and aggregate world glyphs. The comparison reader connects the artifacts across all three phases.

In a lifecycle lesson, **1–4** selects a physical level and **arrows** select a connected step, **Space** controls lesson playback, and **F** focuses the connected hardware. Cinema also controls the lesson clock; the original request timeline stays frozen. **3D view/Details**, mobile access, reduced motion, shared URLs and 2D fallback follow the existing connected-story conventions. [LIFECYCLE.md](LIFECYCLE.md) documents source revisions, formulas, visual aggregation and verification.

## Learning missions and shared visual quality

**Trade-off lab → Learn by solving** offers four constraints-based missions using the lab's actual analytical results and world parameters. Each provides a workload/budget brief, live checklist, optional hint, reset, solution check and locally saved stars/XP. Loading a mission selects its scale/lens/component together; ordinary controls remain available. **Calm / Balanced / Cinematic** signal settings persist across game and learning modes without recreating a canvas or changing the underlying calculations. [EXPERIENCE.md](EXPERIENCE.md) explains mission solutions, limits, effect semantics and checks.

## Top-ten infrastructure briefing

**Connections** exposes ten issues on the existing hardware, with editorial selection, detailed explanations, experiments and dated primary sources. Each issue has a perspective on every level. **1–4 / arrows** chooses scale or connected steps; **Space** plays the five-second-per-level walkthrough; **F** focuses connected hardware. Intervention choices and inputs persist through zoom changes. 3D view/Details, cinema, sharing and physical fallback retain the same hierarchy. See [HOT-ISSUES.md](HOT-ISSUES.md) for research and quantitative assumptions, and [CONNECTED-INFRASTRUCTURE.md](CONNECTED-INFRASTRUCTURE.md) for the current UI.
