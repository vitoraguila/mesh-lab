import { motion, useReducedMotion } from 'motion/react'
import { EASE } from '../../lib/motion'

/** Words arrive in reading order, once; the heading stays a single accessible name. */
export function SectionTitle({ children }: { children: string }) {
  const reduce = useReducedMotion()
  const text = children.trim().replace(/\s+/g, ' ')
  return <motion.h2 className="section-title" aria-label={text}
    initial="hidden" whileInView="visible" viewport={{ once: true, amount: .6 }}>
    {text.split(' ').map((word, i) => <span key={`${i}-${word}`} className="title-word" aria-hidden="true">
      <motion.span variants={{ hidden: { y: reduce ? 0 : '105%', opacity: reduce ? 1 : 0 }, visible: { y: 0, opacity: 1 } }}
        transition={{ duration: reduce ? 0 : .65, delay: reduce ? 0 : i * .035, ease: EASE }}>{word}</motion.span>{' '}
    </span>)}
  </motion.h2>
}
