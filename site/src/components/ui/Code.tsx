import { Fragment } from 'react'

/**
 * A small YAML plus Go-template highlighter. It is deliberately narrow: the
 * only thing it really needs to make obvious is where a Helm expression sits
 * inside an otherwise ordinary manifest. In rendered output, guillemets mark
 * the text that a value supplied, so the same accent shows what was filled in.
 */
type Tok = { t: 'plain' | 'tpl' | 'key' | 'str' | 'comment' | 'fill'; v: string }

const SPLIT = /(\{\{[^}]*\}\}|«[^»]*»)/g

function tokenizeLine(line: string): Tok[] {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('#')) return [{ t: 'comment', v: line }]

  const out: Tok[] = []
  for (const chunk of line.split(SPLIT)) {
    if (!chunk) continue
    if (chunk.startsWith('{{')) {
      out.push({ t: 'tpl', v: chunk })
      continue
    }
    if (chunk.startsWith('«')) {
      out.push({ t: 'fill', v: chunk.slice(1, -1) })
      continue
    }
    // key: value, and quoted strings inside the value
    const m = chunk.match(/^(\s*-?\s*)([A-Za-z0-9_.\-/]+)(:)(.*)$/)
    if (m) {
      out.push({ t: 'plain', v: m[1] })
      out.push({ t: 'key', v: m[2] })
      out.push({ t: 'plain', v: m[3] })
      for (const rest of m[4].split(/("(?:[^"\\]|\\.)*")/g)) {
        if (!rest) continue
        out.push({ t: rest.startsWith('"') ? 'str' : 'plain', v: rest })
      }
      continue
    }
    out.push({ t: 'plain', v: chunk })
  }
  return out
}

const CLASS: Record<Tok['t'], string> = {
  plain: 'text-muted',
  key: 'text-ink',
  str: 'text-ink',
  comment: 'text-faint italic',
  tpl: 'rounded bg-accent-soft px-0.5 font-medium text-accent',
  fill: 'rounded bg-accent-soft px-0.5 font-medium text-accent',
}

export function Code({ code }: { code: string }) {
  return (
    <pre className="font-mono text-[11.5px] leading-[1.9] md:text-[12.5px]">
      <code>
        {code.split('\n').map((line, i) => (
          <div key={i} className="whitespace-pre">
            {tokenizeLine(line).map((tok, j) => (
              <span key={j} className={CLASS[tok.t]}>
                {tok.v}
              </span>
            ))}
            {line === '' ? <Fragment>{' '}</Fragment> : null}
          </div>
        ))}
      </code>
    </pre>
  )
}
