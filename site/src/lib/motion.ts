import type { Transition, Variants } from 'motion/react'

/** One easing curve for the whole page, so every reveal feels related. */
export const EASE = [0.16, 1, 0.3, 1] as const

export const springSoft: Transition = { type: 'spring', stiffness: 120, damping: 20, mass: 0.6 }

export const riseIn: Variants = {
  hidden: { opacity: 0, y: 26 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
}

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.6, ease: EASE } },
}

export const stagger = (gap = 0.07, delay = 0): Variants => ({
  hidden: {},
  shown: { transition: { staggerChildren: gap, delayChildren: delay } },
})
