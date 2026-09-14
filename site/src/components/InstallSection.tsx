import { Reveal } from './ui/Reveal'
import { Hi } from '../lib/terms'
import { Terminal } from './ui/Terminal'
import { StudioPreview } from './StudioPreview'
import type { Line } from './ui/Terminal'

type Step = { title: string; body: string; title2?: string; lines: Line[] }

const STEPS: Step[] = [
  {
    title: 'Get the prerequisites',
    body: 'Docker Desktop running with roughly 8 GB of memory, plus the language runtimes. make tools installs minikube, helm, istioctl and the kubectl context helpers.',
    lines: [
      { kind: 'comment', text: '# macOS with Homebrew' },
      { kind: 'cmd', text: 'brew install node go python3 kubectl' },
      { kind: 'cmd', text: 'make tools' },
      { kind: 'out', text: 'minikube, helm, istioctl, kns/ktx, fzf' },
    ],
  },
  {
    title: 'Install the frontend dependencies',
    body: 'Only needed for typechecking and the browser checks. The deployed image builds its own dependencies.',
    lines: [{ kind: 'cmd', text: 'npm ci --prefix apps/web' }],
  },
  {
    title: 'Bring both environments up',
    body: 'This starts the cluster, installs Istio, builds every image, deploys stg and prd, and runs the smoke checks. The first run takes roughly 10 to 20 minutes, almost all of it image builds.',
    lines: [
      { kind: 'cmd', text: 'make up-all' },
      { kind: 'comment', text: '' },
      { kind: 'comment', text: '# or one step at a time' },
      { kind: 'cmd', text: 'make cluster', note: '# start the mesh-study profile' },
      { kind: 'cmd', text: 'make mesh', note: '# namespaces, Istio base, istiod' },
      { kind: 'cmd', text: 'make gateway ENV=stg' },
      { kind: 'cmd', text: 'make secrets ENV=stg', note: '# generates .local/stg once' },
      { kind: 'cmd', text: 'make build' },
      { kind: 'cmd', text: 'make deploy ENV=stg' },
    ],
  },
  {
    title: 'Point kubectl at local staging',
    body: 'make cluster starts with --keep-context, so nothing silently repoints kubectl at this study. Switching is always something you ask for.',
    lines: [
      { kind: 'cmd', text: 'make use ENV=stg' },
      { kind: 'cmd', text: 'kubectl get pods' },
      { kind: 'out', text: 'catalog-7d9f4b8c6d-xk2p9    2/2   Running' },
      { kind: 'out', text: 'web-5c8b9f7d64-mn4qw        2/2   Running' },
      { kind: 'out', text: 'authz-6b4d8f9c52-pt7vx      2/2   Running' },
    ],
  },
  {
    title: 'Open the interface',
    body: 'Keep this terminal running. The forward binds loopback only, and when the preferred port is busy it takes the next free one, so read the URL it prints rather than assuming 3000.',
    lines: [
      { kind: 'cmd', text: 'make port-forward ENV=stg' },
      { kind: 'ok', text: 'forwarding stg -> http://127.0.0.1:3000' },
      { kind: 'comment', text: '' },
      { kind: 'cmd', text: 'make grafana ENV=stg', note: '# dashboards, starting at :3200' },
      { kind: 'cmd', text: 'make tokens ENV=stg', note: '# print the demo credentials' },
    ],
  },
  {
    title: 'Prove the policy is real',
    body: 'The smoke run checks allow, deny, the direct-to-service bypass, and a brief authz outage that it restores afterwards. This is where the diagram above stops being a diagram.',
    lines: [
      { kind: 'cmd', text: 'make smoke ENV=stg' },
      { kind: 'ok', text: 'admin  -> /catalog 200   /orders 200   /graphql 200' },
      { kind: 'ok', text: 'reader -> /catalog 200   /orders 403   /graphql 200' },
      { kind: 'bad', text: 'no token, invalid token, other environment -> 403' },
      { kind: 'bad', text: 'web bypassing the gateway -> 403' },
    ],
  },
  {
    title: 'Put it away',
    body: 'Stopping keeps the profile and its state so the next start is fast. Deleting destroys the whole local profile and nothing else on your machine.',
    lines: [
      { kind: 'cmd', text: 'make stop', note: '# keep the state' },
      { kind: 'cmd', text: 'make delete', note: '# destroy the profile' },
    ],
  },
]

export function InstallSection() {
  return (
    <section id="install"
      style={{ ["--tint" as string]: "#f59f00" }} className="border-b border-line wash py-20 lg:py-28">
      <div className="mx-auto max-w-[980px] px-5 md:px-10">
        <Reveal>
          <p className="mb-3 font-mono text-[11px] tracking-[0.18em] text-accent uppercase">
            Run it yourself
          </p>
          <h2 className="max-w-[20ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Running the whole thing locally
          </h2>
          <p className="mt-5 max-w-[58ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Nothing here touches a remote cluster. stg and prd are two namespaces in one local Minikube profile called mesh-study.'}
            </Hi>
          </p>
        </Reveal>

        <StudioPreview />

        <ol className="mt-16 flex flex-col gap-12 lg:gap-16">
          {STEPS.map((s, i) => (
            <Reveal as="li" key={s.title} amount={0.15}>
              <div className="grid grid-cols-[auto_1fr] gap-4 md:gap-6">
                <span className="font-mono text-[clamp(1.5rem,4vw,2.2rem)] leading-none font-medium text-accent tabular-nums">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <h3 className="text-[19px] leading-[1.25] font-medium tracking-[-0.015em] text-ink md:text-[21px]">
                    {s.title}
                  </h3>
                  <p className="mt-3 max-w-[62ch] text-[15px] leading-relaxed text-muted">
                    <Hi>{s.body}</Hi>
                  </p>
                  <Terminal className="mt-6" lines={s.lines} />
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  )
}
