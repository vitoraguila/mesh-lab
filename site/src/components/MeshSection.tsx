import { SectionTitle } from './ui/SectionTitle'
import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { LockKeyIcon, LockKeyOpenIcon } from '@phosphor-icons/react'
import { Reveal } from './ui/Reveal'
import { Hi } from '../lib/terms'
import { TechGlyph, TechIcon } from './ui/TechIcon'
import { EASE } from '../lib/motion'

const RESOURCES = [
  {
    kind: 'VirtualService',
    job: 'Which path reaches which service, and how long it may take.',
    yaml: `match:
  - uri:
      exact: /catalog
timeout: 3s
route:
  - destination:
      host: catalog.stg.svc.cluster.local`,
  },
  {
    kind: 'DestinationRule',
    job: 'How to connect once the destination is chosen.',
    yaml: `host: catalog.stg.svc.cluster.local
trafficPolicy:
  tls:
    mode: ISTIO_MUTUAL`,
  },
  {
    kind: 'AuthorizationPolicy / ALLOW',
    job: 'Who is even allowed to open the connection.',
    yaml: `action: ALLOW
rules:
  - from:
      - source:
          principals:
            - cluster.local/ns/stg/sa/gateway
    to:
      - operation:
          methods: [GET]`,
  },
  {
    kind: 'AuthorizationPolicy / CUSTOM',
    job: 'Ask an external service whether this specific caller may do this.',
    yaml: `action: CUSTOM
provider:
  name: study-authz-stg
rules:
  - {}`,
  },
]

function SidecarDiagram({ injected }: { injected: boolean }) {
  const reduce = useReducedMotion()
  const t = reduce ? { duration: 0 } : { duration: 0.75, ease: EASE }

  return (
    <svg viewBox="0 0 920 300" className="h-auto w-full" role="img" aria-label={injected ? 'With the sidecar injected, the gateway connects to Envoy over mutual TLS and Envoy forwards to the application on localhost.' : 'Without the sidecar, the gateway connects straight to the application in plain HTTP.'}>
      {/* gateway */}
      <rect x="20" y="105" width="150" height="90" rx="12" fill="var(--raised)" stroke="var(--line-strong)" />
      <TechGlyph tech="istio" x={84} y={116} size={22} />
      <text x="95" y="152" textAnchor="middle" className="font-mono" fontSize="13" fill="var(--ink)">
        gateway
      </text>
      <text x="95" y="170" textAnchor="middle" className="font-mono" fontSize="10" fill="var(--faint)">
        caller
      </text>

      {/* pod boundary */}
      <rect
        x="380"
        y="50"
        width="520"
        height="200"
        rx="16"
        fill="none"
        stroke="var(--line-strong)"
        strokeWidth="1"
        strokeDasharray="7 5"
      />
      <text x="396" y="74" className="font-mono" fontSize="11" fill="var(--faint)">
        pod / catalog
      </text>

      {/* connection into the pod */}
      <motion.path
        animate={{ d: injected ? 'M170 150 L410 150' : 'M170 150 L560 150' }}
        transition={t}
        fill="none"
        stroke={injected ? 'var(--accent)' : 'var(--line-strong)'}
        strokeWidth="1.6"
      />
      <motion.path
        animate={{ d: injected ? 'M170 150 L410 150' : 'M170 150 L560 150' }}
        transition={t}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeDasharray="4 8"
        className="edge-flow"
        opacity={injected ? 0.8 : 0}
      />
      <motion.text
        animate={{ x: injected ? 290 : 365, opacity: 1 }}
        transition={t}
        y="136"
        textAnchor="middle"
        className="font-mono"
        fontSize="10.5"
        fill={injected ? 'var(--accent)' : 'var(--faint)'}
      >
        {injected ? 'mTLS, both sides verified' : 'plain HTTP, anyone on the network'}
      </motion.text>

      {/* envoy sidecar */}
      <motion.g animate={{ opacity: injected ? 1 : 0, x: injected ? 0 : -28 }} transition={t}>
        <rect x="410" y="105" width="200" height="90" rx="10" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="1.4" />
        <TechGlyph tech="envoyproxy" x={424} y={116} size={22} />
        <text x="510" y="140" textAnchor="middle" className="font-mono" fontSize="13" fill="var(--ink)">
          istio-proxy
        </text>
        <text x="510" y="160" textAnchor="middle" className="font-mono" fontSize="10" fill="var(--accent)">
          Envoy, injected
        </text>
        <path d="M610 150 L684 150" stroke="var(--line-strong)" strokeWidth="1.6" />
        <text x="647" y="137" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--faint)">
          localhost
        </text>
      </motion.g>

      {/* application container */}
      <motion.g animate={{ x: injected ? 124 : 0 }} transition={t}>
        <rect x="560" y="105" width="200" height="90" rx="10" fill="var(--raised)" stroke="var(--line-strong)" />
        <TechGlyph tech="go" x={574} y={116} size={22} />
        <text x="660" y="140" textAnchor="middle" className="font-mono" fontSize="13" fill="var(--ink)">
          catalog
        </text>
        <text x="660" y="160" textAnchor="middle" className="font-mono" fontSize="10" fill="var(--faint)">
          your Go binary
        </text>
      </motion.g>

      <motion.text
        animate={{ opacity: 1 }}
        x="700"
        y="236"
        textAnchor="middle"
        className="font-mono"
        fontSize="11"
        fill={injected ? 'var(--ok)' : 'var(--faint)'}
      >
        {injected ? 'READY 2/2' : 'READY 1/1'}
      </motion.text>
    </svg>
  )
}

