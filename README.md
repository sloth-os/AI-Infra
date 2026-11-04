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

- **Infrastructure explorer:** orbit, zoom, and inspect a real Three.js scene at fleet, pod, eight-GPU server, and chip scale. Switch between request traffic, KV movement, and collective communication. The blocks are conceptual aggregations, not literal physical inventory.
- **Collective playground:** select the Collectives traffic view to step through an executable eight-rank ring all-reduce. Inspect each rank’s actual partial sums through reduce-scatter and all-gather; all ranks finish with the same vector.
- **Follow a request:** an editable prompt and optional retrieval drive a seven-stage educational walkthrough: ingress, retrieval, tokenization/routing, prefill, KV handoff, decoding, and streaming. Inspect each representation, bottleneck, and response. This does not execute an LLM or send the prompt anywhere.
- **Trade-off lab:** change GPU count, request rate, prompt/output length, active batch size, prefix reuse, network speed, and phase allocation. Compare static batching, continuous batching, and disaggregated prefill/decode. Share parameterized scenario URLs.
- **Field guide:** layer-specific problems and trade-offs, a parallelism comparison, three traffic domains, training versus inference, a searchable glossary, and six primary sources.

The UI distinguishes reference hardware specifications, conceptual animations, and modeled performance. **The estimates are not benchmarks and should not be used for capacity planning.** The model and its limitations are documented in [docs/MODEL.md](docs/MODEL.md); research notes are in [docs/RESEARCH.md](docs/RESEARCH.md).

## Validate

```sh
npm run build       # strict TypeScript + production bundle
npm test            # dimensional math, capacity, saturation, and memory tests
npm run test:e2e    # real browser tests including software WebGL and mobile
```

Browser tests use `/usr/bin/chromium` by default. Set `CHROMIUM_PATH` to another Chromium executable as needed. They launch Vite automatically. Software rendering is enabled for GPU-less environments. No browser download is required when system Chromium is installed.

## Implementation

React + TypeScript + Vite, Three.js with OrbitControls, Lucide icons, and locally bundled DM Sans/Manrope fonts. Architectural geometry is instanced by material, packet positions update in a single buffer, off-screen scenes stop rendering, and resources are disposed on layer changes. Reduced-motion preferences stop packet animation. If WebGL is unavailable, a selectable 2D topology keeps the explanations accessible. Every 3D component also has a conventional labeled button.

Use the existing checkout for future cloud tasks; each cloud task already has an isolated environment and does not need a new Git worktree. Start the development server with `npm run dev`; no environment publication or configuration-draft changes are performed by the application.
