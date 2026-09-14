import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CaretDownIcon } from '@phosphor-icons/react'
import { EASE } from '../../lib/motion'

/**
 * One row of an accordion. Everything long on this page hides behind one of
 * these, so a section reads as a list of questions rather than a wall.
 */
export function Disclosure({
  title,
  index,
  children,
  defaultOpen = false,
  aside,
}: {
  title: string
  index?: number
  children: ReactNode
  defaultOpen?: boolean
  aside?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()
  const reduce = useReducedMotion()

  return (
    <div className="border-b border-line last:border-b-0">
      <h4>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((v) => !v)}
          className="group flex w-full items-center gap-3 py-4 text-left"
        >
          {index !== undefined && (
            <span className="font-mono text-[11px] text-accent tabular-nums">
              {String(index).padStart(2, '0')}
            </span>
          )}
          <span className="flex-1 text-[15.5px] font-medium text-ink transition-colors group-hover:text-accent">
            {title}
          </span>
          {aside}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
            className="shrink-0 text-faint transition-colors group-hover:text-accent"
          >
            <CaretDownIcon size={15} weight="bold" />
          </motion.span>
        </button>
      </h4>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            key="body"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.34, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
