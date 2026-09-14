import type { TechKey } from './techIcons'

export type Entry = {
  id: string
  label: string
  short: string
  blurb: string
  techs: TechKey[]
}

export type Category = { name: string; hint: string; entries: Entry[] }

/**
 * The index is grouped by technology rather than by page order, because that
 * is how someone arrives: they want to know what Istio is doing, not what
 * section six happens to be.
 */
export const CATEGORIES: Category[] = [
  {
    name: 'Start here',
    hint: 'the shape of the whole thing',
    entries: [
      {
        id: 'overview',
        label: 'Everything that runs',
        short: 'Overview',
        blurb: 'Fifteen workloads, three flows, one node.',
        techs: ['kubernetes', 'istio', 'rabbitmq', 'prometheus'],
      },
    ],
  },
  {
    name: 'Containers',
    hint: 'what actually gets shipped',
    entries: [
      {
        id: 'layers',
        label: 'Machine down to container',
        short: 'Layers',
        blurb: 'Docker, node, namespace, pod, and the two containers inside it.',
        techs: ['docker', 'kubernetes', 'envoyproxy'],
      },
      {
        id: 'images',
        label: 'Code to a running image',
        short: 'Images',
        blurb: 'The Dockerfile, the build, and why one image serves both environments.',
        techs: ['go', 'docker', 'kubernetes'],
      },
    ],
  },
  {
    name: 'Kubernetes and Helm',
    hint: 'the objects and the files that make them',
    entries: [
      {
        id: 'objects',
        label: 'The six objects',
        short: 'Objects',
        blurb: 'Deployment, Pod, Service, config, Namespace, Helm chart.',
        techs: ['kubernetes', 'helm'],
      },
      {
        id: 'manifests',
        label: 'The files behind it',
        short: 'Manifests',
        blurb: 'What Helm is, and every template next to what it renders to.',
        techs: ['helm', 'kubernetes', 'istio'],
      },
    ],
  },
  {
    name: 'Service mesh',
    hint: 'routing, identity and authorization',
    entries: [
      {
        id: 'mesh',
        label: 'Istio and Envoy',
        short: 'Mesh',
        blurb: 'What sidecar injection changes, and the four resources that gate a call.',
        techs: ['istio', 'envoyproxy'],
      },
      {
        id: 'journey',
        label: 'Follow one request',
        short: 'Request',
        blurb: 'Pick an identity, send it, watch where it stops.',
        techs: ['envoyproxy', 'istio', 'go'],
      },
    ],
  },
  {
    name: 'Messaging',
    hint: 'how services stop waiting on each other',
    entries: [
      {
        id: 'events',
        label: 'Events and brokers',
        short: 'Events',
        blurb: 'Queues against logs, and where RabbitMQ, Kafka and Kinesis each fit.',
        techs: ['rabbitmq', 'apachekafka', 'natsdotio', 'apachepulsar'],
      },
    ],
  },
  {
    name: 'Observability',
    hint: 'seeing what the mesh did',
    entries: [
      {
        id: 'signals',
        label: 'Metrics and dashboards',
        short: 'Metrics',
        blurb: 'How the scrape works, and the four queries Grafana asks.',
        techs: ['prometheus', 'grafana', 'envoyproxy'],
      },
    ],
  },
  {
    name: 'Running it',
    hint: 'on your own machine',
    entries: [
      {
        id: 'install',
        label: 'Run it locally',
        short: 'Install',
        blurb: 'From Homebrew to a cluster, seven steps.',
        techs: ['docker', 'kubernetes', 'helm'],
      },
      {
        id: 'commands',
        label: 'Command reference',
        short: 'Commands',
        blurb: 'The Make targets worth remembering.',
        techs: ['kubernetes', 'helm'],
      },
    ],
  },
]

export const SECTIONS: Entry[] = CATEGORIES.flatMap((c) => c.entries)
