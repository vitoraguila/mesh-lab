import { TECH } from '../../lib/techIcons'
import type { TechKey } from '../../lib/techIcons'

/**
 * Standalone brand mark. Renders in the technology's own colour by default;
 * `mono` makes it inherit the surrounding text colour instead, for the few
 * places where the mark is decoration on an already-coloured element.
 */
export function TechIcon({
  tech,
  size = 24,
  className = '',
  mono = false,
  label = true,
}: {
  tech: TechKey
  size?: number
  className?: string
  mono?: boolean
  label?: boolean
}) {
  const icon = TECH[tech]
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={`${mono ? '' : 'tech-mark'} ${className}`}
      data-tech={tech}
      style={mono ? undefined : { color: icon.hex }}
      role={label ? 'img' : undefined}
      aria-label={label ? icon.name : undefined}
      aria-hidden={label ? undefined : true}
    >
      <path d={icon.path} fill="currentColor" />
    </svg>
  )
}

/**
 * The same mark placed inside an existing SVG diagram. Simple Icons draw on a
 * 24 unit grid, so the scale factor is the target size over 24.
 */
export function TechGlyph({
  tech,
  x,
  y,
  size = 20,
  mono,
  opacity = 1,
}: {
  tech: TechKey
  x: number
  y: number
  size?: number
  /** Pass a colour to override the brand colour, for marks on accent surfaces. */
  mono?: string
  opacity?: number
}) {
  const icon = TECH[tech]
  const s = size / 24
  return (
    <g
      transform={`translate(${x} ${y}) scale(${s})`}
      opacity={opacity}
      className={mono ? undefined : 'tech-mark'}
      data-tech={mono ? undefined : tech}
      style={{ color: mono ?? icon.hex }}
    >
      <title>{icon.name}</title>
      <path d={icon.path} fill="currentColor" />
    </g>
  )
}
