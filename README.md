# Strata — Fleet Command

A playable 3D strategy game about AI serving, with a source-backed learning explorer that reaches from an API request to a 100,000-GPU reference fleet.

## Play Fleet Command

The home page is an isometric infrastructure game. Build prefill and decode engines on a floating 16-sector district, reserve KV memory, expand the shared fabric, and keep requests within their deadlines. Completed requests earn construction credits; missed deadlines damage service integrity. Upgrades, continuous batching, tenant-scoped prefix reuse, power limits, traffic bursts, and a repairable outage change the outcome.

Six missions introduce the complete request path, batching, memory pressure, network contention, prefix locality, and a combined operational challenge. **Open horizon** is an endless sandbox. Any mission can be played immediately. Stars and personal bests stay in browser-local storage; a live run survives switching to Learning mode but is reset by reloading.

The default **Fusion** interface puts construction and inspection in the world. Click an empty hex to choose a module, or arm a build tool in the floating command dock. Select a built engine to upgrade, recycle, repair, or focus the camera. **Ride alongside request** clears the inspection surface and follows the actual payload; **Trace live request** brings its data back into view. Controls remain stable while a tether follows the moving object.

Switch between **Flow**, **Memory**, and **Fabric** to see live capacity rings and numerical annotations around the hardware. The camera rail provides overview, top-down, orbit, zoom, label visibility, and cinema mode. The **Tactical** toggle restores the original panels without resetting the service. The command dock also provides research, a keyboard-accessible sector grid, and service telemetry. [docs/FUSION.md](docs/FUSION.md) explains the spatial interaction design and data mappings.

Drag to orbit; scroll or pinch to zoom. Keys **1–4** choose a module, **Space** pauses, **Q/E** rotates, **R** returns to overview, **U** upgrades the selection, **H** hides or restores the HUD, **L** toggles labels, and **F** rides with a live request. **Esc** dismisses spatial controls or a build tool before opening mission control. Building and research work while paused. Spatial inspection leaves the shift running; the pause control or full request-details dialog stops it. A 2D tactical board keeps the game playable without WebGL.

The request lens and moving payload labels show actual game requests: tenant, input length, retained KV size, current phase, emitted tokens, and deadline. Network transfer progress and memory admission respond to the player's infrastructure. The physics, clock, economy, and compute rates are balanced for a game; they are not benchmarks. [docs/GAME.md](docs/GAME.md) documents the rules and simplifications.

**Learning mode** also defaults to **3D UI Fusion**. Explore, Request journey, Trade-off lab, and Field guide share one continuous 3D world. Explanations attach to selected hardware, experiments change its displayed state, and glossary entries locate related infrastructure. Floating surfaces keep the world within reach; full readers retain every model assumption and research reference. [docs/LEARNING-FUSION.md](docs/LEARNING-FUSION.md) documents the experience.

Direct links use `?view=explore`, `?view=journey`, `?view=lab`, or `?view=guide`. The header's layout toggle opens the original reading layout; `?view=explore&learn=classic` links to it directly. Layout changes preserve the workload, selected strategy, and explorer's teaching clock. Existing parameterized lab links continue to work.

**Real models** adds six source-backed 3D field trips: **Kimi K3**, **Qwen-Image-2.1**, **MiniMax H3**, **MiniMax Music 3.0**, **nvidia/personaplex-7b-v1**, and **CosyVoice 2**. Follow their distinct data transformations, inspect placement and network traffic, compare serving trade-offs, read versioned startup examples, and change model-specific data budgets. Open `?view=guide&learn=fusion&examples=all`, or link to a model with `example=kimi-k3`, `qwen-image-21`, `minimax-h3`, `minimax-music-3`, `personaplex`, or `cosyvoice-2`. [docs/REAL-MODELS.md](docs/REAL-MODELS.md) records the research, source revisions, calculations, and deployment boundaries.

**AI lifecycle** adds three connected 3D workflows for **pre-training, post-training and inference**. Follow forward/backward passes, DP/TP/PP placement, ZeRO state sharding, checkpoints, SFT/DPO/GRPO, rollout/reward/weight-sync loops, request KV and 100,000-GPU replica grouping. Change sizing controls, inspect a microbatch schedule and loss/reward toys, compare network/performance trade-offs, and follow primary sources. Start at `?view=guide&learn=fusion&lifecycle=pretrain` (or `posttrain` / `inference`). [docs/LIFECYCLE.md](docs/LIFECYCLE.md) records sources, formulas, declared assumptions and visual mappings.

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
