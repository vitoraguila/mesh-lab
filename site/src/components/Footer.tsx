import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { Reveal } from './ui/Reveal'
import { Hi } from '../lib/terms'

const READING = [
  ['Istio delegation', 'https://istio.io/latest/docs/reference/config/networking/virtual-service/#Delegate'],
  ['Istio authorization', 'https://istio.io/latest/docs/concepts/security/#authorization'],
  ['Pods', 'https://kubernetes.io/docs/concepts/workloads/pods/'],
  ['Helm chart structure', 'https://helm.sh/docs/topics/charts/'],
  ['Envoy architecture', 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/intro/intro'],
  ['Minikube', 'https://minikube.sigs.k8s.io/docs/start/'],
]

export function Footer() {
  return (
    <footer className="bg-canvas py-20 lg:py-24">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              <h2 className="max-w-[16ch] text-[clamp(1.8rem,4vw,2.8rem)] leading-[1.08] font-medium tracking-[-0.03em] text-ink">
                Most of it only makes sense once you break it
              </h2>
              <p className="mt-5 max-w-[52ch] text-[15.5px] leading-relaxed text-muted">
                <Hi>
                  {'Delete a pod and watch it come back. Remove the CUSTOM policy and watch a reader reach orders. Stop authz and watch every service answer 503. The cluster is local, and nothing you do to it costs anything.'}
                </Hi>
              </p>
              <a
                href="#install"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium whitespace-nowrap text-on-accent transition-colors hover:bg-accent-quiet active:translate-y-px"
              >
                Run it locally
              </a>
            </div>

            <nav aria-label="Further reading">
              <h3 className="font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
                Primary sources
              </h3>
              <ul className="mt-6 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {READING.map(([label, href]) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-1.5 text-[14.5px] text-muted transition-colors hover:text-accent"
                    >
                      {label}
                      <ArrowUpRightIcon size={13} className="opacity-50 transition-opacity group-hover:opacity-100" />
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </Reveal>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-faint">
            Mesh Lab. A runnable local Kubernetes case study.
          </p>
          <p className="font-mono text-[12px] text-faint">
            stg and prd are namespaces, not clusters
          </p>
        </div>
      </div>
    </footer>
  )
}
