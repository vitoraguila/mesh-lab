# Mesh Lab site

A single scrollable page that teaches how the microservice architecture in this
repository works: containers, images, pods, nodes, namespaces, Helm, Istio and
Envoy, ending with the commands that bring the whole thing up locally.

Everything it claims is taken from the real project. The YAML excerpts, the
authorization verdicts in the request console, and the commands in the install
steps all match what `apps/` and `deploy/` actually contain.

## Stack

React 19, TypeScript, Vite 7 and Tailwind v4. Motion drives the scroll reveals
and the request animation, GSAP ScrollTrigger drives the two pinned scroll
sequences, Phosphor supplies the icons, and the technology logos come from the
Simple Icons CDN. The output is a static bundle, which is all GitHub Pages
serves.

## Local development

```sh
npm ci
npm run dev          # http://localhost:5173
npm run build        # static bundle in site/dist
npm run preview      # serve that bundle
npm run typecheck
```

## Publishing to GitHub Pages

`.github/workflows/deploy-site.yml` builds `site/` and publishes `site/dist` on
every push to `main` that touches this folder. It needs Pages switched to the
Actions source once, in the repository:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

After that the page is served at `https://<owner>.github.io/<repo>/`. Vite is
configured with `base: './'`, so the same bundle works at a repository subpath,
at a custom domain, and from the local `dist` folder with no rebuild. `Actions →
Deploy site to GitHub Pages → Run workflow` publishes on demand.

## Structure

```text
src/
  App.tsx                     section composition, in reading order
  index.css                   design tokens, both themes, keyframes
  hooks/useTheme.ts           light by default, dark is remembered once chosen
  lib/
    motion.ts                 one easing curve and the shared variants
    sections.ts               the index, grouped by technology
    techIcons.ts              generated brand marks and hexes (Simple Icons)
    termInfo.ts               definitions and doc links behind every marked term
    terms.tsx                 the term matcher and its tooltip
    manifests.ts              the real files shown in the explorer
  components/
    Nav.tsx                   bar, live section anchor, the technology menu
    Hero.tsx / HeroTopology   headline plus the looping packet diagram
    StackWall.tsx             technology marquee
    ArchitectureSection.tsx   every workload on one map, with its three flows
    LayersSection.tsx         pinned: machine, Docker, node, namespace, pod, containers
    ImagesSection.tsx         pinned horizontal pan: source to running container
    ObjectsSection.tsx        the six Kubernetes objects, with live diagrams
    MeshSection.tsx           sidecar injection toggle, four Istio resources
    ManifestsSection.tsx      the file explorer, template against rendered
    HelmPrimer.tsx            what Helm is, and where it stops
    JourneySection.tsx        interactive request console
    BrokersSection.tsx        events, queues against logs, four brokers compared
    EventFlow.tsx             the running producer, exchange, queue, consumer model
    ObservabilitySection.tsx  the Prometheus scrape path and Grafana queries
    InstallSection.tsx        the install steps
    StudioPreview.tsx         real captures of the running studio
    CommandsSection.tsx       grouped command reference
    Footer.tsx                primary sources
    ui/                       Reveal, Terminal, Code, Disclosure, Modal, TechIcon
```

## Screenshots

`public/shots/` holds real captures of the running studio, not mockups. The
committed ones were taken at 1x and look soft on a retina display. To replace
them, bring the cluster up and run the capture script against the forward:

```sh
make port-forward ENV=stg                 # note the URL it prints
node site/scripts/capture.cjs http://127.0.0.1:3000

# optional, for the Grafana panel image the observability section looks for
make grafana ENV=stg                      # prints the generated login
GRAFANA_USER=... GRAFANA_PASSWORD=... \
  node site/scripts/capture.cjs http://127.0.0.1:3000 http://127.0.0.1:3200
```

It writes PNGs at 2x and prints the one-liner that converts them to the `.webp`
the page loads. The Grafana figure renders only when `shots/grafana.webp`
exists, so the section is complete either way.

## Conventions

One accent colour, signal orange, across both themes, with the technology brand
marks keeping their own colours. `ok` and `deny` are data encoding inside
diagrams only, never brand colour. Light is the default theme. Radii: surfaces 16px, chips
8px, interactive elements pill. Every animation above a hover state is wrapped
in `prefers-reduced-motion`, and the two pinned sequences fall back to ordinary
scrolling. No scroll listeners: reveals use IntersectionObserver through Motion,
and the pinned work goes through ScrollTrigger.
