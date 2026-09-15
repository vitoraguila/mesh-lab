import { SectionsMenu } from './SectionsMenu'
import { useCallback, useEffect, useState } from 'react'
import { motion, useReducedMotion, useScroll } from 'motion/react'
import { ListIcon, MoonIcon, SunIcon, ArrowUpRightIcon } from '@phosphor-icons/react'
import { useTheme } from '../hooks/useTheme'
import { EASE } from '../lib/motion'
import { SECTIONS } from '../lib/sections'
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
        setActive(inView.length ? inView[inView.length - 1].id : '')
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: 0 },
    )
    nodes.forEach((n) => io.observe(n))
    return () => io.disconnect()
  }, [])

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
        <div className={`nav-shell ${lifted ? 'nav-shell-lifted' : ''}`}>
          <nav className="nav-inner" aria-label="Main navigation">
            <a href="#top" className="flex shrink-0 items-center gap-2.5" aria-label="Mesh Lab, back to top">
              <MeshMark />
              <span className="nav-wordmark">mesh-lab</span>
            </a>

            {/* Where you are, and which technologies this part is about. */}
            {current ? (
              <p className="nav-location" aria-live="polite">
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
              <span className="nav-idle">Free learning lab. No signup.</span>
            )}

            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={toggle}
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                className="icon-control theme-control"
              >
                {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
              </button>

              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                aria-controls="section-menu"
                aria-label="Sections"
                aria-haspopup="dialog"
                className="sections-trigger"
              >
                <ListIcon size={19} weight="bold" />
                <span>Sections</span>
              </button>

              <button
                type="button"
                onClick={() => go('install')}
                className="action-button nav-run"
              >
                Run it locally <ArrowUpRightIcon size={19} />
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

      <SectionsMenu open={open} active={active} onClose={() => setOpen(false)} onGo={go} />
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
