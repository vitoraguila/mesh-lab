import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Reveal } from './ui/Reveal'
import { TechGlyph, TechIcon } from './ui/TechIcon'
import { NamespaceSplit, PodLocalhost, ReplicaLoop, ServiceResolve } from './ui/MiniDiagrams'
import { Hi } from '../lib/terms'
import { EASE } from '../lib/motion'
import type { TechKey } from '../lib/techIcons'

type Key = 'deployment' | 'pod' | 'service' | 'config' | 'namespace' | 'helm'

type Obj = {
  key: Key
  name: string
  kind: string
  mark: TechKey
  line: string
  nodes: string[]
  edges: string[]
}

const OBJECTS: Obj[] = [
  {
    key: 'deployment',
    name: 'Deployment',
    kind: 'apps/v1',
    mark: 'kubernetes',
    line: 'You declare how many should exist. A controller creates a ReplicaSet, and that keeps reality matching the number.',
    nodes: ['deployment', 'replicaset'],
    edges: ['dep-rs'],
  },
  {
    key: 'pod',
    name: 'Pod',
    kind: 'v1',
    mark: 'kubernetes',
    line: 'Not a container. A group of containers sharing one IP and one network namespace, with a name not worth remembering.',
    nodes: ['podA', 'podB'],
    edges: ['rs-a', 'rs-b'],
  },
  {
    key: 'service',
    name: 'Service',
    kind: 'v1',
    mark: 'kubernetes',
    line: 'A stable name in front of addresses that keep changing. It resolves to whichever pods are ready right now.',
    nodes: ['service', 'podA', 'podB'],
    edges: ['svc-a', 'svc-b'],
  },
  {
    key: 'config',
    name: 'ConfigMap and Secret',
    kind: 'v1',
    mark: 'kubernetes',
    line: 'Where the environment difference lives. Both are hashed into a pod annotation, so editing one rolls exactly that Deployment.',
    nodes: ['configmap', 'secret', 'deployment'],
    edges: ['cm-dep', 'sec-dep'],
  },
  {
    key: 'namespace',
    name: 'Namespace',
    kind: 'v1',
    mark: 'kubernetes',
    line: 'One cluster, two environments. Same node, separate names, separate credentials, and a policy that refuses the other side.',
    nodes: ['frame'],
    edges: [],
  },
  {
    key: 'helm',
    name: 'Helm chart',
    kind: 'helm.sh/v3',
    mark: 'helm',
    line: 'Templates plus values plus a release name. One release per namespace renders every object in this picture.',
    nodes: ['helm'],
    edges: ['helm-ns'],
  },
]

type Node = { id: string; x: number; y: number; w: number; h: number; t: string; s: string }

const NODES: Node[] = [
  { id: 'deployment', x: 48, y: 84, w: 210, h: 68, t: 'Deployment', s: 'replicas: 2' },
  { id: 'replicaset', x: 48, y: 190, w: 210, h: 68, t: 'ReplicaSet', s: 'catalog-7d9f4b8c6d' },
  { id: 'podA', x: 48, y: 300, w: 210, h: 76, t: 'Pod', s: 'xk2p9 · 2/2' },
  { id: 'podB', x: 48, y: 404, w: 210, h: 76, t: 'Pod', s: 'b7t4m · 2/2' },
  { id: 'configmap', x: 330, y: 84, w: 200, h: 64, t: 'ConfigMap', s: 'catalog-config' },
  { id: 'secret', x: 330, y: 172, w: 200, h: 64, t: 'Secret', s: 'catalog-env' },
  { id: 'service', x: 330, y: 348, w: 200, h: 84, t: 'Service', s: 'catalog.stg.svc' },
]

