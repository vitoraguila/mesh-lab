import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownIcon, TerminalWindowIcon } from '@phosphor-icons/react'
import { HeroTopology } from './HeroTopology'
import { EASE } from '../lib/motion'

const WORDS = ['One request.', 'Every layer', 'it crosses.']

export function Hero() {
  const reduce = useReducedMotion()

  return (
    <section
      id="top"
      className="relative flex min-h-[100dvh] items-center overflow-hidden bg-blueprint pt-24 pb-16"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-18%] left-[52%] size-[680px] rounded-full opacity-60 blur-[130px]"
        style={{ background: 'var(--glow)' }}
      />

      <div className="relative mx-auto grid w-full max-w-[1400px] grid-cols-1 items-center gap-14 px-5 md:px-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div>
          <h1 className="text-[clamp(2.6rem,7vw,4.6rem)] leading-[1.03] font-medium tracking-[-0.035em] text-ink">
            {WORDS.map((word, i) => (
              <motion.span
                key={word}
                className="block"
                initial={reduce ? false : { opacity: 0, y: 34 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, delay: 0.08 * i, ease: EASE }}
              >
                {i === 1 ? (
                  <>
                    Every <span className="text-accent">layer</span>
                  </>
                ) : (
                  word
                )}
              </motion.span>
            ))}
          </h1>

          <motion.p
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.34, ease: EASE }}
            className="mt-7 max-w-[52ch] text-[17px] leading-relaxed text-muted md:text-[18px]"
          >
            Containers, pods, nodes, Helm, Istio and Envoy, explained by following one call through a
            cluster you can run tonight.
          </motion.p>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.44, ease: EASE }}
            className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <a
              href="#layers"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium whitespace-nowrap text-on-accent transition-colors duration-200 hover:bg-accent-quiet active:translate-y-px"
              style={{ boxShadow: '0 14px 40px -18px var(--glow)' }}
            >
              Start the walkthrough
              <ArrowDownIcon size={15} weight="bold" />
            </a>
            <a
              href="#install"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-line-strong px-7 py-3.5 text-sm font-medium whitespace-nowrap text-ink transition-colors duration-200 hover:border-accent hover:text-accent active:translate-y-px"
            >
              <TerminalWindowIcon size={16} />
              Run it locally
            </a>
          </motion.div>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, delay: 0.2, ease: EASE }}
          className="flex justify-center lg:justify-end"
        >
          <HeroTopology />
        </motion.div>
      </div>

      <div id="nav-sentinel" className="absolute top-[72px] left-0 h-px w-px" />
    </section>
  )
}
