import { useEffect, useRef } from 'react'
import { ArrowDownRightIcon, ArrowUpRightIcon, XIcon, StackIcon } from '@phosphor-icons/react'
import { CATEGORIES } from '../lib/sections'
import { TechIcon } from './ui/TechIcon'

/** Native modal semantics give the chapter index focus containment and Escape. */
export function SectionsMenu({ open, active, onClose, onGo }: {
  open: boolean; active: string; onClose: () => void; onGo: (id: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !open) return
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      previous?.focus({ preventScroll: true })
    }
  }, [open])

  return <dialog ref={ref} id="section-menu" className="sections-dialog" aria-labelledby="sections-title"
    onKeyDown={event => {
      if (event.key !== 'Tab') return
      const controls = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}
    onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className="sections-content">
      <header className="sections-heading">
        <div><p>The Mesh Lab guide</p><h2 id="sections-title">Find your next aha.</h2></div>
        <button type="button" onClick={onClose} className="icon-control" aria-label="Close sections"><XIcon size={22} /></button>
      </header>
      <nav className="sections-layout" aria-label="Guide chapters">
        <button type="button" className="menu-start" onClick={() => onGo('overview')} aria-current={active === 'overview' ? 'location' : undefined}>
          <StackIcon size={48} weight="duotone" aria-hidden="true" />
          <span className="menu-start-label">Start here</span>
          <strong>First, the<br />{' '}big picture.</strong>
          <span className="menu-start-description">Everything that runs, and how it connects. Start with the map.</span>
          <span className="menu-start-action">Explore the architecture <ArrowDownRightIcon size={26} /></span>
        </button>
        <div className="menu-chapters">
          {CATEGORIES.slice(1).map((category, i) => <section key={category.name} className={`menu-category menu-color-${i % 3}`}>
            <div className="menu-category-heading"><span className="menu-tech"><TechIcon tech={category.entries[0].techs[0]} size={22} /></span><h3>{category.name}</h3></div>
            <p>{category.hint}</p>
            <ul>{category.entries.map(entry => <li key={entry.id}>
              <button type="button" onClick={() => onGo(entry.id)} aria-current={active === entry.id ? 'location' : undefined}>
                <span>{entry.label}</span><ArrowUpRightIcon size={18} aria-hidden="true" />
              </button>
            </li>)}</ul>
          </section>)}
        </div>
      </nav>
      <div className="sections-footer"><span>Explore at your own pace. Every example comes from this project.</span><button type="button" onClick={() => onGo('journey')}>Jump to the experiment <ArrowUpRightIcon size={18} /></button></div>
    </div>
  </dialog>
}