export function MeshSection() {
  const [injected, setInjected] = useState(true)

  return (
    <section id="mesh" className="border-b border-line wash py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <div className="mb-5 flex items-center gap-4">
            <TechIcon tech="istio" size={40} />
            <TechIcon tech="envoyproxy" size={40} />
          </div>
          <SectionTitle>
            Your code handles the business.
            The mesh handles the traffic.
          </SectionTitle>
          <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Envoy is the proxy. Istio is the control plane that configures every copy of it. Flip the switch to see what injection actually changes about the pod.'}
            </Hi>
          </p>
        </Reveal>

        <Reveal delay={0.1} className="mt-10 rounded-2xl border border-line bg-raised p-5 md:p-8">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={injected}
              onClick={() => setInjected((v) => !v)}
              className="inline-flex items-center gap-3 rounded-full border border-line-strong px-4 py-2.5 transition-colors hover:border-accent"
            >
              <span
                className="relative h-5 w-9 rounded-full transition-colors duration-300"
                style={{ background: injected ? 'var(--accent)' : 'var(--line-strong)' }}
              >
                <span
                  className="absolute top-0.5 size-4 rounded-full transition-[left] duration-300"
                  style={{ left: injected ? '18px' : '2px', background: 'var(--raised)' }}
                />
              </span>
              <span className="font-mono text-[12px] text-ink">
                istio-injection: {injected ? 'enabled' : 'disabled'}
              </span>
            </button>

            <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px]" style={{ color: injected ? 'var(--ok)' : 'var(--deny)' }}>
              {injected ? <LockKeyIcon size={14} weight="bold" /> : <LockKeyOpenIcon size={14} weight="bold" />}
              {injected ? 'identity verified on both ends' : 'no identity, no encryption, no policy'}
            </span>
          </div>

          <SidecarDiagram injected={injected} />

          <p className="mt-6 max-w-[70ch] text-[14.5px] leading-relaxed text-muted">
            <Hi>
              {'Nothing in the Go source changed. The pod template gained a container, and with it every inbound and outbound byte now passes through something the platform controls: encryption, identity, retries, timeouts, metrics and authorization, all applied without a line of application code.'}
            </Hi>
          </p>
        </Reveal>

        <div className="mt-14">
          <Reveal>
            <h3 className="max-w-[26ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
              Four resources decide whether a call happens
            </h3>
            <p className="mt-4 max-w-[58ch] text-[15px] leading-relaxed text-muted">
              Two describe routing, two describe permission. All four are attached to the destination,
              and the proxy enforces them before your handler is ever entered.
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
            {RESOURCES.map((r, i) => (
              <Reveal
                key={r.kind}
                as="article"
                delay={(i % 2) * 0.08}
                className="flex min-w-0 flex-col rounded-2xl border border-line bg-raised p-6"
              >
                <h4 className="flex items-center gap-2 font-mono text-[13px] font-medium text-accent">
                  <TechIcon tech="istio" size={20} label={false} />
                  {r.kind}
                </h4>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-muted">
                  <Hi>{r.job}</Hi>
                </p>
                <div className="mt-5 flex-1 overflow-x-auto rounded-xl border border-line bg-sunken p-4">
                  <pre className="font-mono text-[11.5px] leading-[1.8] text-ink">
                    <code>{r.yaml}</code>
                  </pre>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1}>
            <p className="mt-8 max-w-[70ch] border-l-2 pl-5 text-[15.5px] leading-relaxed text-ink" style={{ borderColor: 'var(--accent)' }}>
              <Hi>
                {'The namespace also carries a default-deny policy and STRICT mutual TLS. A service that nobody wrote a rule for is unreachable, which is the opposite of the usual default.'}
              </Hi>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
