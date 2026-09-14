import { Reveal } from './ui/Reveal'
import { Hi } from '../lib/terms'
import { TechGlyph, TechIcon } from './ui/TechIcon'
import type { TechKey } from '../lib/techIcons'

type Box = {
  x: number
  y: number
  w: number
  h: number
  name: string
  sub: string
  tech: TechKey
  extra?: TechKey
  accent?: boolean
  dashed?: boolean
}

const BOXES: Box[] = [
  { x: 500, y: 8, w: 200, h: 52, name: 'browser', sub: 'your machine', tech: 'googlechrome' },
  { x: 500, y: 104, w: 200, h: 76, name: 'web', sub: 'Next.js 16, React 19', tech: 'nextdotjs', extra: 'typescript', dashed: true },
  { x: 500, y: 212, w: 200, h: 60, name: 'gateway', sub: 'Istio ingress', tech: 'istio', accent: true },

  { x: 301, y: 318, w: 124, h: 80, name: 'catalog', sub: 'REST', tech: 'go' },
  { x: 439, y: 318, w: 124, h: 80, name: 'orders', sub: 'REST', tech: 'go' },
  { x: 577, y: 318, w: 124, h: 80, name: 'inventory', sub: 'REST', tech: 'go' },
  { x: 715, y: 318, w: 124, h: 80, name: 'payments', sub: 'REST', tech: 'nodedotjs' },
  { x: 370, y: 412, w: 124, h: 80, name: 'reviews', sub: 'REST', tech: 'python' },
  { x: 508, y: 412, w: 124, h: 80, name: 'graphql', sub: 'queries', tech: 'graphql' },
  { x: 646, y: 412, w: 124, h: 80, name: 'grpc', sub: 'HTTP/2', tech: 'go' },

  { x: 460, y: 556, w: 280, h: 60, name: 'authz', sub: 'the CUSTOM provider', tech: 'go', accent: true },

  { x: 72, y: 318, w: 190, h: 80, name: 'rabbitmq', sub: 'mesh.events exchange', tech: 'rabbitmq' },
  { x: 72, y: 412, w: 190, h: 80, name: 'events', sub: 'WebSocket fan-out', tech: 'go' },

  { x: 938, y: 318, w: 190, h: 80, name: 'prometheus', sub: 'scrapes :15020', tech: 'prometheus' },
  { x: 938, y: 412, w: 190, h: 80, name: 'grafana', sub: 'dashboards', tech: 'grafana' },
]

const REQUEST = ['M600 60 L600 104', 'M600 180 L600 212', 'M600 272 L600 288', 'M600 516 L600 556']
const TELEMETRY = ['M290 452 L276 452 L276 358 L262 358', 'M167 398 L167 412', 'M72 452 L52 452 L52 160 L500 160']
const METRICS = ['M850 452 L864 452 L864 358 L938 358', 'M1033 398 L1033 412']

const FACTS: { tech: TechKey; title: string; body: string }[] = [
  {
    tech: 'kubernetes',
    title: 'Kubernetes schedules it',
    body: 'One Minikube node holds both namespaces. Every box in the frame is a Deployment with a Service in front of it.',
  },
  {
    tech: 'istio',
    title: 'Istio configures the proxies',
    body: 'Routes, mutual TLS, and the two authorization policies each service owns. The control plane never sits in the request path.',
  },
  {
    tech: 'envoyproxy',
    title: 'Envoy carries every byte',
    body: 'A sidecar in each of those pods. It is the thing that actually enforces the policy and emits the mesh metrics.',
  },
  {
    tech: 'helm',
    title: 'Helm renders it',
    body: 'One study release per namespace, composed from fifteen application charts, each owning its own templates and values.',
  },
]

