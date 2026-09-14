import { Reveal } from './ui/Reveal'

type Lane = {
  title: string
  direction: string
  body: string
  hops: { name: string; note: string }[]
  closing: string
}

const LANES: Lane[] = [
  {
    title: 'Metrics are pulled',
    direction: 'pull',
    body: 'Nobody sends metrics anywhere. Prometheus goes and fetches them, and that direction is what keeps the whole thing credential-free.',
    hops: [
      { name: 'your handler', note: 'mesh_requests_total, mesh_request_duration_seconds' },
      { name: 'the sidecar, :15020', note: 'scrapes the app locally, merges its own istio_* series' },
      { name: 'prometheus', note: 'one target per pod, discovered with a namespace-scoped Role' },
      { name: 'grafana', note: 'read-only datasource, four panels, no gateway route' },
    ],
    closing:
      'Port 15020 is exempt from mutual TLS and from AuthorizationPolicy, so collection never crosses the authorization boundary. Prometheus is the only workload here that mounts a service account token.',
  },
  {
    title: 'Events are pushed',
    direction: 'push',
    body: 'Telemetry runs the other way and is deliberately best effort. If the broker is gone, business requests keep succeeding and the interface says the broker is reconnecting.',
    hops: [
      { name: 'every service', note: 'publishes to the mesh.events topic exchange' },
      { name: 'routing key', note: 'stg.catalog.completed, stg.authz.allow, and so on' },
      { name: 'rabbitmq', note: 'AMQP 5672 only, no VirtualService, unreachable from outside' },
      { name: 'events service', note: 'durable queue, prefetch 50, fans out over WebSocket' },
    ],
    closing:
      'Events carry metadata only: never a bearer token, never a request or response body. The queue is an emptyDir, so a restart starts empty. It is an observation channel, not an audit log.',
  },
]

export function ObservabilitySection() {
  return (
    <section className="border-b border-line bg-sunken py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <h2 className="max-w-[24ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Two ways to see what the mesh just did
          </h2>
          <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-muted">
            One lane is pulled and permanent, the other is pushed and disposable. Knowing which is
            which tells you what you can trust when something breaks.
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {LANES.map((lane, li) => (
            <Reveal
              key={lane.title}
              as="article"
              delay={li * 0.1}
              className="rounded-2xl border border-line bg-raised p-6 lg:p-8"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-[19px] font-medium tracking-[-0.015em] text-ink">{lane.title}</h3>
                <code className="font-mono text-[10.5px] text-accent">{lane.direction}</code>
              </div>
              <p className="mt-3 max-w-[52ch] text-[14.5px] leading-relaxed text-muted">{lane.body}</p>

              <ol className="mt-7">
                {lane.hops.map((hop, i) => (
                  <li key={hop.name} className="grid grid-cols-[26px_1fr] gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className="mt-1.5 size-2.5 shrink-0 rounded-full"
                        style={{
                          background: 'var(--accent)',
                          opacity: 0.35 + i * 0.22,
                        }}
                      />
                      {i < lane.hops.length - 1 && (
                        <span className="my-1 w-px flex-1" style={{ background: 'var(--line-strong)' }} />
                      )}
                    </div>
                    <div className={i < lane.hops.length - 1 ? 'pb-5' : ''}>
                      <code className="font-mono text-[13px] text-ink">{hop.name}</code>
                      <p className="mt-1 max-w-[46ch] text-[12.5px] leading-snug text-faint">{hop.note}</p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-2 max-w-[54ch] border-l-2 pl-4 text-[13.5px] leading-relaxed text-muted" style={{ borderColor: 'var(--line-strong)' }}>
                {lane.closing}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
