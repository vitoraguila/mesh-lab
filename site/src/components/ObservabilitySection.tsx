import { Reveal } from './ui/Reveal'
import { Hi } from '../lib/terms'
import { TechGlyph, TechIcon } from './ui/TechIcon'
import { GrafanaShot } from './GrafanaShot'
import { Disclosure } from './ui/Disclosure'

const SERIES: [string, string][] = [
  ['mesh_requests_total', 'counter, labelled by service and outcome'],
  ['mesh_request_duration_seconds', 'histogram, the _bucket series feeds p95'],
  ['mesh_events_published_total', 'counter, telemetry actually handed to the broker'],
  ['mesh_build_info', 'gauge pinned to 1, carries version as a label'],
  ['istio_requests_total', 'added by Envoy, labelled by response_code'],
]

const PANELS: [string, string][] = [
  ['Handler throughput', 'sum by (service) (rate(mesh_requests_total[1m]))'],
  ['Mesh decisions by code', 'sum by (response_code) (rate(istio_requests_total[1m]))'],
  [
    'p95 handler latency',
    'histogram_quantile(0.95, sum by (le, service) (rate(mesh_request_duration_seconds_bucket[5m])))',
  ],
  ['Telemetry publish rate', 'sum by (service) (rate(mesh_events_published_total[1m]))'],
]

function ScrapeDiagram() {
  return (
    <svg
      viewBox="0 0 1160 300"
      className="h-auto w-full min-w-[760px]"
      role="img"
      aria-label="Inside a pod, the application serves its own metrics on port 8080 and the Envoy sidecar scrapes that locally, merging it with its own series and serving the result on port 15020. Prometheus opens the connection to that port every ten seconds. Grafana then queries Prometheus with PromQL. Every arrow points at the thing being read."
    >
      <defs>
        <marker id="pull-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--accent)" />
        </marker>
        <marker id="data-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--muted)" />
        </marker>
      </defs>

      {/* the pod */}
      <rect x="16" y="36" width="470" height="214" rx="14" fill="none" stroke="var(--line-strong)" strokeDasharray="7 5" />
      <text x="32" y="60" className="font-mono" fontSize="11.5" fill="var(--faint)">
        pod / catalog
      </text>

      <rect x="36" y="78" width="196" height="150" rx="11" fill="var(--raised)" stroke="var(--line-strong)" />
      <TechGlyph tech="go" x={52} y={96} size={24} />
      <text x="52" y="146" className="font-mono" fontSize="13" fill="var(--ink)">
        catalog
      </text>
      <text x="52" y="166" className="font-mono" fontSize="10" fill="var(--faint)">
        :8080/metrics
      </text>
      <text x="52" y="184" className="font-mono" fontSize="10" fill="var(--faint)">
        4 mesh_* series
      </text>

      <rect x="266" y="78" width="204" height="150" rx="11" fill="var(--accent-wash)" stroke="var(--accent)" strokeWidth="1.3" />
      <TechGlyph tech="envoyproxy" x={282} y={96} size={24} />
      <text x="282" y="146" className="font-mono" fontSize="13" fill="var(--ink)">
        istio-proxy
      </text>
      <text x="282" y="166" className="font-mono" fontSize="10" fill="var(--faint)">
        :15020/stats/prometheus
      </text>
      <text x="282" y="184" className="font-mono" fontSize="10" fill="var(--faint)">
        merged, plus istio_*
      </text>

      {/* sidecar reads the app over localhost */}
      <path d="M262 153 L236 153" stroke="var(--accent)" strokeWidth="1.5" markerEnd="url(#pull-head)" />
      <text x="249" y="206" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--accent)">
        localhost
      </text>

      <rect x="566" y="88" width="240" height="130" rx="12" fill="var(--raised)" stroke="var(--line-strong)" />
      <TechGlyph tech="prometheus" x={584} y={106} size={26} />
      <text x="584" y="158" className="font-mono" fontSize="13" fill="var(--ink)">
        prometheus
      </text>
      <text x="584" y="178" className="font-mono" fontSize="10" fill="var(--faint)">
        scrape_interval: 10s
      </text>
      <text x="584" y="196" className="font-mono" fontSize="10" fill="var(--faint)">
        retention: 2h
      </text>

      <rect x="886" y="88" width="240" height="130" rx="12" fill="var(--raised)" stroke="var(--line-strong)" />
      <TechGlyph tech="grafana" x={904} y={106} size={26} />
      <text x="904" y="158" className="font-mono" fontSize="13" fill="var(--ink)">
        grafana
      </text>
      <text x="904" y="178" className="font-mono" fontSize="10" fill="var(--faint)">
        read-only datasource
      </text>
      <text x="904" y="196" className="font-mono" fontSize="10" fill="var(--faint)">
        4 panels
      </text>

      {/* both long arrows point at what is being read */}
      <path d="M562 132 L492 132" stroke="var(--accent)" strokeWidth="1.5" markerEnd="url(#pull-head)" />
      <text x="527" y="122" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--accent)">
        pull
      </text>
      <path d="M492 172 L560 172" stroke="var(--muted)" strokeWidth="1.1" strokeDasharray="4 4" markerEnd="url(#data-head)" />
      <text x="527" y="192" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--faint)">
        exposition
      </text>

      <path d="M882 132 L812 132" stroke="var(--accent)" strokeWidth="1.5" markerEnd="url(#pull-head)" />
      <text x="847" y="122" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--accent)">
        PromQL
      </text>
      <path d="M812 172 L880 172" stroke="var(--muted)" strokeWidth="1.1" strokeDasharray="4 4" markerEnd="url(#data-head)" />
      <text x="847" y="192" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--faint)">
        series
      </text>

      <text x="16" y="284" className="font-mono" fontSize="10.5" fill="var(--faint)">
        every arrow points at the thing being read, which is why no part of this path carries a credential
      </text>
    </svg>
  )
}

