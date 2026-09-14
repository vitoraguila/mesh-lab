import type { ReactNode } from 'react'

const SWEEP =
  'linear-gradient(to right, var(--sweep-1), var(--sweep-2) 38%, var(--sweep-3) 68%, var(--sweep-4))'

/**
 * The page's one loud moment. The band takes its height from its children, so
 * the gradient can never run out from under the text, and its top edge is a
 * shallow dome carved in the page's own ground colour.
 */
export function CurveBand({ children }: { children: ReactNode }) {
  return (
    <div className="relative overflow-hidden" style={{ background: SWEEP }}>
      <svg
        aria-hidden
        className="absolute inset-x-0 top-0 h-[120px] w-full"
        preserveAspectRatio="none"
        viewBox="0 0 1440 120"
      >
        <path d="M0 0 L1440 0 L1440 120 Q720 -100 0 120 Z" fill="var(--canvas)" />
      </svg>
      <div className="relative">{children}</div>
    </div>
  )
}

/**
 * Carries the same gradient on past the band and dissolves it into the page,
 * so the colour continues into the next block instead of stopping at an edge.
 */
export function SweepFade({ children, height = 560 }: { children: ReactNode; height?: number }) {
  const mask = 'linear-gradient(180deg, #000 0%, rgb(0 0 0 / 0.55) 38%, transparent 100%)'
  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0"
        style={{
          height,
          background: SWEEP,
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  )
}
