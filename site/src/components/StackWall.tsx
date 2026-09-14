import { Reveal } from './ui/Reveal'
import { TechIcon } from './ui/TechIcon'
import type { TechKey } from '../lib/techIcons'

const STACK: TechKey[] = [
  'kubernetes',
  'istio',
  'envoyproxy',
  'docker',
  'helm',
  'go',
  'nodedotjs',
  'python',
  'nextdotjs',
  'react',
  'typescript',
  'graphql',
  'rabbitmq',
  'prometheus',
  'grafana',
]

function Row({ hidden }: { hidden?: boolean }) {
  return (
    <div className="flex shrink-0 items-center gap-14 pr-14" aria-hidden={hidden}>
      {STACK.map((t) => (
        <TechIcon
          key={t}
          tech={t}
          size={46}
          label={!hidden}
          className="shrink-0 transition-transform duration-300 hover:scale-110"
        />
      ))}
    </div>
  )
}

export function StackWall() {
  return (
    <section className="border-y border-line bg-sunken py-9">
      <Reveal amount={0.4}>
        <div className="mask-fade-x flex overflow-hidden">
          <div className="animate-track flex min-w-max">
            <Row />
            <Row hidden />
          </div>
        </div>
      </Reveal>
    </section>
  )
}
