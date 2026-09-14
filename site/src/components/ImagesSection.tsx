import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Reveal } from './ui/Reveal'

gsap.registerPlugin(ScrollTrigger)

type Panel = {
  n: string
  title: string
  body: string
  code: string[]
  foot: string
}

const PANELS: Panel[] = [
  {
    n: '01',
    title: 'Source, with no cluster in it',
    body: 'The catalog service is an ordinary Go module. It reads configuration from environment variables and serves HTTP on a port. It contains no authorization logic and knows nothing about Kubernetes.',
    code: ['apps/catalog/', '  main.go', '  go.mod', '  Dockerfile', '  deploy/'],
    foot: 'Seven services, three languages, same shape.',
  },
  {
    n: '02',
    title: 'A Dockerfile is a recipe, not a machine',
    body: 'Two stages. The first has a full Go toolchain and compiles a static binary. The second starts from scratch, an empty filesystem, and copies in that one file. The toolchain never ships.',
    code: [
      'FROM golang:1.25.5-alpine AS build',
      'RUN CGO_ENABLED=0 go build -o /server .',
      '',
      'FROM scratch',
      'COPY --from=build /server /server',
      'USER 10001:10001',
      'EXPOSE 8080',
    ],
    foot: 'The shipped image has no shell, no package manager and no root user.',
  },
  {
    n: '03',
    title: 'Build turns the recipe into an image',
    body: 'An image is a stack of read-only layers plus metadata: which binary to run, as which user, on which port. It is a file. It does not run, and nothing about staging or production is inside it.',
    code: ['make build APP=catalog', '', '=> [build 4/4] go build', '=> exporting layers', '=> naming to catalog:dev'],
    foot: 'Tag dev is the default. make build TAG=experiment-1 names it differently.',
  },
  {
    n: '04',
    title: 'The node needs the image locally',
    body: 'Normally a cluster pulls from a registry. Minikube can skip that: load the image straight into the node so the pod finds it without any push, pull, credentials or network.',
    code: ['minikube -p mesh-study image load catalog:dev', '', 'kubectl get pod -n stg -l app=catalog', 'catalog-7d9f4b8c6d-xk2p9   2/2   Running'],
    foot: 'imagePullPolicy: IfNotPresent is what makes the local copy win.',
  },
  {
    n: '05',
    title: 'One image, both environments',
    body: 'The exact same catalog:dev is deployed to stg and to prd. Nothing environment-specific was baked in at build time, so promoting a version means pointing an environment at a tag, not rebuilding.',
    code: [
      'apps/catalog/deploy/environments/stg/config.yaml',
      'apps/catalog/deploy/environments/prd/config.yaml',
      '',
      'catalog:',
      '  config:',
      '    SERVICE_VERSION: "v2-experiment"',
    ],
    foot: 'Kubernetes injects the difference at pod creation, as a ConfigMap and a Secret.',
  },
]

export function ImagesSection() {
  const wrapRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const track = trackRef.current
    if (!wrap || !track) return

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const wide = window.matchMedia('(min-width: 1024px)')

    const ctx = gsap.context(() => {
      // Touch and narrow viewports get a native scroll-snap strip instead of a
      // hijack: pinning horizontal scroll on a phone fights the user.
      if (reduce || !wide.matches) return

      const distance = () => track.scrollWidth - window.innerWidth + 80

      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: wrap,
          start: 'top top',
          end: () => `+=${distance()}`,
          pin: true,
          scrub: 1,
          invalidateOnRefresh: true,
        },
      })
    }, wrap)

    const onChange = () => ScrollTrigger.refresh()
    wide.addEventListener('change', onChange)
    return () => {
      wide.removeEventListener('change', onChange)
      ctx.revert()
    }
  }, [])

  return (
    <section
      ref={wrapRef}
      id="images"
      className="relative flex flex-col overflow-hidden border-b border-line bg-sunken lg:h-[100dvh]"
    >
      <div className="mx-auto w-full max-w-[1400px] shrink-0 px-5 pt-20 md:px-10 lg:pt-28">
        <Reveal>
          <h2 className="max-w-[22ch] text-[clamp(1.6rem,3.6vw,2.7rem)] leading-[1.06] font-medium tracking-[-0.03em] text-ink">
            How your code becomes something a cluster can run
          </h2>
          <p className="mt-4 max-w-[58ch] text-[15.5px] leading-relaxed text-muted">
            Five steps from a Go file on your disk to a container running under a scheduler. Nothing
            here is Kubernetes yet.
          </p>
        </Reveal>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto pb-16 lg:overflow-visible lg:pb-0">
        <div
          ref={trackRef}
          className="flex h-full snap-x snap-mandatory items-stretch gap-5 px-5 py-10 md:px-10 lg:snap-none lg:py-12"
        >
          {PANELS.map((p, i) => (
            <article
              key={p.n}
              className="flex w-[min(84vw,420px)] shrink-0 snap-center flex-col justify-between rounded-2xl border border-line bg-raised p-6 lg:w-[440px] lg:p-8"
            >
              <div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[28px] leading-none font-medium text-accent">{p.n}</span>
                  <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                </div>
                <h3 className="mt-5 text-[19px] leading-[1.2] font-medium tracking-[-0.015em] text-ink">
                  {p.title}
                </h3>
                <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{p.body}</p>
              </div>

              <div className="mt-6">
                <div className="overflow-x-auto rounded-xl border border-line bg-sunken p-4">
                  <pre className="font-mono text-[11.5px] leading-[1.75] text-ink">
                    <code>{p.code.join('\n')}</code>
                  </pre>
                </div>
                <p className="mt-3 text-[12.5px] leading-snug text-faint">{p.foot}</p>
              </div>

              <span className="sr-only">{`Step ${i + 1} of ${PANELS.length}`}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
