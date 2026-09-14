import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { PauseIcon, PlayIcon, PlugsConnectedIcon, PlugsIcon } from '@phosphor-icons/react'
import { TechGlyph, TechIcon } from './ui/TechIcon'
import type { TechKey } from '../lib/techIcons'
import { EASE } from '../lib/motion'

/** AMQP topic matching: * is exactly one word, # is zero or more. */
function matches(binding: string, key: string): boolean {
  const b = binding.split('.')
  const k = key.split('.')
  const walk = (i: number, j: number): boolean => {
    if (i === b.length) return j === k.length
    if (b[i] === '#') {
      for (let n = j; n <= k.length; n++) if (walk(i + 1, n)) return true
      return false
    }
    if (j === k.length) return false
    if (b[i] !== '*' && b[i] !== k[j]) return false
    return walk(i + 1, j + 1)
  }
  return walk(0, 0)
}

type Producer = { id: string; name: string; key: string; tech: TechKey; y: number }
type Lane = { id: string; queue: string; binding: string; consumer: string; tech: TechKey; y: number; real: boolean }

const PRODUCERS: Producer[] = [
  { id: 'catalog', name: 'catalog', key: 'stg.catalog.completed', tech: 'go', y: 84 },
  { id: 'orders', name: 'orders', key: 'stg.orders.completed', tech: 'go', y: 210 },
  { id: 'authz', name: 'authz', key: 'stg.authz.deny', tech: 'go', y: 336 },
]

const LANES: Lane[] = [
  { id: 'events', queue: 'mesh.events.stg', binding: '#', consumer: 'events', tech: 'go', y: 79, real: true },
  { id: 'alerts', queue: 'alerts.deny', binding: 'stg.*.deny', consumer: 'alerting', tech: 'go', y: 205, real: false },
  { id: 'billing', queue: 'billing.orders', binding: 'stg.orders.*', consumer: 'billing', tech: 'nodedotjs', y: 331, real: false },
]

const Q_SLOT_X = 616
const SLOT_W = 16
const MAX_SLOTS = 10

type Phase = 'fly' | 'queued' | 'serve' | 'drop'
type Msg = { id: number; lane: string; key: string; from: number; phase: Phase }

