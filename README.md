# Strata — Inside AI infrastructure

An interactive, source-backed 3D website for understanding how AI serving works, from an API request to a 100,000-GPU reference fleet.

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
- **Collective playground:** select the Collectives traffic view to step through an executable eight-rank ring all-reduce. Inspect each rank’s actual partial sums through reduce-scatter and all-gather; all ranks finish with the same vector.
- **Follow a request:** an editable prompt and optional retrieval drive a seven-stage educational walkthrough: ingress, retrieval, tokenization/routing, prefill, KV handoff, decoding, and streaming. Inspect each representation, bottleneck, and response. This does not execute an LLM or send the prompt anywhere.
- **Trade-off lab:** change GPU count, request rate, prompt/output length, active batch size, prefix reuse, network speed, and phase allocation. Compare static batching, continuous batching, and disaggregated prefill/decode. Share parameterized scenario URLs.
- **Field guide:** layer-specific problems and trade-offs, a parallelism comparison, three traffic domains, training versus inference, a searchable glossary, and six primary sources.

The UI distinguishes reference hardware specifications, conceptual animations, and modeled performance. **The estimates are not benchmarks and should not be used for capacity planning.** The model and its limitations are documented in [docs/MODEL.md](docs/MODEL.md); research notes are in [docs/RESEARCH.md](docs/RESEARCH.md).

The animation runs in **teaching time**, not real inference time. Tensor dimensions and KV sizes are calculated from the declared model; transfer times use the lab's bandwidth assumption. Parcel motion, hardware layout, page tiles, candidate logits, and load colors are illustrative. See [docs/MOTION.md](docs/MOTION.md) for the relationship between the visual state and its underlying model.

## Validate

```sh
npm run build       # strict TypeScript + production bundle
npm test            # dimensional math, capacity, saturation, and memory tests
npm run test:e2e    # real browser tests including software WebGL and mobile
```

Browser tests use `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to another Chromium executable as needed. They launch Vite automatically. Software rendering is enabled for GPU-less environments. No browser download is required when system Chromium is installed.

## Implementation

React + TypeScript + Vite, Three.js with OrbitControls, Lucide icons, and locally bundled DM Sans/Manrope fonts. Architecture and data parcels use instanced geometry; trails use shared buffers. The renderer and prepared scene layers persist across scale changes. Camera flights and layer transitions interpolate smoothly; off-screen scenes stop rendering, and unmounting disposes GPU resources. Reduced-motion preferences stop autonomous motion and make view changes immediate while retaining timeline scrubbing. If WebGL is unavailable, the timeline and a selectable 2D topology keep the explanations accessible. Every hardware component also has a conventional labeled button.

Use the existing checkout for future cloud tasks; each cloud task already has an isolated environment and does not need a new Git worktree. Start the development server with `npm run dev`; no environment publication or configuration-draft changes are performed by the application.
