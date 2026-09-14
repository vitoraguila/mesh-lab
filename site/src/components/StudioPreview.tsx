import { useState } from 'react'
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react'
import { Reveal } from './ui/Reveal'
import { Modal } from './ui/Modal'
import { Hi } from '../lib/terms'

type Shot = { id: string; src: string; label: string; w: number; h: number; caption: string }

/** Real captures of the running studio, not mockups. */
const DETAIL: Shot[] = [
  {
    id: 'map',
    src: 'shots/map.webp',
    w: 704,
    h: 464,
    label: 'The mesh map',
    caption:
      'Every pod drawn with both of its containers, inside a dashed pod boundary. Dispatching a request sends a packet along the configured route.',
  },
  {
    id: 'journey',
    src: 'shots/journey.webp',
    w: 424,
    h: 400,
    label: 'The request journey',
    caption:
      'Each stop in the call, badged with whether it was observed from a real telemetry event or merely configured.',
  },
  {
    id: 'flightlog',
    src: 'shots/flightlog.webp',
    w: 424,
    h: 262,
    label: 'The flight log',
    caption:
      'The last fifty requests. The 200 is an admin reading the catalog; the 403 is the same call with no token.',
  },
]

export function StudioPreview() {
  const [full, setFull] = useState(false)

  return (
    <div className="mt-12">
      <Reveal>
        <h3 className="max-w-[26ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
          What you get once it is up
        </h3>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted">
          <Hi>
            {'Not a README and a set of ports. The interface drives real requests through the mesh, shows the decisions Envoy and the authz service actually made, and reads its counters from Prometheus.'}
          </Hi>
        </p>
      </Reveal>

      <Reveal delay={0.08} className="mt-8">
        <figure>
          <div className="rounded-2xl border border-line bg-sunken p-3 md:p-4">
            <button
              type="button"
              onClick={() => setFull(true)}
              className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line"
              aria-label="Open the studio screenshot full size"
            >
              <img
                src="shots/studio.webp"
                width={1440}
                height={1000}
                alt="The studio: thirteen services listed on the left, the live mesh map in the middle, and the request console on the right."
                loading="lazy"
                decoding="async"
                className="mx-auto block h-auto w-full max-w-[1020px]"
              />
              <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-canvas/85 px-2.5 py-1.5 font-mono text-[11px] text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                <ArrowsOutSimpleIcon size={12} weight="bold" />
                full size
              </span>
            </button>
          </div>
          <figcaption className="mt-3 max-w-[72ch] text-[13.5px] leading-relaxed text-faint">
            <Hi>
              {'Thirteen services down the left, the live mesh map in the middle, the console on the right. This is what make port-forward opens.'}
            </Hi>
          </figcaption>
        </figure>
      </Reveal>

      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
        {DETAIL.map((s, i) => (
          <Reveal key={s.id} as="figure" delay={i * 0.06} className="min-w-0">
            <div className="rounded-2xl border border-line bg-sunken p-2.5">
              <img
                src={s.src}
                width={s.w}
                height={s.h}
                alt={`${s.label}. ${s.caption}`}
                loading="lazy"
                decoding="async"
                className="h-auto w-full rounded-lg border border-line"
              />
            </div>
            <figcaption className="mt-3">
              <span className="block text-[13.5px] font-medium text-ink">{s.label}</span>
              <span className="mt-1 block text-[12.5px] leading-snug text-faint">
                <Hi>{s.caption}</Hi>
              </span>
            </figcaption>
          </Reveal>
        ))}
      </div>

      <Modal open={full} onClose={() => setFull(false)} title="mesh lab, stg">
        <img
          src="shots/studio.webp"
          width={1440}
          height={1000}
          alt="The studio at full size."
          className="mx-auto h-auto w-full max-w-[1440px] rounded-lg"
        />
      </Modal>
    </div>
  )
}
