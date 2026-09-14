import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { MoonIcon, SunIcon } from '@phosphor-icons/react'
import { useTheme } from '../hooks/useTheme'
import { EASE } from '../lib/motion'

const LINKS = [
  { href: '#layers', label: 'Layers' },
  { href: '#images', label: 'Images' },
  { href: '#objects', label: 'Objects' },
  { href: '#mesh', label: 'Mesh' },
  { href: '#journey', label: 'Request' },
  { href: '#install', label: 'Install' },
]

export function Nav() {
  const { theme, toggle } = useTheme()
  const [lifted, setLifted] = useState(false)
  const reduce = useReducedMotion()

  // IntersectionObserver on a sentinel instead of a scroll listener.
  useEffect(() => {
    const sentinel = document.getElementById('nav-sentinel')
    if (!sentinel) return
    const io = new IntersectionObserver(([entry]) => setLifted(!entry.isIntersecting), {
      rootMargin: '-8px 0px 0px 0px',
    })
    io.observe(sentinel)
    return () => io.disconnect()
  }, [])

  return (
    <motion.header
      initial={reduce ? false : { y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
      className="fixed inset-x-0 top-0 z-40"
    >
      <div
        className={`transition-[background-color,border-color,backdrop-filter] duration-300 ${
          lifted ? 'border-b border-line bg-canvas/80 backdrop-blur-xl' : 'border-b border-transparent'
        }`}
      >
        <nav className="mx-auto flex h-[68px] max-w-[1400px] items-center justify-between gap-6 px-5 md:px-10">
          <a href="#top" className="flex items-center gap-2.5" aria-label="Mesh Lab, back to top">
            <MeshMark />
            <span className="font-mono text-[13px] font-medium tracking-tight text-ink">mesh-lab</span>
          </a>

          <ul className="hidden items-center gap-7 lg:flex">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="text-[13.5px] text-muted transition-colors hover:text-ink"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {theme === 'dark' ? <SunIcon size={16} /> : <MoonIcon size={16} />}
            </button>
            <a
              href="#install"
              className="rounded-full bg-accent px-4 py-2 text-[13px] font-medium whitespace-nowrap text-on-accent transition-colors hover:bg-accent-quiet"
            >
              Run it locally
            </a>
          </div>
        </nav>
      </div>
    </motion.header>
  )
}

/** The project mark: three meshed nodes. The only drawn glyph on the page. */
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