export function ArchitectureSection() {
  return (
    <section id="overview"
      style={{ ["--tint" as string]: "#1c7ed6" }} className="border-b border-line tinted py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <h2 className="max-w-[20ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Everything that runs, on one node
          </h2>
          <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Fifteen workloads in three languages. One line is a request, one is telemetry, one is metric collection, and the three never share a path.'}
            </Hi>
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-10 overflow-hidden rounded-2xl border border-line bg-sunken">
          <div className="relative">
            <div className="bg-blueprint-fine overflow-x-auto p-4 md:p-7">
              <svg
                viewBox="0 0 1200 740"
                className="h-auto w-full min-w-[840px]"
                role="img"
                aria-label="Architecture map. The browser calls the Next.js web pod, which calls the Istio gateway, which routes to seven business APIs written in Go, Node.js and Python. Each of those consults the shared authz service. They publish telemetry to RabbitMQ, which the events service fans out over WebSocket back to the web pod. Prometheus scrapes every pod and Grafana reads Prometheus."
              >
                {/* cluster boundary */}
                <rect
                  x="30"
                  y="80"
                  width="1140"
                  height="600"
                  rx="18"
                  fill="none"
                  stroke="var(--line-strong)"
                  strokeDasharray="8 6"
                />
                <text x="48" y="104" className="font-mono" fontSize="12" fill="var(--faint)">
                  cluster mesh-study / namespace stg
                </text>

                {/* the group the gateway delegates into */}
                <rect
                  x="290"
                  y="288"
                  width="560"
                  height="228"
                  rx="14"
                  fill="none"
                  stroke="var(--line)"
                />
                <text x="304" y="310" className="font-mono" fontSize="11.5" fill="var(--faint)">
                  business APIs
                </text>

                {REQUEST.map((d) => (
                  <g key={d}>
                    <path d={d} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
                    <path
                      d={d}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="1.6"
                      strokeDasharray="4 8"
                      opacity="0.7"
                      className="edge-flow"
                    />
                  </g>
                ))}
                {TELEMETRY.map((d) => (
                  <path key={d} d={d} fill="none" stroke="var(--muted)" strokeWidth="1.2" strokeDasharray="7 5" />
                ))}
                {METRICS.map((d) => (
                  <path key={d} d={d} fill="none" stroke="var(--muted)" strokeWidth="1.2" strokeDasharray="2 5" />
                ))}

                {BOXES.map((b) => (
                  <g key={b.name}>
                    <rect
                      x={b.x}
                      y={b.y}
                      width={b.w}
                      height={b.h}
                      rx="11"
                      fill={b.accent ? 'var(--accent-soft)' : 'var(--raised)'}
                      stroke={b.accent ? 'var(--accent)' : 'var(--line-strong)'}
                      strokeWidth={b.accent ? 1.4 : 1}
                      strokeDasharray={b.dashed ? '7 5' : undefined}
                    />
                    <TechGlyph tech={b.tech} x={b.x + 11} y={b.y + b.h / 2 - 19} size={22} />
                    {b.extra && (
                      <TechGlyph tech={b.extra} x={b.x + 38} y={b.y + b.h / 2 - 19} size={22} />
                    )}
                    <text
                      x={b.x + (b.extra ? 68 : 41)}
                      y={b.y + b.h / 2 - 1}
                      className="font-mono"
                      fontSize="13"
                      fill="var(--ink)"
                    >
                      {b.name}
                    </text>
                    <text
                      x={b.x + (b.extra ? 68 : 41)}
                      y={b.y + b.h / 2 + 16}
                      className="font-mono"
                      fontSize="10"
                      fill="var(--faint)"
                    >
                      {b.sub}
                    </text>
                  </g>
                ))}

                {/* legend */}
                <g transform="translate(30 706)">
                  <path d="M0 0 L28 0" stroke="var(--accent)" strokeWidth="1.6" />
                  <text x="38" y="4" className="font-mono" fontSize="11" fill="var(--muted)">
                    request
                  </text>
                  <path d="M120 0 L148 0" stroke="var(--muted)" strokeWidth="1.2" strokeDasharray="7 5" />
                  <text x="158" y="4" className="font-mono" fontSize="11" fill="var(--muted)">
                    telemetry, best effort
                  </text>
                  <path d="M330 0 L358 0" stroke="var(--muted)" strokeWidth="1.2" strokeDasharray="2 5" />
                  <text x="368" y="4" className="font-mono" fontSize="11" fill="var(--muted)">
                    metrics, pulled
                  </text>
                  <TechGlyph tech="envoyproxy" x={520} y={-11} size={19} />
                  <text x="544" y="4" className="font-mono" fontSize="11" fill="var(--muted)">
                    every workload inside the frame also runs an Envoy sidecar
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

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {FACTS.map((f, i) => (
            <Reveal
              key={f.title}
              as="article"
              delay={i * 0.06}
              className="rounded-2xl border border-line bg-raised p-5"
            >
              <TechIcon tech={f.tech} size={36} />
              <h3 className="mt-3.5 text-[15.5px] font-medium tracking-[-0.01em] text-ink">{f.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                <Hi>{f.body}</Hi>
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
