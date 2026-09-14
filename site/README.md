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
  hooks/useTheme.ts           dark by default, light is a real mode
  lib/motion.ts               one easing curve and the shared variants
  components/
    Nav.tsx                   fixed bar, theme toggle
    Hero.tsx                  headline plus the live topology
    HeroTopology.tsx          the looping packet diagram
    StackWall.tsx             technology marquee
    LayersSection.tsx         pinned: machine, Docker, node, namespace, pod, containers
    ImagesSection.tsx         pinned horizontal pan: source to running container
    ObjectsSection.tsx        the six Kubernetes objects this study needs
    MeshSection.tsx           sidecar injection toggle, four Istio resources
    JourneySection.tsx        interactive request console
    ObservabilitySection.tsx  metrics are pulled, events are pushed
    InstallSection.tsx        the seven install steps
    CommandsSection.tsx       grouped command reference
    Footer.tsx                primary sources
    ui/                       Reveal, Terminal
```

## Conventions

One accent colour, signal orange, across both themes. `ok` and `deny` are data
encoding inside diagrams only, never brand colour. Radii: surfaces 16px, chips
8px, interactive elements pill. Every animation above a hover state is wrapped
in `prefers-reduced-motion`, and the two pinned sequences fall back to ordinary
scrolling. No scroll listeners: reveals use IntersectionObserver through Motion,
and the pinned work goes through ScrollTrigger.
