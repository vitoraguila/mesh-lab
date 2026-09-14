import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CaretDownIcon } from '@phosphor-icons/react'
import { Reveal } from './ui/Reveal'
import { TechIcon } from './ui/TechIcon'
import { Hi } from '../lib/terms'
import { EASE } from '../lib/motion'
import type { TechKey } from '../lib/techIcons'

gsap.registerPlugin(ScrollTrigger)

const FOLD = 132
const GAP = 12

type Panel = { n: string; tag: string; mark: TechKey; title: string; body: string; code: string[]; foot: string }

const PANELS: Panel[] = [
  {
    n: '01',
    tag: 'Source',
    mark: 'go',
    title: 'Source, with no cluster in it',
    body: 'An ordinary Go module. It reads configuration from environment variables and serves HTTP on a port. No authorization logic, and nothing about Kubernetes.',
    code: ['apps/catalog/', '  main.go', '  go.mod', '  Dockerfile', '  deploy/'],
    foot: 'Seven services, three languages, same shape.',
  },
  {
    n: '02',
    tag: 'Dockerfile',
    mark: 'docker',
    title: 'A Dockerfile is a recipe, not a machine',
    body: 'Two stages. The first has a full Go toolchain and compiles a static binary. The second starts from scratch, an empty filesystem, and copies in that one file.',
    code: [
      'FROM golang:1.25.5-alpine AS build',
      'RUN CGO_ENABLED=0 go build -o /server .',
      '',
      'FROM scratch',
      'COPY --from=build /server /server',
      'USER 10001:10001',
      'EXPOSE 8080',
    ],
    foot: 'No shell, no package manager, no root user in the shipped image.',
  },
  {
    n: '03',
    tag: 'Build',
    mark: 'docker',
    title: 'Build turns the recipe into an image',
    body: 'An image is read-only layers plus metadata: which binary, as which user, on which port. It is a file. It does not run, and nothing about staging is inside it.',
    code: ['make build APP=catalog', '', '=> [build 4/4] go build', '=> exporting layers', '=> naming to catalog:dev'],
    foot: 'Tag dev is the default. TAG=experiment-1 names it differently.',
  },
  {
    n: '04',
    tag: 'Load',
    mark: 'kubernetes',
    title: 'The node needs the image locally',
    body: 'Normally a cluster pulls from a registry. Minikube can skip that: load the image straight into the node, with no push, pull, credentials or network.',
    code: [
      'minikube -p mesh-study image load catalog:dev',
      '',
      'kubectl get pod -n stg -l app=catalog',
      'catalog-7d9f4b8c6d-xk2p9   2/2   Running',
    ],
    foot: 'imagePullPolicy: IfNotPresent is what makes the local copy win.',
  },
  {
    n: '05',
    tag: 'Promote',
    mark: 'helm',
    title: 'One image, both environments',
    body: 'The same catalog:dev is deployed to stg and to prd. Promoting a version means pointing an environment at a tag, not rebuilding anything.',
    code: [
      'apps/catalog/deploy/environments/stg/config.yaml',
      '',
      'catalog:',
      '  config:',
      '    SERVICE_VERSION: "v2-experiment"',
    ],
    foot: 'Kubernetes injects the difference at pod creation.',
  },
]

function Body({ p }: { p: Panel }) {
  return (
    <>
      <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-muted">
        <Hi>{p.body}</Hi>
      </p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-line wash p-4">
        <pre className="font-mono text-[11.5px] leading-[1.8] text-ink">
          <code>{p.code.join('\n')}</code>
        </pre>
      </div>
      <p className="mt-3 max-w-[52ch] text-[12.5px] leading-snug text-faint">
        <Hi>{p.foot}</Hi>
      </p>
    </>
  )
}

