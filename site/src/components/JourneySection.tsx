import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { ArrowClockwiseIcon, PaperPlaneTiltIcon } from '@phosphor-icons/react'
import { Reveal } from './ui/Reveal'
import { Hi } from '../lib/terms'
import { EASE } from '../lib/motion'

type IdentityKey = 'admin' | 'reader' | 'none' | 'invalid'
type EndpointKey = 'catalog' | 'orders' | 'graphql'

const IDENTITIES: { key: IdentityKey; label: string; note: string }[] = [
  { key: 'admin', label: 'Demo admin', note: 'may read every service' },
  { key: 'reader', label: 'Demo reader', note: 'catalog, inventory, reviews, GraphQL only' },
  { key: 'none', label: 'No token', note: 'Authorization header absent' },
  { key: 'invalid', label: 'Invalid token', note: 'well formed, not in the policy file' },
]

const ENDPOINTS: { key: EndpointKey; label: string; service: string }[] = [
  { key: 'catalog', label: 'GET /catalog', service: 'catalog' },
  { key: 'orders', label: 'GET /orders', service: 'orders' },
  { key: 'graphql', label: 'POST /graphql', service: 'graphql' },
]

/** Mirrors the policy the case study actually ships. */
function decide(id: IdentityKey, ep: EndpointKey): { allowed: boolean; reason: string } {
  if (id === 'none') return { allowed: false, reason: 'no bearer token on the request' }
  if (id === 'invalid') return { allowed: false, reason: 'token is not in this environment policy file' }
  if (id === 'admin') return { allowed: true, reason: 'admin may read every service' }
  if (ep === 'orders')
    return { allowed: false, reason: 'reader is not granted the orders path' }
  return { allowed: true, reason: `reader is granted ${ep === 'graphql' ? 'the GraphQL query' : 'the catalog read'}` }
}

type Beat = { id: string; text: string; detail: string; tone?: 'ok' | 'deny' }

const HOME = { x: 100, y: 228 }