const EDGES: { id: string; d: string; label?: string; lx?: number; ly?: number }[] = [
  { id: 'dep-rs', d: 'M153 152 L153 190', label: 'creates', lx: 162, ly: 175 },
  { id: 'rs-a', d: 'M153 258 L153 300', label: 'schedules', lx: 162, ly: 283 },
  { id: 'rs-b', d: 'M48 224 L30 224 L30 442 L48 442' },
  { id: 'cm-dep', d: 'M330 116 L294 116 L294 104 L258 104' },
  { id: 'sec-dep', d: 'M330 204 L294 204 L294 132 L258 132', label: 'injected at pod creation', lx: 340, ly: 262 },
  { id: 'svc-a', d: 'M330 372 L292 372 L292 338 L258 338' },
  { id: 'svc-b', d: 'M330 408 L292 408 L292 442 L258 442', label: 'whichever are ready', lx: 340, ly: 462 },
  { id: 'helm-ns', d: 'M840 282 L812 282', label: 'renders all of it', lx: 812, ly: 262 },
]

function ChartTree() {
  return (
    <div className="mt-6 rounded-xl border border-line tinted-soft p-4">
      <pre className="font-mono text-[11.5px] leading-[1.9] text-ink">
        <code>{`apps/catalog/deploy/helm/
  Chart.yaml
  values.yaml
  templates/
    deployment.yaml
    service.yaml`}</code>
      </pre>
      <p className="mt-3 font-mono text-[10.5px] text-faint">one release: study, in namespace stg</p>
    </div>
  )
}

