import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { EASE } from '../../lib/motion'
import { TechGlyph } from './TechIcon'

const ip = () => `10.244.0.${Math.floor(Math.random() * 240) + 8}`

/** A Service keeps its name while the addresses behind it keep changing. */
export function ServiceResolve() {
  const reduce = useReducedMotion()
  const [ips, setIps] = useState(['10.244.0.31', '10.244.0.58'])

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setIps(([, keep]) => [keep, ip()]), 3200)
    return () => window.clearInterval(id)
  }, [reduce])

  return (
    <div className="mt-6 rounded-xl border border-line bg-sunken p-4">
      <div className="flex items-center justify-between gap-3">
        <code className="min-w-0 truncate font-mono text-[11.5px] text-accent">
          catalog.stg.svc.cluster.local
        </code>
        <span className="shrink-0 font-mono text-[10.5px] text-faint">never changes</span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <span className="h-px w-4 shrink-0" style={{ background: 'var(--line-strong)' }} />
        <div className="flex min-w-0 flex-1 gap-2">
          <AnimatePresence mode="popLayout" initial={false}>
            {ips.map((addr) => (
              <motion.span
                key={addr}
                layout
                initial={reduce ? false : { opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.45, ease: EASE }}
                className="min-w-0 flex-1 truncate rounded-lg border border-line bg-raised px-2.5 py-2 font-mono text-[10.5px] text-ink"
              >
                {addr}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <p className="mt-3 font-mono text-[10.5px] text-faint">
        {reduce ? 'endpoints change on every rollout' : 'endpoints, rewritten on every rollout'}
      </p>
    </div>
  )
}

/** Two containers, one network namespace. */
export function PodLocalhost() {
  return (
    <svg viewBox="0 0 340 128" className="mt-6 h-auto w-full" role="img" aria-label="A pod boundary holding two containers that reach each other on localhost and share one IP address.">
      <rect x="1" y="1" width="338" height="126" rx="12" fill="var(--sunken)" stroke="var(--line-strong)" strokeDasharray="6 5" />
      <text x="14" y="20" className="font-mono" fontSize="9.5" fill="var(--faint)">
        pod · one IP, one network namespace
      </text>

      <rect x="14" y="34" width="140" height="62" rx="9" fill="var(--raised)" stroke="var(--line-strong)" />
      <TechGlyph tech="envoyproxy" x={26} y={44} size={15} />
      <text x="26" y="76" className="font-mono" fontSize="10.5" fill="var(--ink)">
        istio-proxy
      </text>

      <rect x="186" y="34" width="140" height="62" rx="9" fill="var(--raised)" stroke="var(--line-strong)" />
      <TechGlyph tech="go" x={198} y={44} size={15} />
      <text x="198" y="76" className="font-mono" fontSize="10.5" fill="var(--ink)">
        catalog
      </text>

      <path d="M154 65 L186 65" stroke="var(--accent)" strokeWidth="1.3" strokeDasharray="3 4" className="edge-flow" />
      <text x="170" y="112" textAnchor="middle" className="font-mono" fontSize="9.5" fill="var(--accent)">
        localhost
      </text>
    </svg>
  )
}

const CELLS = 9

/**
 * The single most confusing difference between broker families, drawn:
 * a queue empties as it is read, a log does not.
 */
export function QueueVsLog() {
  const reduce = useReducedMotion()
  const [queue, setQueue] = useState([0, 1, 2, 3, 4])
  const [, setSeq] = useState(5)
  const [a, setA] = useState(2)
  const [b, setB] = useState(6)

  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setQueue((q) => (q.length > 1 ? q.slice(1) : q))
      setSeq((n) => {
        setQueue((q) => (q.length < 5 ? [...q, n] : q))
        return n + 1
      })
      setA((n) => (n + 1) % CELLS)
    }, 1400)
    const slow = window.setInterval(() => setB((n) => (n + 1) % CELLS), 2600)
    return () => {
      window.clearInterval(id)
      window.clearInterval(slow)
    }
  }, [reduce])

  return (
    <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="rounded-xl border border-line bg-sunken p-4">
        <p className="font-mono text-[10.5px] text-faint">queue · reading removes</p>
        <div className="mt-3 flex h-10 items-center gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {queue.map((n) => (
              <motion.span
                key={n}
                layout
                initial={reduce ? false : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.7, x: -18 }}
                transition={{ duration: 0.4, ease: EASE }}
                className="grid size-8 place-items-center rounded-md border border-accent bg-accent-soft font-mono text-[10px] text-accent"
              >
                {n}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
        <p className="mt-3 text-[12px] leading-snug text-faint">
          One consumer takes the head and acknowledges it. Nobody can read it again.
        </p>
      </div>

      <div className="rounded-xl border border-line bg-sunken p-4">
        <p className="font-mono text-[10.5px] text-faint">log · reading only moves an offset</p>
        <div className="mt-3 flex h-10 items-center gap-1.5">
          {Array.from({ length: CELLS }, (_, i) => (
            <span
              key={i}
              className="grid size-8 place-items-center rounded-md border border-line bg-raised font-mono text-[10px] text-muted"
            >
              {i}
            </span>
          ))}
        </div>
        <div className="relative mt-1.5 h-6">
          {[
            { at: a, label: 'A', color: 'var(--accent)' },
            { at: b, label: 'B', color: 'var(--ok)' },
          ].map((m, i) => (
            <motion.span
              key={m.label}
              animate={{ left: m.at * 38 + 8 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="absolute font-mono text-[10px]"
              style={{ color: m.color, top: i * 11 }}
            >
              {m.label}
            </motion.span>
          ))}
        </div>
        <p className="mt-1 text-[12px] leading-snug text-faint">
          Two consumers, two offsets, the same records. Moving an offset back is a replay.
        </p>
      </div>
    </div>
  )
}
