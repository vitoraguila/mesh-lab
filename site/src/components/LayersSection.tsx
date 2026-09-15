import { SectionTitle } from './ui/SectionTitle'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TechGlyph } from './ui/TechIcon'
import { Hi } from '../lib/terms'
import type { TechKey } from '../lib/techIcons'

gsap.registerPlugin(ScrollTrigger)

type Step = {
  key: string
  chip: string
  title: string
  body: string
  command: string
  answer: string
}

const STEPS: Step[] = [
  {
    key: 'machine',
    chip: 'your machine',
    title: 'It all runs on one laptop',
    body: 'No cloud account and no remote cluster. Everything in this case study lives inside a single Minikube profile called mesh-study, on your own machine.',
    command: 'minikube -p mesh-study status',
    answer: 'one profile, one virtual machine, zero cloud bills',
  },
  {
    key: 'docker',
    chip: 'docker engine',
    title: 'Docker runs the machine, not the cluster',
    body: 'Minikube boots its node as a Docker container. Docker is the container runtime underneath. It knows nothing about pods, services or routing, and Kubernetes is the layer that does.',
    command: 'docker ps --filter name=mesh-study',
    answer: 'one container, and that container is the entire node',
  },
  {
    key: 'node',
    chip: 'node',
    title: 'A node is a machine that runs workloads',
    body: 'A real cluster spreads pods across many nodes. This one has exactly one, so every pod you deploy lands in the same place. The scheduler still does its job, it just has one option.',
    command: 'kubectl get nodes',
    answer: 'NAME: mesh-study   STATUS: Ready   ROLES: control-plane',
  },
  {
    key: 'namespace',
    chip: 'namespace: stg',
    title: 'Namespaces split one cluster into environments',
    body: 'stg and prd are two namespaces on that single node. Same hardware, separate names, separate configuration, separate credentials, separate authorization policy.',
    command: 'kubectl get namespaces',
    answer: 'stg and prd, side by side, unable to call each other',
  },
  {
    key: 'pod',
    chip: 'pod',
    title: 'A pod is not a container',
    body: 'It is the smallest thing Kubernetes schedules: a group of containers that share one IP address and one network namespace. Inside a pod, containers reach each other on localhost.',
    command: 'kubectl get pods -n stg',
    answer: 'catalog-7d9f4b8c6d-xk2p9   2/2   Running',
  },
  {
    key: 'containers',
    chip: '2 containers',
    title: 'Two containers, and you only wrote one',
    body: 'Your Go binary is the first. The second is an Envoy proxy that Istio injected at admission time. That 2/2 in the output above is the whole service mesh story in two characters.',
    command: 'kubectl get pod -n stg -l app=catalog -o jsonpath="{.items[0].spec.containers[*].name}"',
    answer: 'catalog istio-proxy',
  },
]

/** Nested frames in a 920x560 logical canvas. Each frame contains the next. */
const FRAMES: { x: number; y: number; w: number; h: number; label: string; tech?: TechKey }[] = [
  { x: 0, y: 0, w: 920, h: 560, label: 'your machine' },
  { x: 46, y: 54, w: 828, h: 462, label: 'docker engine', tech: 'docker' },
  { x: 92, y: 112, w: 736, h: 366, label: 'node / mesh-study', tech: 'kubernetes' },
  { x: 138, y: 172, w: 644, h: 254, label: 'namespace / stg', tech: 'kubernetes' },
  { x: 190, y: 226, w: 540, h: 146, label: 'pod / catalog-7d9f4b8c6d-xk2p9', tech: 'kubernetes' },
]

