import { useCallback, useState } from 'react'
import { CheckIcon, CopyIcon, WarningIcon } from '@phosphor-icons/react'

export type Line =
  | { kind: 'cmd'; text: string; note?: string }
  | { kind: 'comment'; text: string }
  | { kind: 'out'; text: string }
  | { kind: 'ok'; text: string }
  | { kind: 'bad'; text: string }

type CopyState = 'idle' | 'copied' | 'failed'

export function Terminal({
  title,
  lines,
  className = '',
}: {
  title?: string
  lines: Line[]
  className?: string
}) {
  const [state, setState] = useState<CopyState>('idle')

  const copy = useCallback(async () => {
    const text = lines
      .filter((l) => l.kind === 'cmd')
      .map((l) => l.text)
      .join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setState('copied')
    } catch {
      setState('failed')
    }
    window.setTimeout(() => setState('idle'), 2200)
  }, [lines])

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-line bg-sunken ${className}`}
      style={{ boxShadow: '0 24px 60px -40px rgb(0 0 0 / 0.7)' }}
    >
      <div className="flex items-center justify-between gap-4 border-b border-line bg-raised/60 px-4 py-2.5">
        <span className="font-mono text-[11px] tracking-wide text-faint">{title ?? 'zsh'}</span>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy the commands in this block"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 font-mono text-[11px] text-muted transition-colors hover:text-accent focus-visible:text-accent"
        >
          {state === 'copied' ? (
            <>
              <CheckIcon size={13} weight="bold" /> copied
            </>
          ) : state === 'failed' ? (
            <>
              <WarningIcon size={13} weight="bold" /> select manually
            </>
          ) : (
            <>
              <CopyIcon size={13} /> copy
            </>
          )}
        </button>
      </div>

      <div className="overflow-x-auto px-4 py-4">
        <pre className="font-mono text-[12.5px] leading-[1.85] md:text-[13px]">
          <code>
            {lines.map((line, i) => {
              if (line.kind === 'comment')
                return (
                  <div key={i} className="text-faint">
                    {line.text}
                  </div>
                )
              if (line.kind === 'cmd')
                return (
                  <div key={i} className="whitespace-pre text-ink">
                    <span className="mr-2 select-none text-accent">$</span>
                    {line.text}
                    {line.note ? <span className="ml-3 text-faint">{line.note}</span> : null}
                  </div>
                )
              if (line.kind === 'ok')
                return (
                  <div key={i} className="whitespace-pre pl-4 text-ok">
                    {line.text}
                  </div>
                )
              if (line.kind === 'bad')
                return (
                  <div key={i} className="whitespace-pre pl-4 text-deny">
                    {line.text}
                  </div>
                )
              return (
                <div key={i} className="whitespace-pre pl-4 text-muted">
                  {line.text}
                </div>
              )
            })}
          </code>
        </pre>
      </div>
    </div>
  )
}
