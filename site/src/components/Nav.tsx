import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll } from 'motion/react'
import { ListIcon, MoonIcon, SunIcon, XIcon } from '@phosphor-icons/react'
import { useTheme } from '../hooks/useTheme'
import { EASE } from '../lib/motion'
import { CATEGORIES, SECTIONS } from '../lib/sections'
import { TechIcon } from './ui/TechIcon'

export function Nav() {
  const { theme, toggle } = useTheme()
  const [lifted, setLifted] = useState(false)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')
  // Read once during the first render, before the effect below writes a hash of
  // its own. Otherwise the page deep-links itself past the hero on load.
  const [initialHash] = useState(() => window.location.hash.slice(1))
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll()

  const activeIndex = SECTIONS.findIndex((s) => s.id === active)
  const current = activeIndex >= 0 ? SECTIONS[activeIndex] : null

  useEffect(() => {
    const sentinel = document.getElementById('nav-sentinel')
    if (!sentinel) return
    const io = new IntersectionObserver(([e]) => setLifted(!e.isIntersecting), {
      rootMargin: '-8px 0px 0px 0px',
    })
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])

  // Whichever section owns the band just under the bar is the active one.
  useEffect(() => {
    const nodes = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (n): n is HTMLElement => Boolean(n),
    )
    if (!nodes.length) return
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        const inView = SECTIONS.filter((s) => seen.get(s.id))
        if (inView.length) setActive(inView[inView.length - 1].id)
      },
      { rootMargin: '-68px 0px -55% 0px', threshold: 0 },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  const go = useCallback((id: string) => {
    setOpen(false)
    const el = document.getElementById(id)
    if (!el) return
    history.pushState(null, '', `#${id}`)
    el.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    })
  }, [])

  // Reading past a heading rewrites the hash, so the address bar is always a
  // link to what is on screen. replaceState keeps the back button usable.
  useEffect(() => {
    const next = active ? `#${active}` : window.location.pathname + window.location.search
    if (active ? window.location.hash !== next : window.location.hash) {
      history.replaceState(null, '', next)
    }
  }, [active])

  // A hash typed or pasted before the page finished laying out.
  useEffect(() => {
    if (!initialHash || !SECTIONS.some((s) => s.id === initialHash)) return
    const t = window.setTimeout(() => {
      document.getElementById(initialHash)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }, 120)
    return () => window.clearTimeout(t)
  }, [initialHash])

  // Back and forward move through the sections.
  useEffect(() => {
    const onPop = () => {
      const id = window.location.hash.slice(1)
      if (id) document.getElementById(id)?.scrollIntoView({ behavior: 'auto', block: 'start' })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <>
      <motion.header
        initial={reduce ? false : { y: -70, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        className="fixed inset-x-0 top-0 z-40"
      >
        <div
          className={`transition-[background-color,border-color,backdrop-filter] duration-300 ${
            lifted || open
              ? 'border-b border-line bg-canvas/85 backdrop-blur-xl'
              : 'border-b border-transparent'
          }`}
        >
          <nav className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-5 px-5 md:px-10">
            <a href="#top" className="flex shrink-0 items-center gap-2.5" aria-label="Mesh Lab, back to top">
              <MeshMark />
              <span className="font-mono text-[13px] font-medium tracking-tight text-ink">mesh-lab</span>
            </a>

            {/* Where you are, and which technologies this part is about. */}
            {current ? (
              <p className="hidden min-w-0 items-center gap-3 md:flex" aria-live="polite">
                <span className="font-mono text-[11px] text-faint">
                  {String(activeIndex + 1).padStart(2, '0')} / {String(SECTIONS.length).padStart(2, '0')}
                </span>
                <span className="truncate text-[13.5px] text-muted">{current.label}</span>
                <span className="hidden items-center gap-2 lg:flex">
                  {current.techs.map((t) => (
                    <TechIcon key={t} tech={t} size={17} label={false} />
                  ))}
                </span>
              </p>
            ) : (
              <span className="hidden md:block" />
            )}

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
              >
                {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              </button>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="section-menu"
                className="inline-flex items-center gap-2 rounded-full border border-line-strong px-3.5 py-2 text-[13px] text-ink transition-colors hover:border-accent hover:text-accent md:px-4"
              >
                {open ? <XIcon size={15} weight="bold" /> : <ListIcon size={15} weight="bold" />}
                <span className="hidden sm:inline">{open ? 'Close' : 'Sections'}</span>
              </button>

              <button
                type="button"
                onClick={() => go('install')}
                className="hidden rounded-full bg-accent px-4 py-2 text-[13px] font-medium whitespace-nowrap text-on-accent transition-colors hover:bg-accent-quiet sm:block"
              >
                Run it locally
              </button>
            </div>
          </nav>
        </div>

        <motion.div
          aria-hidden
          className="h-px origin-left"
          style={{ scaleX: scrollYProgress, background: 'var(--accent)' }}
        />
      </motion.header>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close the section menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-30 cursor-default bg-canvas/70 backdrop-blur-sm"
            />
            <motion.div
              id="section-menu"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -14 }}
              transition={{ duration: 0.34, ease: EASE }}
              className="fixed inset-x-0 top-[69px] z-40 max-h-[calc(100dvh-69px)] overflow-y-auto border-b border-line bg-raised"
            >
              <div className="mx-auto max-w-[1400px] px-5 py-7 md:px-10 md:py-10">
                <p className="mb-7 font-mono text-[11px] tracking-[0.16em] text-faint uppercase">
                  Pick a technology
                </p>

                <div className="grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
                  {CATEGORIES.map((cat) => (
                    <div key={cat.name}>
                      <h2 className="text-[14px] font-medium text-ink">{cat.name}</h2>
                      <p className="mt-0.5 mb-3.5 text-[12px] text-faint">{cat.hint}</p>
                      <ul className="flex flex-col gap-1.5">
                        {cat.entries.map((e) => {
                          const on = active === e.id
                          return (
                            <li key={e.id}>
                              <button
                                type="button"
                                onClick={() => go(e.id)}
                                aria-current={on ? 'true' : undefined}
                                className={`w-full rounded-xl border p-3.5 text-left transition-colors duration-200 ${
                                  on
                                    ? 'border-accent bg-accent-soft'
                                    : 'border-line hover:border-line-strong hover:bg-sunken'
                                }`}
                              >
                                <span className="flex h-7 items-center gap-2.5">
                                  {e.techs.map((t) => (
                                    <TechIcon key={t} tech={t} size={22} label={false} />
                                  ))}
                                </span>
                                <span
                                  className={`mt-2.5 block text-[14px] font-medium ${
                                    on ? 'text-accent' : 'text-ink'
                                  }`}
                                >
                                  {e.label}
                                </span>
                                <span className="mt-1 block text-[12.5px] leading-snug text-faint">
                                  {e.blurb}
                                </span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

/** The project mark: three meshed nodes. */
function MeshMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3.2 3.4 15.8h13.2L10 3.2Z" stroke="var(--accent)" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="10" cy="3.2" r="2" fill="var(--canvas)" stroke="var(--accent)" strokeWidth="1.4" />
      <circle cx="3.4" cy="15.8" r="2" fill="var(--canvas)" stroke="var(--accent)" strokeWidth="1.4" />
      <circle cx="16.6" cy="15.8" r="2" fill="var(--canvas)" stroke="var(--accent)" strokeWidth="1.4" />
    </svg>
  )
}
