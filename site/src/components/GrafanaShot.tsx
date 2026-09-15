import { useState } from 'react'
import { ArrowsOutSimpleIcon } from '@phosphor-icons/react'
import { Modal } from './ui/Modal'
import { Hi } from '../lib/terms'

/**
 * Rendered only if the capture exists. The image is produced by
 * site/scripts/capture.cjs against a running `make grafana ENV=stg`; there is
 * no mock here, so until someone runs that the section simply omits it.
 */
export function GrafanaShot() {
  const [ok, setOk] = useState(true)
  const [full, setFull] = useState(false)
  if (!import.meta.env.VITE_GRAFANA_SHOT_AVAILABLE || !ok) return null

  return (
    <figure className="mt-8">
      <div className="rounded-2xl border border-line bg-sunken p-3 md:p-4">
        <button
          type="button"
          onClick={() => setFull(true)}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-xl border border-line"
          aria-label="Open the Grafana dashboard screenshot full size"
        >
          <img
            src="shots/grafana.webp"
            alt="The provisioned Grafana dashboard: handler throughput, mesh decisions by response code, p95 handler latency and telemetry publish rate."
            loading="lazy"
            decoding="async"
            onError={() => setOk(false)}
            className="mx-auto block h-auto w-full max-w-[1020px]"
          />
          <span className="pointer-events-none absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-canvas/85 px-2.5 py-1.5 font-mono text-[11px] text-ink opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
            <ArrowsOutSimpleIcon size={12} weight="bold" />
            full size
          </span>
        </button>
      </div>
      <figcaption className="mt-3 max-w-[72ch] text-[13.5px] leading-relaxed text-faint">
        <Hi>
          {'The four provisioned panels, reading the series above out of Prometheus. make grafana ENV=stg prints the generated login and forwards to :3200.'}
        </Hi>
      </figcaption>
      <Modal open={full} onClose={() => setFull(false)} title="grafana, stg">
        <img src="shots/grafana.webp" alt="The Grafana dashboard at full size." className="mx-auto h-auto w-full rounded-lg" />
      </Modal>
    </figure>
  )
}
