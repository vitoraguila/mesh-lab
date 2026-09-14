import { motion, useReducedMotion } from 'motion/react'
import { EASE } from '../lib/motion'

type Box = { x: number; y: number; w: number; h: number; label: string; sub?: string; lang?: string }

const BOXES: Box[] = [
  { x: 130, y: 10, w: 160, h: 46, label: 'browser', sub: 'localhost:3000' },
  { x: 130, y: 110, w: 160, h: 56, label: 'web', sub: 'Next.js pod', lang: 'TS' },
  { x: 130, y: 220, w: 160, h: 46, label: 'gateway', sub: 'Istio ingress' },
  { x: 16, y: 330, w: 122, h: 76, label: 'catalog', sub: 'REST', lang: 'GO' },
  { x: 149, y: 330, w: 122, h: 76, label: 'reviews', sub: 'REST', lang: 'PY' },
  { x: 282, y: 330, w: 122, h: 76, label: 'payments', sub: 'REST', lang: 'JS' },
  { x: 130, y: 462, w: 160, h: 46, label: 'authz', sub: 'shared policy', lang: 'GO' },
]

const EDGES = [
  'M210 56 L210 110',
  'M210 166 L210 220',
  'M210 266 L210 300 L77 300 L77 330',
  'M210 266 L210 330',
  'M210 266 L210 300 L343 300 L343 330',
  'M77 406 L77 436 L210 436 L210 462',
  'M210 406 L210 462',
  'M343 406 L343 436 L210 436 L210 462',
]

// The packet's loop: in through the gateway, out to catalog, down to the
// authorization check, then back the way it came with a decision.
const PATH_X = [210, 210, 210, 77, 210, 77, 210, 210, 210]
const PATH_Y = [40, 138, 243, 368, 485, 368, 243, 138, 40]
const TIMES = [0, 0.11, 0.24, 0.38, 0.52, 0.64, 0.76, 0.88, 1]

export function HeroTopology() {
  const reduce = useReducedMotion()

  return (
    <svg
      viewBox="0 0 420 530"
      className="h-auto w-full max-w-[440px]"
      role="img"
      aria-label="Topology of the case study: the browser calls the Next.js pod, which calls the Istio gateway, which routes to the catalog, reviews and payments services, each of which checks the shared authz service."
    >
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {EDGES.map((d, i) => (
        <g key={d}>
          <path d={d} fill="none" stroke="var(--line-strong)" strokeWidth="1" />
          {!reduce && (
            <path
              d={d}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.2"
              strokeDasharray="3 9"
              opacity="0.55"
              className="edge-flow"
              style={{ animationDelay: `${i * 0.12}s` }}
            />
          )}
        </g>
      ))}

      {BOXES.map((b, i) => (
        <motion.g
          key={b.label}
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 + i * 0.075, ease: EASE }}
        >
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx="10"
            fill="var(--raised)"
            stroke="var(--line-strong)"
            strokeWidth="1"
          />
          <text
            x={b.x + 12}
            y={b.y + 22}
            className="font-mono"
            fontSize="12.5"
            fill="var(--ink)"
            fontWeight="500"
          >
            {b.label}
          </text>
          {b.sub && (
            <text x={b.x + 12} y={b.y + 38} className="font-mono" fontSize="10" fill="var(--faint)">
              {b.sub}
            </text>
          )}
          {b.lang && (
            <text
              x={b.x + b.w - 12}
              y={b.y + 22}
              textAnchor="end"
              className="font-mono"
              fontSize="9.5"
              fill="var(--accent)"
            >
              {b.lang}
            </text>
          )}
          {/* Every workload pod carries an Envoy sidecar. It is drawn, not implied. */}
          {b.h > 50 && (
            <rect
              x={b.x + 10}
              y={b.y + b.h - 14}
              width={b.w - 20}
              height="6"
              rx="3"
              fill="var(--accent)"
              opacity="0.4"
            />
          )}
        </motion.g>
      ))}

      {!reduce && (
        <>
          <motion.circle
            r="22"
            fill="url(#hero-glow)"
            animate={{ cx: PATH_X, cy: PATH_Y }}
            transition={{ duration: 7.5, times: TIMES, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.circle
            r="4.5"
            fill="var(--accent)"
            animate={{ cx: PATH_X, cy: PATH_Y }}
            transition={{ duration: 7.5, times: TIMES, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}
    </svg>
  )
}
