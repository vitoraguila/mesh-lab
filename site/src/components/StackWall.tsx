import { Reveal } from './ui/Reveal'

const SLUGS = [
  ['kubernetes', 'Kubernetes'],
  ['istio', 'Istio'],
  ['envoyproxy', 'Envoy'],
  ['docker', 'Docker'],
  ['helm', 'Helm'],
  ['go', 'Go'],
  ['nodedotjs', 'Node.js'],
  ['python', 'Python'],
  ['nextdotjs', 'Next.js'],
  ['graphql', 'GraphQL'],
  ['rabbitmq', 'RabbitMQ'],
  ['prometheus', 'Prometheus'],
  ['grafana', 'Grafana'],
  ['typescript', 'TypeScript'],
] as const

function Row() {
  return (
    <div className="flex shrink-0 items-center gap-14 pr-14">
      {SLUGS.map(([slug, name]) => (
        <img
          key={slug}
          src={`https://cdn.simpleicons.org/${slug}/ffffff`}
          alt={name}
          loading="lazy"
          width={30}
          height={30}
          className="logo-img h-[30px] w-auto opacity-45 transition-opacity duration-300 hover:opacity-100"
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
            <Row />
          </div>
        </div>
      </Reveal>
      <style>{`[data-theme='light'] .logo-img { filter: invert(1); }`}</style>
    </section>
  )
}
