# Connected infrastructure stories

Hot issues, AI lifecycle and real models now live **inside the same Fleet → Pod → Server → GPU explorer**. They have no separate header destination, stage islands or alternate 3D world. The original physical hardware, scale rail, camera and canvas remain in place.

## Explore from a place

Choose a scale, inspect a component, or use **Connections** in the command dock. The contextual catalog combines:

- Relevant infrastructure issues with experiments and dated evidence.
- Pre-training, post-training and inference work at the selected level.
- All six real models, with the operations relevant to that level.

Selecting a story opens a reading surface alongside the hardware. The perspective at its top explains what the story means **here**. Four level buttons remain available in the reader and the main scale rail. The source-backed flow, serving recipes, analytical budgets, objective/schedule toys and evidence readers are retained.

For an issue, changing scale retains the same issue, intervention and input assumptions. For a model or lifecycle phase, it retains the same model/phase and inputs, and selects the current or first compatible operation at the new level. Selecting a specific walkthrough step visits that operation's native level. Changing workload keeps the current physical level. This mapping is pedagogical; it is not a claim that every component must run on a separate worker or that a published model consumes all eight reference GPU slots.

**Play connected walkthrough** follows the story through its levels: four perspectives for an issue; six operations for a model or lifecycle phase. **1–4** changes scale, arrows choose a walkthrough step, **Space** plays/pauses, and **F** focuses the connected hardware. World/Details hides/restores the reader. Cinema controls the same walkthrough. Clearing the story leaves the selected hardware scale and resumes the retained base timeline according to its previous pause state.

## One physical world, distinct mechanisms

| Level  | Physical context                                                                | Examples of connected stories                                                                                                                   |
| ------ | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Fleet  | Existing request ingress, placement/router, reference pods and artifact storage | Power/grid budgets, gang placement, checkpoint durability, authenticated tenants, dataset admission, policy release, real-model request formats |
| Pod    | Existing worker bays and leaf–spine fabric                                      | Conditional P/D state transfer, MoE dispatch/combine, pipeline/gradient exchanges, RL role orchestration and model-specific worker traffic      |
| Server | Existing eight accelerators, NVSwitch and network interface                     | Model/data parallel placement, rank communication, state sharding, component residency and local free-slot fragmentation                        |
| GPU    | Existing compute die, HBM stacks and peer interface                             | Forward/backward states, K/V residency, precision metadata, verification probabilities, image latents and audio/token buffers                   |

The common fleet/server geometry remains a **reference architecture**, not a vendor inventory or the requested experiment's literal GPU count. Contextual labels distinguish training workers from inference pools and media workers. Media models retain their own representations; they do not inherit the generic dense text-KV calculation.

A bounded annotation layer attaches glyphs and moving signals to that hardware. It does not build a second chassis, replacement fleet, six-stage platform loop or ten-issue island map. Notable mappings:

- KV payload pages sit near HBM; 32 glyphs represents the selected model-group budget and display caps at 64, while the full requested byte count remains in the readout.
- The MoE toy distributes logical expert visits and adds a compatible physical replica. Kimi separately retains 896 logical expert glyphs, 16 illustrative routed choices and two shared experts across the visible pod workers. Neither visual specifies the vendor's actual expert-to-GPU placement.
- The node-local placement toy colors the eight slots on the visible server. It represents one server out of the declared node set; total free slots are conserved across the full toy.
- The GPipe toy colors the existing server's GPU ranks with forward, backward or idle states from the same schedule used by the sizing reader. Larger jobs can span servers.
- Jobs smaller than eight GPUs leave the unused reference server slots idle.
- Speculative-token tint weights encode prefix-survival probabilities plus the guaranteed correction/bonus token, rather than a fabricated sampled output.
- CosyVoice's selected token hop and its three-token lookahead stay distinct. Wave and image-latent glyphs illustrate representations rather than real synthesized output.
- Colocated inference shows local state and token flows. Full-prompt inter-pool transfer appears only when disaggregation is explicitly selected. Client streams remain a different flow.
- Publication markers change independently from rollout sample counts. Their visible size is bounded; exact logical byte budgets are printed rather than inferred from screen dimensions.

The experiment's **scope is printed below its metrics**. Fleet MW, model-group KV, logical publication bytes and whole-job MTBF retain their original meanings when inspecting a smaller hardware level. Shapes, line speed, colors and reference layout do not claim measured GPU performance.

## Sharing and continuity

Existing `example=`, `lifecycle=` and `issue=` links still open their research and controls, now on the appropriate physical level. `level=fleet|pod|server|gpu` makes the viewpoint explicit; the previous internal `rack` value is also accepted. Shared links retain the project prefix, workspace, selected story, inputs and level, with playback stopped on reload. Incompatible story-family parameters are cleared.

Changing stories or levels does not replace the canvas or reset the base request timeline. Camera orientation survives same-level story changes. The reference timeline freezes while a story is active, so its generic request animation cannot contradict the selected training/media/workload explanation. Context playback has its own teaching clock. World labels remain pickable hardware labels; the connected label opens its story reader.

Without WebGL, the same four-level hardware topology and story controls remain available. There are no separate case-study fallback boards. Reduced motion disables automatic playback while retaining selection, experiments and sources. The phone UI keeps the scale rail and camera outside the reading surface; compact landscape layouts reduce chrome to retain access.

## Implementation and verification

- `src/learning/infrastructure/context.ts` owns scale/operation mappings, level perspectives, semantic hardware roles and derived visual budgets. Original research catalogs and pure performance models remain the sources of truth.
- `Connections.tsx` supplies the per-level mixed catalog, viewpoint reader, scoped metrics and connected walkthrough controls.
- `src/scene/context.ts` owns a single reusable instanced annotation layer, anchored using the reference hardware coordinates. Reconfiguration disposes replaced line buffers; final disposal deduplicates shared geometry/materials and releases signal shaders.
- `InfrastructureEngine` keeps its existing architecture groups visible, restores their material colors, projects hardware/context labels and renders the annotation layer. The standalone `ExampleWorld` renderer has been removed.
- A paused, settled story skips redundant WebGL draws. Camera interaction, resizing, experiment changes and playback redraw immediately; the reference animation retains its normal rendering loop.
- `LearningFusion` coordinates selection and scale changes. Context navigation bypasses the reference timeline's seek action, preserving its clock and workload controls.

Unit checks cover all four levels for every model/recipe and all forty issue perspectives, compatible URL migration, original numerical budgets, conditional state transfer, actual annotation matrices/colors/counts, exact expert/token counts, the shared pipeline schedule and resource disposal. Browser checks cover mixed discovery, persistent hardware/canvas identity, all models and lifecycle phases across levels, input/tab continuity, experiments and counterexamples, evidence readers, sharing, native step travel, keyboard/cinema, mobile bounds, reduced motion and physical-topology fallback. Existing game and reference-explorer regressions remain in the suite.
