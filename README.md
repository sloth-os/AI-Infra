# Strata — Fleet Command

A playable 3D strategy game about AI serving, with a source-backed learning explorer that reaches from an API request to a 100,000-GPU reference fleet.

## Play Fleet Command

The home page opens **Lifecycle Command**: a 3D campaign across **Fleet → Pod → Server → GPU** for **pre-training, post-training and inference**. Twelve performance contracts require actual completed work after a qualifying intervention. Tune data packing, checkpoint durability, state sharding, collectives, worker roles, objective validation, batching, routing and K/V residency. The live pipeline and animation share simulation progress. Each phase retains its run; earned contract medals stay in this browser. [docs/LIFECYCLE-GAME.md](docs/LIFECYCLE-GAME.md) explains the rules, equations and declared timing assumptions.

The **Serving district** back control opens the original isometric construction game, also available at `?campaign=serving`. Build prefill and decode engines on a floating 16-sector district, reserve KV memory, expand the shared fabric, and keep requests within their deadlines. Completed requests earn construction credits; missed deadlines damage service integrity. Upgrades, continuous batching, tenant-scoped prefix reuse, power limits, traffic bursts, and a repairable outage change the outcome.

Six missions introduce the complete request path, batching, memory pressure, network contention, prefix locality, and a combined operational challenge. **Open horizon** is an endless sandbox. Any mission can be played immediately. Stars and personal bests stay in browser-local storage; a live run survives switching to Learning mode but is reset by reloading.

The default **Fusion** interface puts construction and inspection in the world. Click an empty hex to choose a module, or arm a build tool in the floating command dock. Select a built engine to upgrade, recycle, repair, or focus the camera. **Ride alongside request** clears the inspection surface and follows the actual payload; **Trace live request** brings its data back into view. Controls remain stable while a tether follows the moving object.

Switch between **Flow**, **Memory**, and **Fabric** to see live capacity rings and numerical annotations around the hardware. The camera rail provides overview, top-down, orbit, zoom, label visibility, and cinema mode. The **Tactical** toggle restores the original panels without resetting the service. The command dock also provides research, a keyboard-accessible sector grid, and service telemetry. [docs/FUSION.md](docs/FUSION.md) explains the spatial interaction design and data mappings.

Drag to orbit; scroll or pinch to zoom. Keys **1–4** choose a module, **Space** pauses, **Q/E** rotates, **R** returns to overview, **U** upgrades the selection, **B** activates its available capacity reserve, **H** hides or restores the HUD, **L** toggles labels, and **F** rides with a live request. **Esc** dismisses spatial controls or a build tool before opening mission control. Building and research work while paused. Spatial inspection leaves the shift running; the pause control or full request-details dialog stops it. A 2D tactical board keeps the game playable without WebGL.

The request lens and moving payload labels show actual game requests: tenant, input length, retained KV size, current phase, emitted tokens, and deadline. Network transfer progress and memory admission respond to the player's infrastructure. The physics, clock, economy, and compute rates are balanced for a game; they are not benchmarks. [docs/GAME.md](docs/GAME.md) documents the rules and simplifications.

**Learning mode** uses **3D UI Fusion** around one persistent **Fleet → Pod → Server → GPU** world. Explore, Request journey, Trade-off lab and Field guide retain their shared hardware and workload. **Connections** at a selected level or component brings together hot issues, lifecycle work and real models. Their explanations and animations attach to the existing hardware; they have no separate header tabs or replacement 3D worlds. [docs/CONNECTED-INFRASTRUCTURE.md](docs/CONNECTED-INFRASTRUCTURE.md) documents the integrated experience and visual semantics.

**Real models** connects **Kimi K3**, **Qwen-Image-2.1**, **MiniMax H3**, **MiniMax Music 3.0**, **nvidia/personaplex-7b-v1** and **CosyVoice 2** to those four levels. Follow a model's native operations through the same fleet, worker fabric, server and chip. Model-specific data transformations, serving recipes, payload budgets and primary sources remain available in its reader. [docs/REAL-MODELS.md](docs/REAL-MODELS.md) records the research and deployment boundaries.

**AI lifecycle** connects **pre-training, post-training and inference** to physical placement, network communication, HBM and compute. SFT/DPO/GRPO, DP/TP/PP, ZeRO state, microbatch schedules, rollout/reward/publication and conditional inference KV transfer keep their declared calculations and source notes. [docs/LIFECYCLE.md](docs/LIFECYCLE.md) records the formulas and assumptions.

**Hot issues** provides a researched **top-ten editorial watchlist**, reviewed November 5, 2026, supported by 18 dated primary-source records. Explore power/cooling, KV/HBM, P/D networks, MoE routing, reasoning latency, precision, online RL, placement, recovery and tenant isolation from all four hardware perspectives. Interventions update the same calculated budgets and attached annotations. [docs/HOT-ISSUES.md](docs/HOT-ISSUES.md) records the evidence and quantitative counterexamples.

Direct links use `?view=explore`, `journey`, `lab` or `guide`. Add `level=fleet|pod|server|gpu` and `example=kimi-k3`, `lifecycle=pretrain` or `issue=kv-memory` to open a connected story. Existing case-study links remain compatible; shared URLs retain their inputs and physical level. **1–4** chooses scale, arrows choose a connected step, **Space** controls playback, and **F** focuses the hardware. World/Details and cinema keep the same scene. The classic reading layout remains available through the header's layout toggle. [docs/LEARNING-FUSION.md](docs/LEARNING-FUSION.md) covers the original explorer and readers.