export function ObservabilitySection() {
  return (
    <section id="signals"
      style={{ ["--tint" as string]: "#0ca678" }} className="border-b border-line bg-canvas py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <div className="mb-5 flex items-center gap-4">
            <TechIcon tech="prometheus" size={40} />
            <TechIcon tech="grafana" size={40} />
          </div>
          <h2 className="max-w-[22ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Nobody sends a metric anywhere
          </h2>
          <p className="mt-5 max-w-[62ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Prometheus goes and fetches them, on a schedule, from every pod it can discover. That one design choice is why collection needs no credentials and never crosses the authorization boundary.'}
            </Hi>
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-10 overflow-hidden rounded-2xl border border-line bg-raised">
          <div className="relative">
            <div className="overflow-x-auto p-5 md:p-8">
              <ScrapeDiagram />
            </div>
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-14 lg:hidden"
              style={{ background: 'linear-gradient(to left, var(--raised), transparent)' }}
            />
          </div>
        </Reveal>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12">
          <Reveal as="article" className="min-w-0 rounded-2xl border border-line bg-raised p-6 lg:col-span-5 lg:p-8">
            <h3 className="text-[18px] font-medium tracking-[-0.015em] text-ink">
              What a pod actually exposes
            </h3>
            <p className="mt-2.5 text-[14px] leading-relaxed text-muted">
              <Hi>
                {'The Go services use a shared telemetry package, payments uses telemetry.js and reviews uses telemetry.py, and all three publish the same names.'}
              </Hi>
            </p>
            <dl className="mt-6 grid gap-4">
              {SERIES.map(([name, note]) => (
                <div key={name} className="min-w-0">
                  <dt className="min-w-0 overflow-x-auto">
                    <code className="font-mono text-[12.5px] whitespace-nowrap text-accent">{name}</code>
                  </dt>
                  <dd className="mt-0.5 text-[12.5px] leading-snug text-faint">{note}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

          <Reveal as="article" delay={0.08} className="min-w-0 rounded-2xl border border-line bg-raised p-6 lg:col-span-7 lg:p-8">
            <h3 className="text-[18px] font-medium tracking-[-0.015em] text-ink">
              How Prometheus finds every pod
            </h3>
            <p className="mt-2.5 max-w-[62ch] text-[14px] leading-relaxed text-muted">
              <Hi>
                {'One scrape job, no static list. It asks the Kubernetes API for pods in its own namespace, keeps the ones carrying the scrape annotation, and rewrites the target address to the sidecar port.'}
              </Hi>
            </p>
            <div className="mt-5">
              <Disclosure title="Show the scrape job" defaultOpen={false}>
                <div className="mt-6 overflow-x-auto rounded-xl border border-line bg-sunken p-4">
                  <pre className="font-mono text-[11.5px] leading-[1.8] text-ink">
                    <code>{`- job_name: mesh-workloads
  kubernetes_sd_configs:
    - role: pod
      namespaces:
        names: [stg]
  relabel_configs:
    - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
      action: keep
      regex: "true"
    - source_labels: [__meta_kubernetes_pod_ip]
      action: replace
      target_label: __address__
      replacement: $1:15020
    - target_label: __metrics_path__
      replacement: /stats/prometheus`}</code>
                  </pre>
                </div>
              </Disclosure>
            </div>
            <p className="mt-4 max-w-[62ch] text-[13.5px] leading-relaxed text-muted">
              <Hi>
                {'That discovery is the only Kubernetes API access on the page, and it is a namespace-scoped Role over pods, services and endpoints, get, list and watch. Prometheus is the one workload here that mounts a service account token.'}
              </Hi>
            </p>
          </Reveal>

          <Reveal as="article" delay={0.04} className="min-w-0 rounded-2xl border border-line bg-raised p-6 lg:col-span-12 lg:p-8">
            <h3 className="text-[18px] font-medium tracking-[-0.015em] text-ink">
              What Grafana asks for
            </h3>
            <p className="mt-2.5 max-w-[70ch] text-[14px] leading-relaxed text-muted">
              <Hi>
                {'Four provisioned panels, four queries. The datasource is read only and there is no gateway route to either service, so nothing outside the cluster can reach them.'}
              </Hi>
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {PANELS.map(([title, expr]) => (
                <div key={title} className="min-w-0 rounded-xl border border-line bg-sunken p-4">
                  <p className="text-[13.5px] font-medium text-ink">{title}</p>
                  <div className="mt-2 overflow-x-auto">
                    <code className="font-mono text-[11.5px] whitespace-pre text-accent">{expr}</code>
                  </div>
                </div>
              ))}
            </div>
            <GrafanaShot />
            <div className="mt-6 rounded-xl border border-line bg-sunken p-4">
              <code className="font-mono text-[12.5px] text-ink">
                <span className="mr-2 text-accent select-none">$</span>
                make grafana ENV=stg
              </code>
              <p className="mt-2 font-mono text-[11.5px] text-faint">
                prints the generated login and forwards to :3200
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.06}>
          <p className="mt-8 max-w-[74ch] border-l-2 pl-5 text-[15.5px] leading-relaxed text-ink" style={{ borderColor: 'var(--accent)' }}>
            <Hi>
              {'Port 15020 is exempt from mutual TLS and from AuthorizationPolicy. That exemption is the whole trick: the metrics port sits outside the policy that guards every other port, so a scrape never needs a token and a scraper can never use that port to reach your handler.'}
            </Hi>
          </p>
        </Reveal>

      </div>
    </section>
  )
}
