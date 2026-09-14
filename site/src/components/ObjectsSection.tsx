import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Reveal } from './ui/Reveal'
import { PodLocalhost, ServiceResolve } from './ui/MiniDiagrams'
import { Hi } from '../lib/terms'
import { TechIcon } from './ui/TechIcon'
import type { TechKey } from '../lib/techIcons'
import { EASE } from '../lib/motion'

/** Reconciliation, drawn: a pod dies, the ReplicaSet makes another one. */
function ReplicaLoop() {
  const reduce = useReducedMotion()
  const [pods, setPods] = useState(['xk2p9', 'b7t4m'])
  const [gen, setGen] = useState(0)

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setGen((g) => g + 1)
      setPods(([, keep]) => [keep, Math.random().toString(36).slice(2, 7)])
    }, 3400)
    return () => window.clearInterval(id)
  }, [reduce])

  return (
    <div className="mt-6 rounded-xl border border-line bg-sunken p-4">
      <div className="flex items-center justify-between gap-3">
        <code className="font-mono text-[11.5px] text-faint">spec.replicas: 2</code>
        <code className="font-mono text-[11.5px] text-ok">2/2 ready</code>
      </div>
      <div className="mt-3 flex gap-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {pods.map((p) => (
            <motion.div
              key={p}
              layout
              initial={reduce ? false : { opacity: 0, y: 12, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.9 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex-1 rounded-lg border border-line bg-raised px-3 py-2.5"
            >
              <div className="font-mono text-[11px] text-ink">catalog-{p}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: 'var(--ok)' }} />
                <span className="font-mono text-[10px] text-faint">Running 2/2</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <p className="mt-3 font-mono text-[10.5px] text-faint">
        {reduce ? 'pods are replaced, never repaired' : `rollout generation ${gen + 1}`}
      </p>
    </div>
  )
}

function NamespaceSplit() {
  return (
    <svg viewBox="0 0 340 116" className="mt-6 h-auto w-full" aria-hidden="true">
      {[
        { x: 2, label: 'stg', reps: '1 replica' },
        { x: 178, label: 'prd', reps: '2 replicas' },
      ].map((n) => (
        <g key={n.label}>
          <rect
            x={n.x}
            y="2"
            width="160"
            height="112"
            rx="10"
            fill="var(--sunken)"
            stroke="var(--line-strong)"
          />
          <text x={n.x + 14} y="24" className="font-mono" fontSize="11.5" fill="var(--accent)">
            {n.label}
          </text>
          <text x={n.x + 14} y="42" className="font-mono" fontSize="10" fill="var(--faint)">
            {n.reps}
          </text>
          {[0, 1, 2].map((i) => (
            <rect
              key={i}
              x={n.x + 14}
              y={56 + i * 18}
              width={132}
              height="12"
              rx="3"
              fill="var(--line-strong)"
              opacity={0.55}
            />
          ))}
        </g>
      ))}
      <path d="M170 14 L170 102" stroke="var(--deny)" strokeWidth="1.2" strokeDasharray="4 4" />
      <text x="170" y="112" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--deny)">
        no route across
      </text>
    </svg>
  )
}

type Card = { title: string; kind: string; mark: TechKey; body: string; span: string; extra?: 'replicas' | 'yaml' | 'ns' | 'svc' | 'pod' }

const CARDS: Card[] = [
  {
    title: 'Deployment',
    kind: 'apps/v1',
    mark: 'kubernetes',
    body: 'You never start a pod. You declare how many should exist, and a controller keeps reality matching that number. Kill one and another appears with a different name.',
    span: 'lg:col-span-8',
    extra: 'replicas',
  },
  {
    title: 'Pod',
    kind: 'v1',
    mark: 'kubernetes',
    body: 'Disposable by design. It has a generated name, a cluster-internal IP that changes on every rollout, and no identity worth remembering. Never address a pod directly.',
    span: 'lg:col-span-4',
    extra: 'pod',
  },
  {
    title: 'Service',
    kind: 'v1',
    mark: 'kubernetes',
    body: 'The stable name in front of those moving IPs. catalog.stg.svc.cluster.local resolves to whichever pods are ready right now, and keeps resolving while they are replaced.',
    span: 'lg:col-span-4',
    extra: 'svc',
  },
  {
    title: 'ConfigMap and Secret',
    kind: 'v1',
    mark: 'kubernetes',
    body: 'Where the environment difference lives. The chart hashes both into a pod annotation, so editing a value rolls exactly that one Deployment, with no image rebuild.',
    span: 'lg:col-span-8',
    extra: 'yaml',
  },
  {
    title: 'Namespace',
    kind: 'v1',
    mark: 'kubernetes',
    body: 'stg and prd are the same cluster with different names, different replica counts, different credentials, and an authorization policy that refuses the other side outright.',
    span: 'lg:col-span-6',
    extra: 'ns',
  },
  {
    title: 'Helm chart',
    kind: 'helm.sh/v3',
    mark: 'helm',
    body: 'Templates plus values plus a release name. One study release per namespace composes every application chart, and upgrading it rolls only the workloads whose pod template actually changed.',
    span: 'lg:col-span-6',
  },
]

export function ObjectsSection() {
  return (
    <section id="objects" className="border-b border-line bg-canvas py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <h2 className="max-w-[22ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Six objects carry almost everything
          </h2>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Kubernetes has hundreds of resource kinds. Running this whole case study needs six, and every one of them is a YAML file you can read.'}
            </Hi>
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
          {CARDS.map((c, i) => (
            <Reveal
              key={c.title}
              as="article"
              delay={(i % 2) * 0.08}
              className={`${c.span} flex min-w-0 flex-col rounded-2xl border border-line bg-raised p-6 lg:p-8`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <TechIcon tech={c.mark} size={28} />
                  <h3 className="text-[19px] font-medium tracking-[-0.015em] text-ink">{c.title}</h3>
                </div>
                <code className="font-mono text-[10.5px] text-faint">{c.kind}</code>
              </div>
              <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed text-muted">
                <Hi>{c.body}</Hi>
              </p>

              {c.extra === 'replicas' && <ReplicaLoop />}
              {c.extra === 'ns' && <NamespaceSplit />}
              {c.extra === 'svc' && <ServiceResolve />}
              {c.extra === 'pod' && <PodLocalhost />}
              {c.extra === 'yaml' && (
                <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-sunken p-4">
                  <pre className="font-mono text-[11.5px] leading-[1.8] text-ink">
                    <code>{`annotations:
  checksum/config: {{ include ... | sha256sum }}

envFrom:
  - configMapRef:
      name: catalog-config`}</code>
                  </pre>
                </div>
              )}
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