export function EventFlow() {
  const reduce = useReducedMotion()
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [paused, setPaused] = useState<Record<string, boolean>>({ alerts: true })
  const [brokerUp, setBrokerUp] = useState(true)
  const [delivered, setDelivered] = useState<Record<string, number>>({})
  const [dropped, setDropped] = useState(0)
  const next = useRef(0)
  const turn = useRef(0)

  const brokerRef = useRef(brokerUp)
  brokerRef.current = brokerUp
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  // Producers publish on a timer, and route by key exactly as a topic exchange would.
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      const p = PRODUCERS[turn.current++ % PRODUCERS.length]
      setMsgs((cur) => {
        if (cur.length > 26) return cur
        if (!brokerRef.current) {
          return [...cur, { id: next.current++, lane: 'none', key: p.key, from: p.y, phase: 'drop' }]
        }
        const hits = LANES.filter((l) => matches(l.binding, p.key))
        return [
          ...cur,
          ...hits.map((l) => ({ id: next.current++, lane: l.id, key: p.key, from: p.y, phase: 'fly' as Phase })),
        ]
      })
    }, 1150)
    return () => window.clearInterval(id)
  }, [reduce])

  // Consumers take the oldest queued message, one at a time.
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => {
      setMsgs((cur) => {
        let changed = false
        const out = [...cur]
        for (const lane of LANES) {
          if (pausedRef.current[lane.id]) continue
          const i = out.findIndex((m) => m.lane === lane.id && m.phase === 'queued')
          if (i === -1) continue
          out[i] = { ...out[i], phase: 'serve' }
          changed = true
        }
        return changed ? out : cur
      })
    }, 900)
    return () => window.clearInterval(id)
  }, [reduce])

  const settle = useCallback((id: number) => {
    setMsgs((cur) => cur.map((m) => (m.id === id ? { ...m, phase: 'queued' } : m)))
  }, [])

  const finish = useCallback((m: Msg) => {
    setMsgs((cur) => cur.filter((x) => x.id !== m.id))
    if (m.phase === 'serve') setDelivered((d) => ({ ...d, [m.lane]: (d[m.lane] ?? 0) + 1 }))
    if (m.phase === 'drop') setDropped((n) => n + 1)
  }, [])

  const depth = (lane: string) => msgs.filter((m) => m.lane === lane && m.phase === 'queued').length
  const slotIndex = (m: Msg) =>
    msgs.filter((x) => x.lane === m.lane && x.phase === 'queued').findIndex((x) => x.id === m.id)

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-raised">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
        <button
          type="button"
          onClick={() => setBrokerUp((v) => !v)}
          aria-pressed={!brokerUp}
          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-[12.5px] transition-colors ${
            brokerUp ? 'border-line-strong text-ink hover:border-accent' : 'border-deny text-deny'
          }`}
        >
          {brokerUp ? <PlugsConnectedIcon size={15} /> : <PlugsIcon size={15} />}
          {brokerUp ? 'Broker up' : 'Broker down'}
        </button>
        <p className="text-[12.5px] text-faint">
          {brokerUp
            ? 'Click any consumer to pause it and watch its queue fill.'
            : `Publishing is best effort, so ${dropped} events have been dropped and every business request still succeeded.`}
        </p>
      </div>

      <div className="relative">
        <div className="overflow-x-auto p-4 md:p-6">
          <svg
            viewBox="0 0 1120 440"
            className="h-auto w-full min-w-[820px]"
            role="img"
            aria-label="Three services publish events to a topic exchange. The exchange copies each message to every queue whose binding matches the routing key, and each consumer drains its own queue independently."
          >
            {/* producers */}
            {PRODUCERS.map((p) => (
              <g key={p.id}>
                <rect x="16" y={p.y - 32} width="180" height="64" rx="11" fill="var(--raised)" stroke="var(--line-strong)" />
                <TechGlyph tech={p.tech} x={32} y={p.y - 22} size={18} />
                <text x="58" y={p.y - 8} className="font-mono" fontSize="12.5" fill="var(--ink)">
                  {p.name}
                </text>
                <text x="32" y={p.y + 16} className="font-mono" fontSize="9.5" fill="var(--accent)">
                  {p.key}
                </text>
                <path
                  d={`M196 ${p.y} L240 ${p.y} L240 210 L286 210`}
                  fill="none"
                  stroke="var(--line)"
                  strokeWidth="1.1"
                />
              </g>
            ))}

            {/* exchange */}
            <rect
              x="286"
              y="140"
              width="200"
              height="140"
              rx="12"
              fill={brokerUp ? 'var(--accent-wash)' : 'var(--raised)'}
              stroke={brokerUp ? 'var(--accent)' : 'var(--deny)'}
              strokeWidth="1.4"
              strokeDasharray={brokerUp ? undefined : '6 5'}
            />
            <TechGlyph tech="rabbitmq" x={306} y={160} size={22} />
            <text x="306" y="212" className="font-mono" fontSize="13" fill="var(--ink)">
              mesh.events
            </text>
            <text x="306" y="232" className="font-mono" fontSize="10" fill="var(--faint)">
              type: topic
            </text>
            <text x="306" y="252" className="font-mono" fontSize="10" fill={brokerUp ? 'var(--ok)' : 'var(--deny)'}>
              {brokerUp ? 'routing' : 'unreachable'}
            </text>

            {/* queues and consumers */}
            {LANES.map((l) => {
              const off = Boolean(paused[l.id])
              const d = depth(l.id)
              return (
                <g key={l.id}>
                  <path
                    d={`M486 210 L545 210 L545 ${l.y} L600 ${l.y}`}
                    fill="none"
                    stroke="var(--line)"
                    strokeWidth="1.1"
                  />
                  <rect
                    x="600"
                    y={l.y - 39}
                    width="210"
                    height="78"
                    rx="10"
                    fill="var(--sunken)"
                    stroke={d >= MAX_SLOTS ? 'var(--deny)' : 'var(--line-strong)'}
                  />
                  <text x="614" y={l.y - 20} className="font-mono" fontSize="11" fill="var(--ink)">
                    {l.queue}
                  </text>
                  <text x="614" y={l.y + 30} className="font-mono" fontSize="9.5" fill="var(--accent)">
                    binding {l.binding}
                  </text>
                  <text x={796} y={l.y - 20} textAnchor="end" className="font-mono" fontSize="10" fill={d ? 'var(--ink)' : 'var(--faint)'}>
                    {d}
                  </text>

                  <path d={`M810 ${l.y} L890 ${l.y}`} fill="none" stroke="var(--line)" strokeWidth="1.1" />

                  <g
                    onClick={() => setPaused((v) => ({ ...v, [l.id]: !v[l.id] }))}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    aria-label={`${l.consumer} consumer, ${off ? 'paused' : 'running'}. Toggle.`}
                  >
                    <rect
                      x="890"
                      y={l.y - 39}
                      width="200"
                      height="78"
                      rx="10"
                      fill="var(--raised)"
                      stroke={off ? 'var(--deny)' : 'var(--line-strong)'}
                      strokeWidth={off ? 1.4 : 1}
                    />
                    <TechGlyph tech={l.tech} x={906} y={l.y - 28} size={18} />
                    <text x="932" y={l.y - 14} className="font-mono" fontSize="12" fill="var(--ink)">
                      {l.consumer}
                    </text>
                    <text x="906" y={l.y + 8} className="font-mono" fontSize="9.5" fill={off ? 'var(--deny)' : 'var(--ok)'}>
                      {off ? 'paused' : 'consuming'}
                    </text>
                    <text x={1074} y={l.y + 8} textAnchor="end" className="font-mono" fontSize="9.5" fill="var(--faint)">
                      ack {delivered[l.id] ?? 0}
                    </text>
                    <text x="906" y={l.y + 26} className="font-mono" fontSize="9.5" fill="var(--faint)">
                      {l.real ? 'runs here' : 'an example consumer'}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* messages */}
            <AnimatePresence>
              {msgs.map((m) => {
                if (m.phase === 'drop') {
                  return (
                    <motion.circle
                      key={m.id}
                      r="5"
                      fill="var(--deny)"
                      initial={{ cx: 196, cy: m.from, opacity: 1 }}
                      animate={{ cx: [196, 240, 240, 386], cy: [m.from, m.from, 210, 210], opacity: [1, 1, 1, 0] }}
                      transition={{ duration: 1.1, ease: 'easeInOut' }}
                      onAnimationComplete={() => finish(m)}
                    />
                  )
                }
                const lane = LANES.find((l) => l.id === m.lane)!
                if (m.phase === 'fly') {
                  return (
                    <motion.circle
                      key={m.id}
                      r="5"
                      fill="var(--accent)"
                      initial={{ cx: 196, cy: m.from }}
                      animate={{
                        cx: [196, 240, 240, 386, 486, 545, 545, 600],
                        cy: [m.from, m.from, 210, 210, 210, 210, lane.y, lane.y],
                      }}
                      transition={{ duration: 1.75, ease: 'easeInOut' }}
                      onAnimationComplete={() => settle(m.id)}
                    />
                  )
                }
                if (m.phase === 'queued') {
                  const i = slotIndex(m)
                  const over = i >= MAX_SLOTS
                  return (
                    <motion.circle
                      key={m.id}
                      r="5"
                      fill={over ? 'var(--deny)' : 'var(--accent)'}
                      animate={{ cx: Q_SLOT_X + Math.min(i, MAX_SLOTS) * SLOT_W, cy: lane.y }}
                      transition={{ duration: 0.4, ease: EASE }}
                    />
                  )
                }
                return (
                  <motion.circle
                    key={m.id}
                    r="5"
                    fill="var(--ok)"
                    animate={{ cx: [Q_SLOT_X, 810, 968], cy: lane.y, opacity: [1, 1, 0] }}
                    transition={{ duration: 0.75, ease: 'easeInOut' }}
                    onAnimationComplete={() => finish(m)}
                  />
                )
              })}
            </AnimatePresence>

            {reduce && (
              <text x="16" y="428" className="font-mono" fontSize="11" fill="var(--faint)">
                motion is off, so the simulation is paused. The labels describe the same mechanism.
              </text>
            )}
          </svg>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-14 lg:hidden"
          style={{ background: 'linear-gradient(to left, var(--raised), transparent)' }}
        />
      </div>

      <div className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-3">
        {LANES.map((l) => {
          const off = Boolean(paused[l.id])
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => setPaused((v) => ({ ...v, [l.id]: !v[l.id] }))}
              className="flex items-center gap-3 bg-raised px-5 py-4 text-left transition-colors hover:bg-sunken"
            >
              <span className={off ? 'text-deny' : 'text-ok'}>
                {off ? <PlayIcon size={16} weight="fill" /> : <PauseIcon size={16} weight="fill" />}
              </span>
              <span className="min-w-0">
                <span className="block font-mono text-[12px] text-ink">{l.consumer}</span>
                <span className="block text-[11.5px] text-faint">
                  {off ? `paused, ${depth(l.id)} waiting` : `draining, ${delivered[l.id] ?? 0} acked`}
                </span>
              </span>
              <TechIcon tech={l.tech} size={18} label={false} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