export function ObjectsSection() {
  const [key, setKey] = useState<Key>('deployment')
  const reduce = useReducedMotion()
  const active = OBJECTS.find((o) => o.key === key)!
  const lit = (id: string) => active.nodes.includes(id)
  const litEdge = (id: string) => active.edges.includes(id)

  return (
    <section id="objects"
      style={{ ["--tint" as string]: "#65a30d" }} className="tinted-soft border-b border-line py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <div className="mb-5 flex items-center gap-4">
            <TechIcon tech="kubernetes" size={36} />
            <TechIcon tech="helm" size={36} />
          </div>
          <h2 className="max-w-[22ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Six objects, and how they hold each other up
          </h2>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Kubernetes has hundreds of resource kinds. Running this whole study needs six. Pick one to see where it sits.'}
            </Hi>
          </p>
        </Reveal>

        <Reveal delay={0.06} className="mt-9 flex flex-wrap gap-2">
          {OBJECTS.map((o) => {
            const on = o.key === key
            return (
              <button
                key={o.key}
                type="button"
                aria-pressed={on}
                onMouseEnter={() => setKey(o.key)}
                onFocus={() => setKey(o.key)}
                onClick={() => setKey(o.key)}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13.5px] transition-colors duration-200 ${
                  on
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <TechIcon tech={o.mark} size={17} label={false} />
                {o.name}
              </button>
            )
          })}
        </Reveal>

        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.35fr_1fr] lg:gap-6">
          <Reveal delay={0.08} className="min-w-0 overflow-hidden rounded-2xl border border-line bg-sunken">
            <div className="relative">
              <div className="bg-blueprint-fine overflow-x-auto p-4 md:p-6">
                <svg
                  viewBox="0 0 1060 540"
                  className="h-auto w-full min-w-[720px]"
                  role="img"
                  aria-label={`Relationship map of the six objects, currently highlighting ${active.name}. A Helm chart renders everything inside the stg namespace: a Deployment creates a ReplicaSet, which schedules pods, a Service resolves to those pods, and a ConfigMap and Secret are injected at pod creation.`}
                >
                  {/* namespace */}
                  <rect
                    x="16"
                    y="44"
                    width="780"
                    height="476"
                    rx="16"
                    fill={lit('frame') ? 'var(--accent-wash)' : 'none'}
                    stroke={lit('frame') ? 'var(--accent)' : 'var(--line-strong)'}
                    strokeWidth={lit('frame') ? 1.6 : 1}
                    strokeDasharray="8 6"
                    style={{ transition: 'all 400ms' }}
                  />
                  <text
                    x="34"
                    y="70"
                    className="font-mono"
                    fontSize="12"
                    fill={lit('frame') ? 'var(--accent)' : 'var(--faint)'}
                    style={{ transition: 'fill 400ms' }}
                  >
                    namespace / stg
                  </text>

                  {EDGES.map((e) => {
                    const on = litEdge(e.id)
                    return (
                      <g key={e.id} style={{ opacity: on ? 1 : 0.3, transition: 'opacity 400ms' }}>
                        <path
                          d={e.d}
                          fill="none"
                          stroke={on ? 'var(--accent)' : 'var(--line-strong)'}
                          strokeWidth={on ? 1.6 : 1.1}
                        />
                        {e.label && on && (
                          <text x={e.lx} y={e.ly} className="font-mono" fontSize="10.5" fill="var(--accent)">
                            {e.label}
                          </text>
                        )}
                      </g>
                    )
                  })}

                  {NODES.map((n) => {
                    const on = lit(n.id)
                    return (
                      <g key={n.id} style={{ opacity: on ? 1 : 0.4, transition: 'opacity 400ms' }}>
                        <rect
                          x={n.x}
                          y={n.y}
                          width={n.w}
                          height={n.h}
                          rx="11"
                          fill={on ? 'var(--accent-wash)' : 'var(--raised)'}
                          stroke={on ? 'var(--accent)' : 'var(--line-strong)'}
                          strokeWidth={on ? 1.6 : 1}
                          strokeDasharray={n.id.startsWith('pod') ? '7 5' : undefined}
                          style={{ transition: 'all 400ms' }}
                        />
                        <TechGlyph tech="kubernetes" x={n.x + 14} y={n.y + 14} size={17} />
                        <text x={n.x + 40} y={n.y + 28} className="font-mono" fontSize="12.5" fill="var(--ink)">
                          {n.t}
                        </text>
                        <text x={n.x + 14} y={n.y + n.h - 14} className="font-mono" fontSize="10" fill="var(--faint)">
                          {n.s}
                        </text>
                      </g>
                    )
                  })}

                  {/* the chart sits outside the cluster entirely */}
                  <g style={{ opacity: lit('helm') ? 1 : 0.4, transition: 'opacity 400ms' }}>
                    <rect
                      x="840"
                      y="242"
                      width="200"
                      height="80"
                      rx="11"
                      fill={lit('helm') ? 'var(--accent-wash)' : 'var(--raised)'}
                      stroke={lit('helm') ? 'var(--accent)' : 'var(--line-strong)'}
                      strokeWidth={lit('helm') ? 1.6 : 1}
                      style={{ transition: 'all 400ms' }}
                    />
                    <TechGlyph tech="helm" x={854} y={256} size={18} />
                    <text x="880" y="271" className="font-mono" fontSize="12.5" fill="var(--ink)">
                      Helm chart
                    </text>
                    <text x="854" y="306" className="font-mono" fontSize="10" fill="var(--faint)">
                      on your machine
                    </text>
                  </g>
                </svg>
              </div>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-14 lg:hidden"
                style={{ background: 'linear-gradient(to left, var(--sunken), transparent)' }}
              />
            </div>
          </Reveal>

          <Reveal delay={0.12} className="min-w-0 rounded-2xl border border-line bg-raised p-6 lg:p-7">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.key}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <TechIcon tech={active.mark} size={24} />
                    <h3 className="text-[19px] font-medium tracking-[-0.015em] text-ink">{active.name}</h3>
                  </div>
                  <code className="font-mono text-[10.5px] text-faint">{active.kind}</code>
                </div>
                <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-muted">
                  <Hi>{active.line}</Hi>
                </p>

                {active.key === 'deployment' && <ReplicaLoop />}
                {active.key === 'pod' && <PodLocalhost />}
                {active.key === 'service' && <ServiceResolve />}
                {active.key === 'namespace' && <NamespaceSplit />}
                {active.key === 'helm' && <ChartTree />}
                {active.key === 'config' && (
                  <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-sunken p-4">
                    <pre className="font-mono text-[11.5px] leading-[1.8] text-ink">
                      <code>{`annotations:
  checksum/config: a3f9c1e7...

envFrom:
  - configMapRef:
      name: catalog-config`}</code>
                    </pre>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