export function ImagesSection() {
  const wrapRef = useRef<HTMLElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const [openW, setOpenW] = useState(620)
  const [scrolled, setScrolled] = useState(0)
  const [hovered, setHovered] = useState<number | null>(null)
  const [tapped, setTapped] = useState(0)
  const reduce = useReducedMotion()

  const active = hovered ?? scrolled

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const measure = () => {
      const inner = rail.clientWidth - 40 // the rail's own horizontal padding
      setOpenW(Math.max(360, Math.round(inner - (PANELS.length - 1) * (FOLD + GAP))))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(rail)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const wide = window.matchMedia('(min-width: 1024px)')

    const ctx = gsap.context(() => {
      if (!wide.matches) return
      ScrollTrigger.create({
        trigger: wrap,
        start: 'top top',
        end: () => `+=${PANELS.length * 58}%`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const i = Math.min(PANELS.length - 1, Math.floor(self.progress * PANELS.length))
          setScrolled((cur) => (cur === i ? cur : i))
        },
      })
    }, wrap)

    const refresh = () => ScrollTrigger.refresh()
    wide.addEventListener('change', refresh)
    return () => {
      wide.removeEventListener('change', refresh)
      ctx.revert()
    }
  }, [])

  return (
    <section
      ref={wrapRef}
      id="images"
      style={{ ["--tint" as string]: "#f59f00" }}
      className="wash relative flex flex-col overflow-hidden border-b border-line lg:h-[100dvh]"
    >
      <div className="mx-auto w-full max-w-[1400px] shrink-0 px-5 pt-20 md:px-10 lg:pt-24">
        <Reveal>
          <div className="mb-4 flex items-center gap-4">
            <TechIcon tech="go" size={32} />
            <TechIcon tech="docker" size={32} />
            <TechIcon tech="kubernetes" size={32} />
          </div>
          <h2 className="max-w-[22ch] text-[clamp(1.6rem,3.4vw,2.6rem)] leading-[1.06] font-medium tracking-[-0.03em] text-ink">
            How your code becomes something a cluster can run
          </h2>
          <p className="mt-4 max-w-[56ch] text-[15.5px] leading-relaxed text-muted">
            <Hi>{'Five steps from a Go file on your disk to a container running under a scheduler.'}</Hi>
          </p>
        </Reveal>
      </div>

      {/* Desktop: one panel open, the rest folded to a spine. Widths are measured
          so the open panel's content is laid out once and never reflows mid-transition,
          which is what made this stutter. */}
      <div
        ref={railRef}
        className="mx-auto hidden w-full max-w-[1400px] min-h-0 flex-1 items-center px-5 md:px-10 lg:flex"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="flex h-[min(520px,58vh)] w-full gap-3">
          {PANELS.map((p, i) => {
            const on = i === active
            return (
              <article
                key={p.n}
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
                tabIndex={0}
                aria-current={on ? 'true' : undefined}
                style={{
                  width: on ? openW : FOLD,
                  transition: reduce ? 'none' : 'width 520ms cubic-bezier(0.16,1,0.3,1), border-color 300ms',
                }}
                className={`relative shrink-0 cursor-pointer overflow-hidden rounded-2xl border ${
                  on ? 'border-accent bg-raised' : 'border-line bg-raised/70 hover:border-line-strong'
                }`}
              >
                {/* folded face */}
                <div
                  aria-hidden={on}
                  style={{ width: FOLD, transition: reduce ? 'none' : 'opacity 220ms' }}
                  className={`absolute inset-y-0 left-0 flex flex-col justify-between p-5 ${
                    on ? 'pointer-events-none opacity-0' : 'opacity-100'
                  }`}
                >
                  <span className="font-mono text-[26px] leading-none font-medium text-faint">{p.n}</span>
                  <span>
                    <TechIcon tech={p.mark} size={26} />
                    <span className="mt-3 block text-[14px] font-medium text-muted">{p.tag}</span>
                  </span>
                </div>

                {/* open face, laid out at its final width from the start */}
                <div
                  aria-hidden={!on}
                  style={{
                    width: openW,
                    transition: reduce ? 'none' : 'opacity 260ms 140ms',
                  }}
                  className={`absolute inset-y-0 left-0 overflow-y-auto p-7 ${
                    on ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[26px] leading-none font-medium text-accent">{p.n}</span>
                    <span className="h-px flex-1" style={{ background: 'var(--line)' }} />
                    <TechIcon tech={p.mark} size={28} />
                  </div>
                  <h3 className="mt-5 max-w-[24ch] text-[19px] leading-[1.2] font-medium tracking-[-0.015em] text-ink">
                    {p.title}
                  </h3>
                  <Body p={p} />
                </div>
              </article>
            )
          })}
        </div>
      </div>

      {/* Narrow screens: the same five, as a tap-to-open stack. */}
      <div className="mx-auto w-full max-w-[1400px] px-5 py-12 md:px-10 lg:hidden">
        <div className="flex flex-col gap-3">
          {PANELS.map((p, i) => {
            const on = i === tapped
            return (
              <article
                key={p.n}
                className={`overflow-hidden rounded-2xl border transition-colors ${
                  on ? 'border-accent bg-raised' : 'border-line bg-raised/70'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={on}
                  onClick={() => setTapped(i)}
                  className="flex w-full items-center gap-3 p-5 text-left"
                >
                  <span className={`font-mono text-[20px] leading-none ${on ? 'text-accent' : 'text-faint'}`}>
                    {p.n}
                  </span>
                  <span className="flex-1 text-[15.5px] font-medium text-ink">{p.title}</span>
                  <TechIcon tech={p.mark} size={22} />
                  <motion.span animate={{ rotate: on ? 180 : 0 }} className="text-faint">
                    <CaretDownIcon size={14} weight="bold" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {on && (
                    <motion.div
                      initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: 0.34, ease: EASE }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5">
                        <Body p={p} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
