import type { ReactNode } from 'react'

/** A peach chapter opening with a rounded edge and a decorative ring. */
export function CurveBand({ children }: { children: ReactNode }) {
  return <div className="event-chapter">{children}</div>
}

export function SweepFade({ children }: { children: ReactNode; height?: number }) {
  return <div className="relative">{children}</div>
}
