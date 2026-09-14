import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { EASE } from '../../lib/motion'

type Props = {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'header' | 'article' | 'figure'
  amount?: number
}

/**
 * Scroll reveal. Every section entrance uses this one component so the
 * page reads as a single continuous document rather than a stack of effects.
 */
export function Reveal({ children, delay = 0, y = 24, className, as = 'div', amount = 0.25 }: Props) {
  const reduce = useReducedMotion()
  const Tag = motion[as]
  return (
    <Tag
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.72, delay, ease: EASE }}
    >
      {children}
    </Tag>
  )
}
