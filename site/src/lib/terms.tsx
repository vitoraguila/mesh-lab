import { Fragment, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowUpRightIcon } from '@phosphor-icons/react'
import { TERM_INFO } from './termInfo'
import { TechIcon } from '../components/ui/TechIcon'
import { EASE } from './motion'

const TERMS = Object.keys(TERM_INFO).sort((a, b) => b.length - a.length)
const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const RE = new RegExp(`(?<![\\w-])(${TERMS.map(escape).join('|')})(?![\\w-])`, 'g')
const SET = new Set(TERMS)

type Pos = { x: number; y: number; place: 'above' | 'below' }

/** A marked term. Hovering, focusing or tapping opens its definition. */
function Term({ term }: { term: string }) {
  const info = TERM_INFO[term]
  const ref = useRef<HTMLButtonElement>(null)
  const closeTimer = useRef<number | undefined>(undefined)
  const [pos, setPos] = useState<Pos | null>(null)
  const id = useId()
  const reduce = useReducedMotion()

  const open = useCallback(() => {
    window.clearTimeout(closeTimer.current)
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const room = r.top
    const place: Pos['place'] = room > 210 ? 'above' : 'below'
    setPos({
      x: Math.min(Math.max(r.left + r.width / 2, 160), window.innerWidth - 160),
      y: place === 'above' ? r.top - 10 : r.bottom + 10,
      place,
    })
  }, [])

  const close = useCallback((delay = 120) => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setPos(null), delay)
  }, [])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  useEffect(() => {
    if (!pos) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPos(null)
    const onScroll = () => setPos(null)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true, once: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
    }
  }, [pos])

  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-describedby={pos ? id : undefined}
        aria-label={`${term}, show definition`}
        onMouseEnter={open}
        onMouseLeave={() => close()}
        onFocus={open}
        onBlur={() => close(0)}
        onClick={() => (pos ? setPos(null) : open())}
        className="rounded-[5px] bg-accent-soft px-[3px] py-[1px] font-medium text-accent decoration-accent/40 underline-offset-[3px] transition-colors hover:bg-accent hover:text-on-accent focus-visible:bg-accent focus-visible:text-on-accent"
      >
        {term}
      </button>

      {pos &&
        createPortal(
          <AnimatePresence>
            <motion.div
              id={id}
              role="tooltip"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: pos.place === 'above' ? 6 : -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: EASE }}
              onMouseEnter={() => window.clearTimeout(closeTimer.current)}
              onMouseLeave={() => close()}
              style={{
                position: 'fixed',
                left: pos.x,
                top: pos.y,
                transform: `translate(-50%, ${pos.place === 'above' ? '-100%' : '0'})`,
                zIndex: 60,
              }}
              className="w-[300px] rounded-xl border border-line-strong bg-raised p-4 shadow-[0_18px_50px_-20px_rgb(0_0_0/0.55)]"
            >
              <span className="flex items-center gap-2">
                {info.tech && <TechIcon tech={info.tech} size={16} label={false} />}
                <span className="font-mono text-[12px] font-medium text-accent">{term}</span>
              </span>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{info.body}</p>
              {info.href && (
                <a
                  href={info.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-ink transition-colors hover:text-accent"
                >
                  {info.source}
                  <ArrowUpRightIcon size={12} />
                </a>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body,
        )}
    </>
  )
}

/** Marks every known term inside a plain string. */
export function Hi({ children }: { children: string }) {
  return (
    <>
      {children.split(RE).map((part, i) =>
        SET.has(part) ? <Term key={i} term={part} /> : <Fragment key={i}>{part}</Fragment>,
      )}
    </>
  )
}