**Flow effects and operator gameplay** add soft data wakes, event rings, KV transfer-progress ribbons and output streams tied to actual generated tokens. Use the sparkle menu for Calm, Balanced or Cinematic effects across both modes. Game operations add FIFO/deadline/shortest-prompt scheduling, optional memory backfill, a resource-constrained capacity reserve, service contracts and sandbox stress drills. In the learning lab, **Learn by solving** offers four live infrastructure missions with budget checks, hints, stars and local XP. [docs/EXPERIENCE.md](docs/EXPERIENCE.md) records the mechanics, visual semantics and verification.

## Run locally

Requires Node.js 22.12+ and npm; Node.js 24 LTS is recommended. No GPU, API key, backend, or external service is required.

```sh
npm ci
npm run dev
```

The development server binds to all interfaces on port 5173. For production:

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static host. Fonts and all application assets are bundled locally; the running application does not call external APIs. External links in the field guide open original research and documentation.

## Publish to GitHub Pages

[Deploy GitHub Pages](.github/workflows/pages.yml) runs on pushes to `main` and can also be started manually from the repository's Actions tab. It installs the locked dependencies with Node.js 24, checks formatting, runs the algorithm/model tests, builds with Vite and the Pages base path, and publishes `dist/` using GitHub's official Pages actions. Browser tests remain available locally with `npm run test:e2e`.

In repository **Settings → Pages → Build and deployment**, select **GitHub Actions** as the source. The workflow uses the repository's built-in `GITHUB_TOKEN`; no deployment secret is needed. Deployments run in the `github-pages` environment with only the permissions needed to publish the site.

The project site is expected at <https://sloth-os.github.io/AI-Infra/>. The base path is discovered by `actions/configure-pages`, so the build also supports a custom Pages domain. To check a project-path build locally:

```sh
npm run build -- --base /AI-Infra/
npm run preview -- --base /AI-Infra/
```

Open the preview at its `/AI-Infra/` path. Application assets, fonts, favicon, home link, and shared scenario URLs retain that prefix.

## Explore

- **Infrastructure explorer:** orbit, zoom, and inspect a persistent Three.js world at fleet, pod, eight-GPU server, and chip scale. Animated parcels, directional links, contribution tiles, memory pages, and projected data labels explain what moves and why. The blocks are conceptual aggregations, not literal physical inventory.
- **Four 3D animation lenses:** follow a request through seven chapters; allocate, fill, transfer, append, and release KV state; step through fourteen synchronized ring exchanges with actual partial sums; or follow eight transformer operations from embeddings through Q/K/V, causal attention, MLP, logits, and the next token.
- **Motion controls:** scrub the 48-second teaching timeline, select a chapter, change playback speed, fly between scales automatically, choose a camera preset, orbit, explode hardware layers, inspect a moving payload, or overlay an illustrative load heatmap. Prompt length, fabric bandwidth, and traffic-burst controls update the scene and the trade-off lab together.
- **Collective playground:** select the Collectives lens and open the synchronized ring playground. Its fourteen exchanges, chunk values, contribution counts, and GPU annotations read the same animation state. The classic layout retains its independent scratchpad.
- **Follow a request:** an editable prompt and optional retrieval drive a seven-stage educational walkthrough: ingress, retrieval, tokenization/routing, prefill, KV handoff, decoding, and streaming. Inspect each representation, bottleneck, and response. This does not execute an LLM or send the prompt anywhere.
- **Trade-off lab:** change GPU count, request rate, prompt/output length, active batch size, prefix reuse, network speed, and phase allocation. Compare static batching, continuous batching, and disaggregated prefill/decode. The selected strategy drives the 3D load overlay. Share parameterized Fusion scenario URLs or open the complete performance workbench.
- **Field guide:** search problems, solutions, glossary entries, and six primary sources in a floating library. Locate concepts in the world, or open the complete guide for parallelism, three traffic domains, training versus inference, and layer-specific trade-offs.

The UI distinguishes reference hardware specifications, conceptual animations, and modeled performance. **The estimates are not benchmarks and should not be used for capacity planning.** The model and its limitations are documented in [docs/MODEL.md](docs/MODEL.md); research notes are in [docs/RESEARCH.md](docs/RESEARCH.md).

The animation runs in **teaching time**, not real inference time. Tensor dimensions and KV sizes are calculated from the declared model; transfer times use the lab's bandwidth assumption. Parcel motion, hardware layout, page tiles, candidate logits, and load colors are illustrative. See [docs/MOTION.md](docs/MOTION.md) for the relationship between the visual state and its underlying model.

## Validate

```sh
npm run build       # strict TypeScript + production bundle
npm test            # game rules, all mission strategies, math and algorithms
npm run test:e2e    # real browser tests including software WebGL and mobile
```

Browser tests use `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to another Chromium executable as needed. They launch Vite automatically. Software rendering is enabled for GPU-less environments. No browser download is required when system Chromium is installed.

## Implementation

React + TypeScript + Vite, Three.js with OrbitControls, Lucide icons, and locally bundled DM Sans/Manrope fonts. The game uses a deterministic, immutable simulation independent of the renderer, with seeded arrivals and bounded integration steps. Architecture and data parcels use instanced geometry; trails use shared buffers. The renderer and prepared scene layers persist across scale changes. Camera flights and layer transitions interpolate smoothly; off-screen scenes stop rendering, and unmounting disposes GPU resources. Reduced-motion preferences stop ambient animation and make view changes immediate. Essential gameplay motion follows the simulation and can be paused. Every hardware component also has a conventional labeled button.

Use the existing checkout for future cloud tasks; each cloud task already has an isolated environment and does not need a new Git worktree. Start the development server with `npm run dev`; no environment publication or configuration-draft changes are performed by the application.