export function JourneySection() {
  const reduce = useReducedMotion()
  const [identity, setIdentity] = useState<IdentityKey>('reader')
  const [endpoint, setEndpoint] = useState<EndpointKey>('orders')
  const [beats, setBeats] = useState<Beat[]>([])
  const [running, setRunning] = useState(false)
  const [verdict, setVerdict] = useState<'ok' | 'deny' | null>(null)
  const [checking, setChecking] = useState(false)
  const runId = useRef(0)

  const px = useMotionValue(HOME.x)
  const py = useMotionValue(HOME.y)

  const service = ENDPOINTS.find((e) => e.key === endpoint)!.service

  const send = useCallback(async () => {
    const id = ++runId.current
    const alive = () => runId.current === id
    const { allowed, reason } = decide(identity, endpoint)

    setRunning(true)
    setVerdict(null)
    setChecking(false)
    setBeats([])
    px.set(HOME.x)
    py.set(HOME.y)

    const step = async (beat: Beat, x: number, y: number, d = 0.62) => {
      if (!alive()) return false
      setBeats((b) => [...b, beat])
      if (reduce) {
        px.set(x)
        py.set(y)
        await new Promise((r) => setTimeout(r, 240))
        return alive()
      }
      await Promise.all([
        animate(px, x, { duration: d, ease: 'easeInOut' }).finished,
        animate(py, y, { duration: d, ease: 'easeInOut' }).finished,
      ])
      return alive()
    }

    if (
      !(await step(
        {
          id: 'browser',
          text: 'Browser calls its own origin',
          detail: 'POST /api/demo on localhost:3000. The token lives in page memory and is never put in a URL.',
        },
        295,
        228,
      ))
    )
      return

    if (
      !(await step(
        {
          id: 'web',
          text: 'The Next.js server makes the real call',
          detail: 'It reads INTERNAL_API_URL, a server-only variable, and attaches the bearer token. The browser never talks to the mesh directly.',
        },
        490,
        228,
      ))
    )
      return

    if (
      !(await step(
        {
          id: 'gateway',
          text: 'The internal gateway matches a route',
          detail: `The root VirtualService sees the /${endpoint === 'graphql' ? 'graphql' : endpoint} prefix and delegates to the route that the ${service} chart owns.`,
        },
        675,
        228,
      ))
    )
      return

    if (
      !(await step(
        {
          id: 'envoy',
          text: `Envoy in the ${service} pod takes the connection`,
          detail: 'ALLOW passes first: the caller presents the gateway service account over mutual TLS, on port 8080. The application has not been entered yet.',
        },
        765,
        376,
        0.55,
      ))
    )
      return

    // The CUSTOM check is a real round trip, so it gets real dwell time.
    setChecking(true)
    await new Promise((r) => setTimeout(r, reduce ? 250 : 900))
    if (!alive()) return
    setChecking(false)

    setBeats((b) => [
      ...b,
      {
        id: 'authz',
        text: allowed ? 'authz answers 200' : 'authz answers 403',
        detail: `CUSTOM sends the token, path and x-mesh-request-id to study-authz-stg. Verdict: ${reason}.`,
        tone: allowed ? 'ok' : 'deny',
      },
    ])

    if (!reduce) {
      await Promise.all([
        animate(px, 675, { duration: 0.5, ease: 'easeInOut' }).finished,
        animate(py, 228, { duration: 0.5, ease: 'easeInOut' }).finished,
      ])
    } else {
      px.set(675)
      py.set(228)
    }
    if (!alive()) return

    if (allowed) {
      if (
        !(await step(
          {
            id: 'app',
            text: 'Only now does your handler run',
            detail: `Envoy forwards to the ${service} container on localhost. The Go code contains no authorization logic at all, because it never sees a request that was not approved.`,
            tone: 'ok',
          },
          843,
          228,
          0.45,
        ))
      )
        return
    }

    setBeats((b) => [
      ...b,
      allowed
        ? {
            id: 'return',
            text: '200 travels back the same way',
            detail: 'Envoy, gateway, Next.js, browser. Each hop recorded the same x-mesh-request-id, which is how the flight log correlates them.',
            tone: 'ok',
          }
        : {
            id: 'return',
            text: '403 returns without touching the service',
            detail: 'The aggregate /api/demo endpoint still answers 200 and reports this upstream status inside its JSON body.',
            tone: 'deny',
          },
    ])

    if (!reduce) {
      await Promise.all([
        animate(px, HOME.x, { duration: 0.9, ease: 'easeInOut' }).finished,
        animate(py, HOME.y, { duration: 0.9, ease: 'easeInOut' }).finished,
      ])
    } else {
      px.set(HOME.x)
      py.set(HOME.y)
    }
    if (!alive()) return

    setVerdict(allowed ? 'ok' : 'deny')
    setRunning(false)
  }, [identity, endpoint, px, py, reduce, service])

  // Cancel any flight in progress when the request definition changes.
  useEffect(() => {
    runId.current++
    setRunning(false)
    setChecking(false)
    setBeats([])
    setVerdict(null)
    px.set(HOME.x)
    py.set(HOME.y)
  }, [identity, endpoint, px, py])

  useEffect(() => () => void runId.current++, [])

  return (
    <section id="journey"
      style={{ ["--tint" as string]: "#e64980" }} className="border-b border-line tinted py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <h2 className="max-w-[22ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Send a request and watch where it stops
          </h2>
          <p className="mt-5 max-w-[60ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'Pick who is calling and what they are calling. The path, the checks and the verdict are the ones this project really enforces.'}
            </Hi>
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-[300px_1fr] lg:gap-8">
          {/* Controls */}
          <Reveal className="rounded-2xl border border-line bg-raised p-5 lg:sticky lg:top-24 lg:self-start lg:p-6">
            <fieldset>
              <legend className="font-mono text-[11px] tracking-wide text-faint">identity</legend>
              <div className="mt-3 flex flex-col gap-1.5">
                {IDENTITIES.map((i) => {
                  const on = identity === i.key
                  return (
                    <button
                      key={i.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setIdentity(i.key)}
                      className={`rounded-xl border px-3.5 py-3 text-left transition-colors duration-200 ${
                        on ? 'border-accent bg-accent-soft' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <span className={`block text-[13.5px] font-medium ${on ? 'text-accent' : 'text-ink'}`}>
                        {i.label}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-snug text-faint">{i.note}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <fieldset className="mt-6">
              <legend className="font-mono text-[11px] tracking-wide text-faint">operation</legend>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {ENDPOINTS.map((e) => {
                  const on = endpoint === e.key
                  return (
                    <button
                      key={e.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setEndpoint(e.key)}
                      className={`rounded-lg border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors duration-200 ${
                        on ? 'border-accent bg-accent-soft text-accent' : 'border-line text-muted hover:border-line-strong'
                      }`}
                    >
                      {e.label}
                    </button>
                  )
                })}
              </div>
            </fieldset>

            <button
              type="button"
              onClick={send}
              disabled={running}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 text-[13.5px] font-medium whitespace-nowrap text-on-accent transition-colors hover:bg-accent-quiet disabled:opacity-55"
            >
              {running ? (
                <>
                  <ArrowClockwiseIcon size={15} className="animate-spin" /> in flight
                </>
              ) : (
                <>
                  <PaperPlaneTiltIcon size={15} weight="fill" /> Send request
                </>
              )}
            </button>

            <AnimatePresence>
              {verdict && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="mt-4 rounded-xl border px-3.5 py-3 font-mono text-[12px]"
                  style={{
                    borderColor: verdict === 'ok' ? 'var(--ok)' : 'var(--deny)',
                    color: verdict === 'ok' ? 'var(--ok)' : 'var(--deny)',
                  }}
                >
                  {verdict === 'ok' ? 'HTTP 200' : 'HTTP 403'} from {service}
                </motion.p>
              )}
            </AnimatePresence>
          </Reveal>

          {/* Diagram and log */}
          <div className="min-w-0">
            <Reveal delay={0.08} className="overflow-hidden rounded-2xl border border-line bg-sunken">
              <div className="relative">
                <div className="bg-blueprint-fine overflow-x-auto p-4 md:p-6">
                <svg viewBox="0 0 960 440" className="h-auto w-full min-w-[620px]" role="img" aria-label="Request path from browser through the Next.js pod and the Istio gateway to the destination pod, where Envoy consults the authz service before the application is reached.">
                  {[
                    'M170 228 L230 228',
                    'M360 228 L425 228',
                    'M555 228 L620 228',
                    'M730 228 L800 228',
                    'M675 248 L675 312 L765 312 L765 346',
                  ].map((d, i) => (
                    <g key={d}>
                      <path d={d} fill="none" stroke="var(--line-strong)" strokeWidth="1.2" />
                      {i === 4 && (
                        <text x="690" y="306" className="font-mono" fontSize="10" fill="var(--faint)">
                          CUSTOM check
                        </text>
                      )}
                    </g>
                  ))}

                  {/* browser */}
                  <Node x={30} y={160} w={140} h={88} title="browser" sub="localhost:3000" />
                  {/* web pod */}
                  <PodNode x={230} y={140} w={130} h={128} title="web" sub="Next.js" />
                  {/* gateway */}
                  <Node x={425} y={160} w={130} h={88} title="gateway" sub="Istio ingress" />

                  {/* destination pod */}
                  <rect x="608" y="126" width="290" height="166" rx="14" fill="none" stroke="var(--line-strong)" strokeDasharray="7 5" />
                  <text x="622" y="148" className="font-mono" fontSize="10.5" fill="var(--faint)">
                    pod / {service}
                  </text>
                  <Node x={620} y={160} w={110} h={88} title="envoy" sub="sidecar" accent />
                  <Node x={800} y={160} w={86} h={88} title={service} sub="handler" />

                  {/* authz */}
                  <rect
                    x="620"
                    y="346"
                    width="290"
                    height="62"
                    rx="12"
                    fill={checking ? 'var(--accent-soft)' : 'var(--raised)'}
                    stroke={checking ? 'var(--accent)' : 'var(--line-strong)'}
                    strokeWidth={checking ? 1.6 : 1}
                    style={{ transition: 'all 300ms' }}
                  />
                  <text x="636" y="372" className="font-mono" fontSize="12.5" fill="var(--ink)">
                    authz
                  </text>
                  <text x="636" y="390" className="font-mono" fontSize="10" fill="var(--faint)">
                    study-authz-stg
                  </text>
                  {checking && (
                    <text x="894" y="382" textAnchor="end" className="font-mono animate-soft-pulse" fontSize="10.5" fill="var(--accent)">
                      checking
                    </text>
                  )}

                  {/* the packet */}
                  <motion.circle cx={px} cy={py} r="20" fill="var(--accent)" opacity="0.16" />
                  <motion.circle cx={px} cy={py} r="5" fill="var(--accent)" />
                </svg>
                </div>
                {/* The diagram is wider than a phone: fade the edge so the scroll is discoverable. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-y-0 right-0 w-14 lg:hidden"
                  style={{ background: 'linear-gradient(to left, var(--sunken), transparent)' }}
                />
              </div>
            </Reveal>

            {/* Flight log, including its empty state. */}
            <div className="mt-4 min-h-[200px] rounded-2xl border border-line bg-raised p-5 md:p-6">
              {beats.length === 0 ? (
                <div className="flex h-full min-h-[150px] flex-col items-start justify-center">
                  <p className="font-mono text-[11px] tracking-wide text-faint">flight log</p>
                  <p className="mt-2 max-w-[46ch] text-[14.5px] leading-relaxed text-muted">
                    Nothing has been sent yet. Try <span className="text-ink">Demo reader</span> against{' '}
                    <span className="text-ink">GET /orders</span> to watch a request die at the sidecar.
                  </p>
                </div>
              ) : (
                <ol className="flex flex-col gap-3.5">
                  <AnimatePresence initial={false}>
                    {beats.map((b, i) => (
                      <motion.li
                        key={b.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="grid grid-cols-[22px_1fr] gap-3"
                      >
                        <span
                          className="mt-0.5 font-mono text-[11px]"
                          style={{
                            color:
                              b.tone === 'ok' ? 'var(--ok)' : b.tone === 'deny' ? 'var(--deny)' : 'var(--faint)',
                          }}
                        >
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <span>
                          <span
                            className="block text-[14.5px] font-medium"
                            style={{
                              color:
                                b.tone === 'ok' ? 'var(--ok)' : b.tone === 'deny' ? 'var(--deny)' : 'var(--ink)',
                            }}
                          >
                            {b.text}
                          </span>
                          <span className="mt-1 block max-w-[72ch] text-[13.5px] leading-relaxed text-muted">
                            <Hi>{b.detail}</Hi>
                          </span>
                        </span>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Node({
  x,
  y,
  w,
  h,
  title,
  sub,
  accent,
}: {
  x: number
  y: number
  w: number
  h: number
  title: string
  sub: string
  accent?: boolean
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx="11"
        fill={accent ? 'var(--accent-soft)' : 'var(--raised)'}
        stroke={accent ? 'var(--accent)' : 'var(--line-strong)'}
        strokeWidth={accent ? 1.3 : 1}
      />
      <text x={x + 13} y={y + 27} className="font-mono" fontSize="12.5" fill="var(--ink)">
        {title}
      </text>
      <text x={x + 13} y={y + 45} className="font-mono" fontSize="10" fill="var(--faint)">
        {sub}
      </text>
    </g>
  )
}

function PodNode({ x, y, w, h, title, sub }: { x: number; y: number; w: number; h: number; title: string; sub: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" fill="var(--raised)" stroke="var(--line-strong)" strokeDasharray="7 5" />
      <text x={x + 13} y={y + 30} className="font-mono" fontSize="12.5" fill="var(--ink)">
        {title}
      </text>
      <text x={x + 13} y={y + 48} className="font-mono" fontSize="10" fill="var(--faint)">
        {sub}
      </text>
      <rect x={x + 12} y={y + h - 24} width={w - 24} height="16" rx="5" fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth="0.9" />
      <text x={x + w / 2} y={y + h - 12} textAnchor="middle" className="font-mono" fontSize="9" fill="var(--accent)">
        envoy
      </text>
    </g>
  )
}
