import { Reveal } from './ui/Reveal'
import { Disclosure } from './ui/Disclosure'
import { TechIcon } from './ui/TechIcon'
import { Hi } from '../lib/terms'

const WORDS: [string, string][] = [
  [
    'Chart',
    'A folder. Chart.yaml naming it, values.yaml holding the defaults, and templates/ holding the YAML. That folder is the package, and it is the thing you version.',
  ],
  [
    'Values',
    'Every knob the chart exposes, with a working default. An environment supplies only what differs, which in this project is usually three or four lines.',
  ],
  [
    'Template',
    'An ordinary manifest with holes in it. Everything between the double braces is evaluated at render time and disappears from the output.',
  ],
  [
    'Release',
    'One installed instance of a chart, under a name, in a namespace. It keeps a revision history, so helm rollback is a real thing you can do at 2am.',
  ],
  [
    'Dependency',
    'A chart made of charts. One study release per namespace pulls in fifteen application charts, which is why make deploy upgrades the whole environment at once.',
  ],
]

function Pipeline() {
  return (
    <svg
      viewBox="0 0 1140 250"
      className="h-auto w-full min-w-[760px]"
      role="img"
      aria-label="Values and templates go into Helm, which renders plain Kubernetes manifests on your machine. Only those finished manifests are sent to the API server. The cluster never sees Helm."
    >
      <defs>
        <marker id="helm-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M0 0 L10 5 L0 10 z" fill="var(--line-strong)" />
        </marker>
      </defs>

      {[
        { x: 16, y: 24, w: 226, h: 80, t: 'values.yaml', s: 'defaults, then the environment' },
        { x: 16, y: 136, w: 226, h: 80, t: 'templates/*.yaml', s: 'manifests with {{ }} in them' },
      ].map((b) => (
        <g key={b.t}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx="11" fill="var(--raised)" stroke="var(--line-strong)" />
          <text x={b.x + 16} y={b.y + 36} className="font-mono" fontSize="13" fill="var(--ink)">
            {b.t}
          </text>
          <text x={b.x + 16} y={b.y + 56} className="font-mono" fontSize="10" fill="var(--faint)">
            {b.s}
          </text>
        </g>
      ))}

      <path d="M242 64 L290 64 L290 104 L320 104" fill="none" stroke="var(--line-strong)" strokeWidth="1.3" markerEnd="url(#helm-head)" />
      <path d="M242 176 L290 176 L290 136 L320 136" fill="none" stroke="var(--line-strong)" strokeWidth="1.3" markerEnd="url(#helm-head)" />

      <rect x="326" y="72" width="196" height="96" rx="12" fill="var(--accent-wash)" stroke="var(--accent)" strokeWidth="1.4" />
      <text x="348" y="112" className="font-mono" fontSize="13.5" fill="var(--ink)">
        helm renders
      </text>
      <text x="348" y="132" className="font-mono" fontSize="10" fill="var(--faint)">
        on your machine
      </text>

      <path d="M522 120 L596 120" fill="none" stroke="var(--line-strong)" strokeWidth="1.3" markerEnd="url(#helm-head)" />

      <rect x="602" y="72" width="216" height="96" rx="12" fill="var(--raised)" stroke="var(--line-strong)" />
      <text x="622" y="112" className="font-mono" fontSize="13" fill="var(--ink)">
        plain manifests
      </text>
      <text x="622" y="132" className="font-mono" fontSize="10" fill="var(--faint)">
        not a brace left in them
      </text>

      <path d="M818 120 L896 120" fill="none" stroke="var(--line-strong)" strokeWidth="1.3" markerEnd="url(#helm-head)" />

      <rect x="902" y="72" width="222" height="96" rx="12" fill="var(--raised)" stroke="var(--line-strong)" />
      <text x="922" y="112" className="font-mono" fontSize="13" fill="var(--ink)">
        kube-apiserver
      </text>
      <text x="922" y="132" className="font-mono" fontSize="10" fill="var(--faint)">
        Deployment, Service, ConfigMap
      </text>

      {/* where Helm's involvement ends */}
      <path d="M326 196 L326 210 L818 210 L818 196" fill="none" stroke="var(--accent)" strokeWidth="1" strokeDasharray="4 4" />
      <text x="572" y="232" textAnchor="middle" className="font-mono" fontSize="11" fill="var(--accent)">
        all of this happens before anything is sent, and the cluster never learns Helm was involved
      </text>
    </svg>
  )
}

export function HelmPrimer() {
  return (
    <div className="mt-14">
      <Reveal>
        <div className="mb-5 flex items-center gap-4">
          <TechIcon tech="helm" size={36} />
        </div>
        <h3 className="max-w-[26ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
          First, what Helm actually is
        </h3>
        <p className="mt-4 max-w-[66ch] text-[15px] leading-relaxed text-muted">
          <Hi>
            {'A Kubernetes manifest is a static file. Two environments means two copies of it, and two copies drift. Helm is a template engine with a package manager attached: you keep one set of files with holes in them, and fill the holes differently per environment.'}
          </Hi>
        </p>
        <p className="mt-4 max-w-[66ch] text-[15px] leading-relaxed text-muted">
          <Hi>
            {'The part that trips people up is where Helm stops. It renders on your machine and sends ordinary Kubernetes objects to the API server. There is no Helm inside the cluster, and kubectl apply on the rendered output would have exactly the same effect.'}
          </Hi>
        </p>
      </Reveal>

      <Reveal delay={0.08} className="mt-8 overflow-hidden rounded-2xl border border-line bg-raised">
        <div className="relative">
          <div className="overflow-x-auto p-5 md:p-8">
            <Pipeline />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-14 lg:hidden"
            style={{ background: 'linear-gradient(to left, var(--raised), transparent)' }}
          />
        </div>
      </Reveal>

      <Reveal delay={0.06} className="mt-8 grid grid-cols-1 gap-x-12 md:grid-cols-2">
        <div>
          {WORDS.slice(0, 3).map(([term, body], i) => (
            <Disclosure key={term} title={term} index={i + 1} defaultOpen={i === 0}>
              <p className="max-w-[54ch] pl-8 text-[14px] leading-relaxed text-muted">
                <Hi>{body}</Hi>
              </p>
            </Disclosure>
          ))}
        </div>
        <div>
          {WORDS.slice(3).map(([term, body], i) => (
            <Disclosure key={term} title={term} index={i + 4}>
              <p className="max-w-[54ch] pl-8 text-[14px] leading-relaxed text-muted">
                <Hi>{body}</Hi>
              </p>
            </Disclosure>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.06} className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[
          ['helm template', 'renders and prints, changes nothing, the command to reach for when you want to see what will happen'],
          ['helm upgrade --install', 'renders and applies, bumps the revision, and only restarts workloads whose pod template actually changed'],
        ].map(([cmd, what]) => (
          <div key={cmd} className="min-w-0 rounded-2xl border border-line bg-raised p-5">
            <div className="overflow-x-auto">
              <code className="font-mono text-[13px] whitespace-nowrap text-ink">
                <span className="mr-2 text-accent select-none">$</span>
                {cmd}
              </code>
            </div>
            <p className="mt-2.5 text-[13px] leading-relaxed text-faint">{what}</p>
          </div>
        ))}
      </Reveal>
    </div>
  )
}
