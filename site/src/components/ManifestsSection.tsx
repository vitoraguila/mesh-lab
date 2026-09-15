import { SectionTitle } from './ui/SectionTitle'
import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FileCodeIcon, FolderOpenIcon } from '@phosphor-icons/react'
import { Reveal } from './ui/Reveal'
import { HelmPrimer } from './HelmPrimer'
import { Code } from './ui/Code'
import { TechIcon } from './ui/TechIcon'
import { Hi } from '../lib/terms'
import { GROUPS, LAYERS } from '../lib/manifests'
import { EASE } from '../lib/motion'

const ALL = GROUPS.flatMap((g) => g.items)

export function ManifestsSection() {
  const [id, setId] = useState('deployment')
  const [view, setView] = useState<'template' | 'rendered'>('template')
  const reduce = useReducedMotion()

  const active = useMemo(() => ALL.find((m) => m.id === id) ?? ALL[0], [id])
  const canRender = Boolean(active.rendered)
  const showing = canRender && view === 'rendered' ? active.rendered! : active.template

  return (
    <section id="manifests" className="border-b border-line bg-canvas py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <div className="mb-5 flex items-center gap-4">
            <TechIcon tech="helm" size={40} />
            <TechIcon tech="kubernetes" size={40} />
          </div>
          <SectionTitle>
            Open the files. Connect the dots.
          </SectionTitle>
          <p className="mt-5 max-w-[64ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Every behaviour described on this page is a file in the repository. Pick one and flip between the Helm template and what it renders to for staging. The accent marks what a value supplied.'}
            </Hi>
          </p>
        </Reveal>

        <HelmPrimer />

        <div className="mt-16 grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr] lg:gap-6">
          {/* the real folder layout, clickable */}
          <Reveal className="rounded-2xl border border-line bg-raised p-4 lg:sticky lg:top-24 lg:self-start lg:p-5">
            {GROUPS.map((g, gi) => (
              <div key={g.label} className={gi ? 'mt-6' : ''}>
                <p className="flex items-center gap-2 font-mono text-[11.5px] text-accent">
                  <FolderOpenIcon size={14} weight="fill" />
                  {g.label}
                </p>
                <p className="mt-1.5 mb-2.5 text-[12px] leading-snug text-faint">{g.caption}</p>
                <ul className="flex flex-col gap-0.5">
                  {g.items.map((m) => {
                    const on = m.id === active.id
                    return (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setId(m.id)
                            setView('template')
                          }}
                          aria-current={on ? 'true' : undefined}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-mono text-[11.5px] transition-colors duration-200 ${
                            on ? 'bg-accent-soft text-accent' : 'text-muted hover:bg-sunken hover:text-ink'
                          }`}
                        >
                          <FileCodeIcon size={13} className="shrink-0" />
                          <span className="truncate">{m.file}</span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </Reveal>

          <Reveal delay={0.08} className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-line bg-sunken">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised/60 px-4 py-3">
                <span className="flex min-w-0 items-center gap-2.5">
                  <TechIcon tech={active.tech} size={18} />
                  <code className="truncate font-mono text-[11.5px] text-faint">
                    {active.dir}/<span className="text-ink">{active.file}</span>
                  </code>
                </span>

                {canRender ? (
                  <div
                    role="tablist"
                    aria-label="Template or rendered output"
                    className="flex shrink-0 gap-1 rounded-full border border-line p-0.5"
                  >
                    {(['template', 'rendered'] as const).map((v) => (
                      <button
                        key={v}
                        role="tab"
                        aria-selected={view === v}
                        type="button"
                        onClick={() => setView(v)}
                        className={`rounded-full px-3 py-1 font-mono text-[11px] transition-colors duration-200 ${
                          view === v ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'
                        }`}
                      >
                        {v === 'template' ? 'template' : 'rendered, stg'}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="shrink-0 font-mono text-[11px] text-faint">no templating in this one</span>
                )}
              </div>

              <div className="overflow-x-auto p-4 md:p-6">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={`${active.id}-${canRender ? view : 'x'}`}
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                    transition={{ duration: 0.28, ease: EASE }}
                  >
                    <Code code={showing} />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.id}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.34, ease: EASE }}
                className="mt-4 rounded-2xl border border-line bg-raised p-5 md:p-6"
              >
                <h3 className="text-[17px] font-medium tracking-[-0.015em] text-ink">{active.pattern}</h3>
                <p className="mt-2.5 max-w-[72ch] text-[14.5px] leading-relaxed text-muted">
                  <Hi>{active.note}</Hi>
                </p>
              </motion.div>
            </AnimatePresence>
          </Reveal>
        </div>

        {/* how a value reaches a container */}
        <div className="mt-16">
          <Reveal>
            <h3 className="max-w-[28ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
              Five inputs, merged in order, later wins
            </h3>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted">
              <Hi>
                {'Helm merges these into one set of values, renders the templates, and Kubernetes injects the result at pod creation. The image never learns which environment it is in.'}
              </Hi>
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-8 rounded-2xl border border-line bg-raised p-5 md:p-8">
            <ol className="flex flex-col gap-3">
              {LAYERS.map((l) => (
                <li key={l.n} className="grid grid-cols-[28px_1fr] items-start gap-3 md:grid-cols-[28px_minmax(0,26rem)_1fr] md:items-baseline md:gap-5">
                  <span className="font-mono text-[12px] text-accent tabular-nums">{l.n}</span>
                  <code className="min-w-0 overflow-x-auto font-mono text-[12.5px] whitespace-nowrap text-ink">
                    {l.source}
                  </code>
                  <span className="col-start-2 text-[13px] text-faint md:col-start-3">{l.what}</span>
                </li>
              ))}
            </ol>

            <div className="mt-7 flex flex-wrap items-center gap-2.5 border-t border-line pt-6 font-mono text-[12px]">
              {['merged values', 'rendered manifests', 'ConfigMap and Secret', 'container environment'].map(
                (step, i) => (
                  <span key={step} className="flex items-center gap-2.5">
                    {i > 0 && <span className="text-faint">to</span>}
                    <span
                      className={
                        i === 3
                          ? 'rounded-lg bg-accent-soft px-2.5 py-1.5 text-accent'
                          : 'rounded-lg border border-line px-2.5 py-1.5 text-muted'
                      }
                    >
                      {step}
                    </span>
                  </span>
                ),
              )}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
