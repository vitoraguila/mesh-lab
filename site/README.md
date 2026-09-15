# Mesh Lab site

A single scrollable page that teaches how the microservice architecture in this
repository works: containers, images, pods, nodes, namespaces, Helm, Istio and
Envoy, ending with the commands that bring the whole thing up locally.

The public page is a free, open learning case study. It does not require an
account, collect a lead, or ask the visitor to exchange anything for access.

Everything it claims is taken from the real project. The YAML excerpts, the
authorization verdicts in the request console, and the commands in the install
steps all match what `apps/` and `deploy/` actually contain.

## Stack

React 19, TypeScript, Vite 7 and Tailwind v4. Motion drives the scroll reveals
and the request animation, GSAP ScrollTrigger drives the desktop layers
walkthrough, Phosphor supplies the icons, and the technology logos come from the
Simple Icons CDN. The output is a static bundle, which is all GitHub Pages
serves.

## Local development

```sh
git clone https://github.com/vitoraguila/mesh-lab.git
cd mesh-lab
npm ci --prefix site
npm run dev --prefix site          # http://localhost:5173
npm run build --prefix site        # static bundle in site/dist
npm run preview --prefix site      # serve that bundle
npm run typecheck --prefix site
```

This runs the public guide without Kubernetes. To run the actual cluster and
studio, follow the [installation guide](https://vitoraguila.github.io/mesh-lab/#install)
or the root [README](../README.md).

## Publishing to GitHub Pages

`.github/workflows/deploy-site.yml` builds `site/` and publishes `site/dist` on
every push to `main` that touches this folder. It needs Pages switched to the
Actions source once, in the repository:

**Settings → Pages → Build and deployment → Source: GitHub Actions**

The page is served at https://vitoraguila.github.io/mesh-lab/ and its source is
https://github.com/vitoraguila/mesh-lab. Vite is
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
    Nav.tsx                   floating bar and live section anchor
    SectionsMenu.tsx          native modal chapter index with focus containment
    Hero.tsx / HeroTopology   animated headline, packet diagram, three flow links
    LearningBridge.tsx          reading transition into the request experiment
    StackWall.tsx             technology marquee
    ArchitectureSection.tsx   every workload on one map, with its three flows
    LayersSection.tsx         pinned: machine, Docker, node, namespace, pod, containers
    ImagesSection.tsx         click-through build steps, arrow-key tabs, next/previous controls
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
    ui/                       SectionTitle, Reveal, Terminal, Code, Disclosure, Modal, TechIcon
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

Cobalt controls sit on lilac, lime, peach, mint, and sky chapter backgrounds,
with darker counterparts in dark mode. This deliberately colorful direction
uses LaunchDarkly as a visual reference: bold color blocks, asymmetric corners,
offset surfaces, and geometric accents. Technology marks keep their own colours. `ok` and `deny` are data encoding inside diagrams,
never brand colour. Light is the default theme. Space Grotesk sets the headings,
Geist sets the body, and Geist Mono sets code; all three fonts are self-hosted.
Radii: content surfaces 16px, chips 8px, interactive elements pill; chapter
edges and the hero stage use larger asymmetric corners. Decorative shapes are
non-interactive, hidden from assistive technology, and separate from diagram data.
The hero shape entrance and offset-panel hover respect reduced motion.

Headings reveal words in reading order. A scroll-linked reading pause connects
the configuration chapters to the request console. The hero links directly to
requests, events, and metrics; all original section anchors remain stable.
Diagrams and the request console are illustrated models of project behavior,
not live cluster observations. The studio captures are real screenshots.

Motion respects `prefers-reduced-motion`. The layers sequence pins only
on desktop with no reduced-motion preference, responding to preference and
viewport changes. The image walkthrough never pins: all five steps are explicit
tabs with arrow-key, Home/End, and next/previous navigation. Each selection
animates the artifact and explanation without taking over page scrolling. Layers also have explicit buttons, so every explanation is
available without scrolling through a pinned sequence. Reveals use Motion and
pinning uses GSAP matchMedia/ScrollTrigger, with cleanup on unmount.

Primary actions use lime, dark outlines, and offset press feedback. Secondary
buttons are outlined; selected learning controls use a solid contrasting fill.
The Sections index uses a native dialog for focus containment, Escape dismissal,
and return of focus to its opener. Its chapter links keep the existing anchors.