export function LayersSection() {
  const [step, setStep] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<SVGGElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const media = gsap.matchMedia()
    media.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
      ScrollTrigger.create({
        trigger: wrap,
        start: 'top top',
        end: () => `+=${STEPS.length * 62}%`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const next = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length))
          setStep((cur) => (cur === next ? cur : next))
          // A slow continuous push-in, small enough that labels stay legible.
          if (stageRef.current) {
            gsap.set(stageRef.current, {
              scale: 1 + self.progress * 0.16,
              transformOrigin: '460px 280px',
            })
          }
        },
      })
    }, wrap)

    return () => media.revert()
  }, [])

  const active = STEPS[step]

  return (
    <section id="layers" className="relative border-b border-line bg-canvas">
      <div ref={wrapRef} className="min-h-[100dvh] overflow-hidden bg-canvas">
        <div className="mx-auto flex min-h-[100dvh] max-w-[1400px] flex-col justify-center px-5 py-14 md:px-10 md:py-20">
          <header className="mb-6 lg:mb-10">
            <p className="mb-2.5 font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
              The layers
            </p>
            <SectionTitle>
              A closer look inside the cluster.
            </SectionTitle>
          </header>

          <div className="grid grid-cols-1 gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-14">
            {/* Explanation column, swapped per beat. */}
            <div className="order-2 lg:order-1">
              <div className="layer-choices" role="group" aria-label="Explore the six layers">
                {STEPS.map((s, i) => (
                  <button key={s.key} type="button" aria-pressed={step === i} onClick={() => setStep(i)}>
                    {s.chip}
                  </button>
                ))}
              </div>

              <div key={active.key} className="animate-[fadeUp_0.5s_cubic-bezier(0.16,1,0.3,1)]">
                <span className="inline-flex items-center rounded-lg bg-accent-soft px-2.5 py-1 font-mono text-[11px] text-accent">
                  {String(step + 1).padStart(2, '0')} / {active.chip}
                </span>
                <h3 className="mt-3.5 text-[clamp(1.2rem,2.6vw,2rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
                  {active.title}
                </h3>
                <p className="mt-3.5 max-w-[54ch] text-[14.5px] leading-relaxed text-muted md:text-[15.5px]">
                  <Hi>{active.body}</Hi>
                </p>
                <div className="mt-5 rounded-2xl border border-line bg-sunken p-3.5 md:p-4">
                  <div className="overflow-x-auto">
                    <code className="font-mono text-[12.5px] whitespace-pre text-ink">
                      <span className="mr-2 text-accent select-none">$</span>
                      {active.command}
                    </code>
                  </div>
                  <p className="mt-2.5 font-mono text-[11.5px] text-faint">{active.answer}</p>
                </div>
              </div>
            </div>

            {/* Nested frames. Focus moves inward, the drawing never moves away. */}
            <div className="order-1 lg:order-2">
              <svg
                viewBox="-80 -55 1080 670"
                className="h-auto w-full"
                role="img"
                aria-label={`Nested layers diagram, currently highlighting: ${active.chip}`}
              >
                <g ref={stageRef}>
                  {FRAMES.map((f, i) => {
                    const on = step === i
                    const seen = step >= i
                    return (
                      <g
                        key={f.label}
                        style={{
                          opacity: seen ? 1 : 0.42,
                          transition: 'opacity 600ms cubic-bezier(0.16,1,0.3,1)',
                        }}
                      >
                        <rect
                          x={f.x + 0.5}
                          y={f.y + 0.5}
                          width={f.w - 1}
                          height={f.h - 1}
                          rx={i === 4 ? 14 : 16}
                          fill={on ? 'var(--accent-wash)' : 'transparent'}
                          stroke={on ? 'var(--accent)' : 'var(--line-strong)'}
                          strokeWidth={on ? 1.8 : 1}
                          strokeDasharray={i === 4 ? '7 5' : undefined}
                          style={{ transition: 'all 600ms cubic-bezier(0.16,1,0.3,1)' }}
                        />
                        {f.tech && (
                          <TechGlyph tech={f.tech} x={f.x + 16} y={f.y + 12} size={20} />
                        )}
                        <text
                          x={f.x + (f.tech ? 44 : 16)}
                          y={f.y + 26}
                          className="font-mono"
                          fontSize="13"
                          fill={on ? 'var(--accent)' : 'var(--faint)'}
                          style={{ transition: 'fill 600ms' }}
                        >
                          {f.label}
                        </text>
                      </g>
                    )
                  })}

                  {/* The two containers inside the pod. */}
                  {[
                    { x: 212, y: 268, label: 'istio-proxy', sub: 'Envoy, injected', tech: 'envoyproxy' as TechKey },
                    { x: 470, y: 268, label: 'catalog', sub: 'your Go binary', tech: 'go' as TechKey },
                  ].map((c, i) => {
                    const on = step === 5
                    return (
                      <g
                        key={c.label}
                        style={{
                          opacity: step >= 5 ? 1 : 0.42,
                          transition: `opacity 600ms cubic-bezier(0.16,1,0.3,1) ${i * 90}ms`,
                        }}
                      >
                        <rect
                          x={c.x}
                          y={c.y}
                          width={238}
                          height={82}
                          rx="10"
                          fill={on ? 'var(--accent-soft)' : 'var(--raised)'}
                          stroke={on ? 'var(--accent)' : 'var(--line-strong)'}
                          strokeWidth={on ? 1.6 : 1}
                          style={{ transition: 'all 600ms cubic-bezier(0.16,1,0.3,1)' }}
                        />
                        <TechGlyph tech={c.tech} x={c.x + 16} y={c.y + 17} size={24} />
                        <text
                          x={c.x + 48}
                          y={c.y + 33}
                          className="font-mono"
                          fontSize="14"
                          fill="var(--ink)"
                          fontWeight="500"
                        >
                          {c.label}
                        </text>
                        <text
                          x={c.x + 48}
                          y={c.y + 55}
                          className="font-mono"
                          fontSize="11.5"
                          fill="var(--faint)"
                        >
                          {c.sub}
                        </text>
                      </g>
                    )
                  })}

                  {/* Shared network namespace: the reason they reach each other on localhost. */}
                  <g style={{ opacity: step >= 5 ? 1 : 0, transition: 'opacity 700ms 200ms' }}>
                    <path
                      d="M450 309 L470 309"
                      stroke="var(--accent)"
                      strokeWidth="1.4"
                      strokeDasharray="3 4"
                      className="edge-flow"
                    />
                    <text
                      x="460"
                      y="398"
                      textAnchor="middle"
                      className="font-mono"
                      fontSize="11.5"
                      fill="var(--accent)"
                    >
                      one IP, one network namespace, reachable on localhost
                    </text>
                  </g>
                </g>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes fadeUp { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  )
}
