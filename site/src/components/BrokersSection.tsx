import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { LightningIcon, StackPlusIcon } from '@phosphor-icons/react'
import { Reveal } from './ui/Reveal'
import { TechIcon } from './ui/TechIcon'
import { EventFlow } from './EventFlow'
import { QueueVsLog } from './ui/MiniDiagrams'
import { Disclosure } from './ui/Disclosure'
import { Hi } from '../lib/terms'
import { EASE } from '../lib/motion'
import type { TechKey } from '../lib/techIcons'

const CONCEPTS: { term: string; body: string }[] = [
  {
    term: 'Producer and consumer',
    body: 'The two halves that never meet. A producer writes a message and moves on. Who reads it, when, and whether there is anyone reading at all, is not its problem.',
  },
  {
    term: 'Message',
    body: 'A payload plus metadata: what happened, to what, when. Past tense and self-contained, because the reader may open it minutes later with no other context.',
  },
  {
    term: 'Topic, exchange, routing key',
    body: 'The address. A producer publishes to a name, not to a consumer, and the broker decides who that reaches. Add a reader later and no producer changes.',
  },
  {
    term: 'Queue and subscription',
    body: 'Where messages wait for a specific consumer. One queue per group of workers means the work is shared; one queue per consumer means everyone gets a copy.',
  },
  {
    term: 'Acknowledgement',
    body: 'The consumer tells the broker it is done. Until then the message is still owed, so a crash mid-work gets a redelivery rather than a silent loss.',
  },
  {
    term: 'Delivery guarantees',
    body: 'At-most-once drops on failure. At-least-once can deliver twice, so handlers must be idempotent. Exactly-once exists only inside one system, never across a network boundary.',
  },
  {
    term: 'Offsets and partitions',
    body: 'In log brokers, the reader remembers its own position in an ordered, append-only file. Ordering is guaranteed inside a partition, never across them.',
  },
  {
    term: 'Backpressure and dead letters',
    body: 'A queue is a buffer, and buffers fill. A prefetch limit stops one consumer hoarding work, and a dead-letter queue catches what keeps failing.',
  },
]

type Broker = {
  name: string
  tech?: TechKey
  model: string
  shape: string
  reach: string
  cost: string
}

const BROKERS: Broker[] = [
  {
    name: 'RabbitMQ',
    tech: 'rabbitmq',
    model: 'broker-routed queues, AMQP',
    shape: 'Exchange, binding, queue. The broker decides where each message goes, and an acknowledged message is gone.',
    reach: 'Complex per-message routing, work queues, RPC-style replies, moderate volume.',
    cost: 'Not a log. There is no rewinding to last Tuesday, because delivered work is not kept.',
  },
  {
    name: 'Apache Kafka',
    tech: 'apachekafka',
    model: 'partitioned append-only log',
    shape: 'Producers append to partitions, consumers track their own offset. Nothing is removed on read; retention is time or size.',
    reach: 'High throughput streams, replay, stream processing, many independent readers of the same data.',
    cost: 'Operationally heavy, and routing is coarse. You get a partition key, not a rules engine.',
  },
  {
    name: 'Redpanda',
    model: 'Kafka API, different engine',
    shape: 'Same protocol and the same log semantics, implemented as a single C++ binary with no JVM and no external coordination service.',
    reach: 'Kafka workloads that want lower tail latency and a much smaller operational surface.',
    cost: 'A smaller ecosystem, and you are trusting one vendor implementation of someone else protocol.',
  },
  {
    name: 'Amazon Kinesis',
    model: 'managed shards on AWS',
    shape: 'A log again, split into shards, with capacity and retention as dials you pay for rather than servers you run.',
    reach: 'Teams already inside AWS that want no brokers to operate at all.',
    cost: 'Throughput is bought per shard, retention is capped, and you cannot move it off AWS.',
  },
]

function FlowCompare() {
  const [mode, setMode] = useState<'sync' | 'event'>('event')
  const reduce = useReducedMotion()

  return (
    <div className="rounded-2xl border border-line bg-raised p-5 md:p-8">
      <div role="tablist" aria-label="Call style" className="mb-7 inline-flex gap-1 rounded-full border border-line p-0.5">
        {(
          [
            ['sync', 'Call it directly'],
            ['event', 'Publish an event'],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            role="tab"
            aria-selected={mode === v}
            type="button"
            onClick={() => setMode(v)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] transition-colors duration-200 ${
              mode === v ? 'bg-accent text-on-accent' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto">
        <svg viewBox="0 0 980 230" className="h-auto w-full min-w-[640px]" role="img" aria-label={mode === 'sync' ? 'Direct call: the caller holds a connection open to each service it needs, and fails when any of them is down.' : 'Published event: the caller writes one message to the broker and stops. Each consumer reads on its own schedule.'}>
          <rect x="16" y="82" width="170" height="66" rx="11" fill="var(--raised)" stroke="var(--line-strong)" />
          <text x="34" y="112" className="font-mono" fontSize="12.5" fill="var(--ink)">
            catalog
          </text>
          <text x="34" y="130" className="font-mono" fontSize="10" fill="var(--faint)">
            something happened
          </text>

          {mode === 'sync' ? (
            <>
              {[36, 115, 194].map((y, i) => (
                <g key={y}>
                  <path
                    d={`M186 115 L300 115 L300 ${y + 22} L410 ${y + 22}`}
                    fill="none"
                    stroke={i === 2 ? 'var(--deny)' : 'var(--line-strong)'}
                    strokeWidth="1.3"
                  />
                  <rect
                    x="410"
                    y={y}
                    width="190"
                    height="44"
                    rx="9"
                    fill="var(--raised)"
                    stroke={i === 2 ? 'var(--deny)' : 'var(--line-strong)'}
                  />
                  <text x="428" y={y + 27} className="font-mono" fontSize="11.5" fill={i === 2 ? 'var(--deny)' : 'var(--ink)'}>
                    {['search-index', 'audit-log', 'email-sender'][i]}
                  </text>
                </g>
              ))}
              <text x="640" y="222" className="font-mono" fontSize="11" fill="var(--deny)">
                one consumer down, and the write that started all this fails too
              </text>
              <text x="640" y="118" className="font-mono" fontSize="11" fill="var(--muted)">
                catalog must know all three, and wait for all three
              </text>
            </>
          ) : (
            <>
              <path d="M186 115 L300 115" fill="none" stroke="var(--accent)" strokeWidth="1.5" />
              <text x="243" y="105" textAnchor="middle" className="font-mono" fontSize="10" fill="var(--accent)">
                publish
              </text>
              <rect x="300" y="78" width="200" height="74" rx="11" fill="var(--accent-wash)" stroke="var(--accent)" strokeWidth="1.3" />
              <text x="318" y="108" className="font-mono" fontSize="12.5" fill="var(--ink)">
                broker
              </text>
              <text x="318" y="126" className="font-mono" fontSize="10" fill="var(--faint)">
                stg.catalog.completed
              </text>
              {[36, 115, 194].map((y, i) => (
                <g key={y}>
                  <path
                    d={`M500 115 L560 115 L560 ${y + 22} L620 ${y + 22}`}
                    fill="none"
                    stroke={i === 2 ? 'var(--line)' : 'var(--line-strong)'}
                    strokeWidth="1.3"
                    strokeDasharray="6 4"
                  />
                  <rect
                    x="620"
                    y={y}
                    width="190"
                    height="44"
                    rx="9"
                    fill="var(--raised)"
                    stroke={i === 2 ? 'var(--line)' : 'var(--line-strong)'}
                    opacity={i === 2 ? 0.5 : 1}
                  />
                  <text x="638" y={y + 27} className="font-mono" fontSize="11.5" fill="var(--ink)" opacity={i === 2 ? 0.5 : 1}>
                    {['search-index', 'audit-log', 'email-sender'][i]}
                  </text>
                </g>
              ))}
              <text x="830" y="222" className="font-mono" fontSize="11" fill="var(--ok)">
                the third one is down, its messages wait in its queue
              </text>
              <text x="830" y="118" className="font-mono" fontSize="11" fill="var(--muted)">
                catalog knows none of them
              </text>
            </>
          )}
        </svg>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={mode}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="mt-6 max-w-[74ch] text-[14.5px] leading-relaxed text-muted"
        >
          <Hi>
            {mode === 'sync'
              ? 'Every new reader is a code change in catalog, a new failure mode, and more latency on a request a user is waiting for. Three consumers means three chances to fail the original write.'
              : 'Catalog writes one message and returns. Consumers appear and disappear without it noticing, a slow consumer slows only itself, and a dead one comes back to a queue that kept its work.'}
          </Hi>
        </motion.p>
      </AnimatePresence>
    </div>
  )
}

export function BrokersSection() {
  return (
    <section id="events" className="border-b border-line bg-sunken py-20 lg:py-28">
      <div className="mx-auto max-w-[1400px] px-5 md:px-10">
        <Reveal>
          <div className="mb-5 flex items-center gap-4">
            <TechIcon tech="rabbitmq" size={40} />
            <TechIcon tech="apachekafka" size={40} />
            <TechIcon tech="natsdotio" size={40} />
            <TechIcon tech="apachepulsar" size={40} />
          </div>
          <h2 className="max-w-[22ch] text-[clamp(1.9rem,4.2vw,3.1rem)] leading-[1.05] font-medium tracking-[-0.03em] text-ink">
            Events are how services stop depending on each other
          </h2>
          <p className="mt-5 max-w-[64ch] text-[16px] leading-relaxed text-muted">
            <Hi>
              {'A request is a question you wait for an answer to. An event is a statement you publish and forget. Most of what makes a distributed system distributed is that second one.'}
            </Hi>
          </p>
        </Reveal>

        <Reveal delay={0.08} className="mt-10">
          <FlowCompare />
        </Reveal>

        {/* The mechanism, running */}
        <div className="mt-16">
          <Reveal>
            <h3 className="max-w-[28ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
              One message, however many readers
            </h3>
            <p className="mt-4 max-w-[66ch] text-[15px] leading-relaxed text-muted">
              <Hi>
                {'Each service publishes with a routing key. The exchange copies the message into every queue whose binding matches that key, and each consumer drains its own queue at its own pace. Pause one and watch what happens to the others.'}
              </Hi>
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-8">
            <EventFlow />
          </Reveal>
        </div>

        {/* Core vocabulary */}
        <div className="mt-16">
          <Reveal>
            <h3 className="max-w-[24ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
              The vocabulary every broker shares
            </h3>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-relaxed text-muted">
              Each product renames some of these. None of them adds a ninth.
            </p>
          </Reveal>

          <Reveal delay={0.06} className="mt-8 grid grid-cols-1 gap-x-12 md:grid-cols-2">
            <div>
              {CONCEPTS.slice(0, 4).map((c, i) => (
                <Disclosure key={c.term} title={c.term} index={i + 1} defaultOpen={i === 0}>
                  <p className="max-w-[52ch] pl-8 text-[14px] leading-relaxed text-muted">
                    <Hi>{c.body}</Hi>
                  </p>
                </Disclosure>
              ))}
            </div>
            <div>
              {CONCEPTS.slice(4).map((c, i) => (
                <Disclosure key={c.term} title={c.term} index={i + 5}>
                  <p className="max-w-[52ch] pl-8 text-[14px] leading-relaxed text-muted">
                    <Hi>{c.body}</Hi>
                  </p>
                </Disclosure>
              ))}
            </div>
          </Reveal>
        </div>

        {/* The two families */}
        <div className="mt-16">
          <Reveal>
            <h3 className="max-w-[26ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
              Two families, and the choice is mostly between them
            </h3>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
            <Reveal as="article" className="rounded-2xl border border-line bg-raised p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <span className="text-accent">
                  <StackPlusIcon size={26} />
                </span>
                <h4 className="text-[18px] font-medium text-ink">The queue model</h4>
              </div>
              <p className="mt-1.5 font-mono text-[11.5px] text-faint">RabbitMQ, NATS, SQS</p>
              <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-muted">
                <Hi>
                  {'The broker holds the routing rules and the state. A message lands in a queue, one consumer takes it, acknowledges it, and it is gone. Redelivery happens when an acknowledgement never arrives.'}
                </Hi>
              </p>
              <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-muted">
                Good when routing is genuinely complicated and the work is a task rather than a fact.
              </p>
            </Reveal>

            <Reveal as="article" delay={0.08} className="rounded-2xl border border-line bg-raised p-6 lg:p-8">
              <div className="flex items-center gap-3">
                <span className="text-accent">
                  <LightningIcon size={26} />
                </span>
                <h4 className="text-[18px] font-medium text-ink">The log model</h4>
              </div>
              <p className="mt-1.5 font-mono text-[11.5px] text-faint">Kafka, Redpanda, Kinesis, Pulsar</p>
              <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-muted">
                <Hi>
                  {'The broker holds an ordered file and nothing else. Reading does not consume, so ten consumers read the same partition independently and each remembers its own offset. Replay is just moving that number backwards.'}
                </Hi>
              </p>
              <p className="mt-4 max-w-[54ch] text-[14.5px] leading-relaxed text-muted">
                Good when the same fact has many readers, order matters, and history is worth keeping.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.06}>
            <QueueVsLog />
          </Reveal>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
            {BROKERS.map((b, i) => (
              <Reveal
                key={b.name}
                as="article"
                delay={i * 0.05}
                className="flex min-w-0 flex-col rounded-2xl border border-line bg-raised p-6"
              >
                <div className="flex h-9 items-center">
                  {b.tech ? (
                    <TechIcon tech={b.tech} size={30} />
                  ) : (
                    <span className="text-faint">
                      <LightningIcon size={26} />
                    </span>
                  )}
                </div>
                <h4 className="mt-3.5 text-[16px] font-medium text-ink">{b.name}</h4>
                <p className="mt-1 font-mono text-[11px] text-accent">{b.model}</p>
                <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
                  <Hi>{b.shape}</Hi>
                </p>
                <p className="mt-4 text-[13px] leading-relaxed text-faint">
                  <span className="text-ink">Reach for it when </span>
                  {b.reach}
                </p>
                <p className="mt-3 text-[13px] leading-relaxed text-faint">
                  <span className="text-ink">The cost. </span>
                  {b.cost}
                </p>
              </Reveal>
            ))}
          </div>
        </div>

        {/* What this repository actually does */}
        <div className="mt-16">
          <Reveal>
            <div className="mb-5 flex items-center gap-4">
              <TechIcon tech="rabbitmq" size={36} />
            </div>
            <h3 className="max-w-[26ch] text-[clamp(1.35rem,2.6vw,1.9rem)] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
              What this project runs, and why it is allowed to fail
            </h3>
            <p className="mt-4 max-w-[64ch] text-[15px] leading-relaxed text-muted">
              <Hi>
                {'RabbitMQ, because the interesting part here is routing by service and stage, not throughput. Publishing is best effort on a bounded in-process channel: if the broker is gone the events are dropped, the business request still succeeds, and the interface shows the broker as reconnecting.'}
              </Hi>
            </p>
          </Reveal>

          <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
            <Reveal as="article" className="min-w-0 rounded-2xl border border-line bg-raised p-6 lg:col-span-7 lg:p-8">
              <h4 className="text-[16px] font-medium text-ink">The topology, in five lines</h4>
              <div className="mt-5 overflow-x-auto rounded-xl border border-line bg-sunken p-4">
                <pre className="font-mono text-[11.5px] leading-[1.9] text-ink">
                  <code>{`exchange   mesh.events            type: topic
routing    <environment>.<service>.<stage>
           stg.catalog.completed
           stg.authz.deny
queue      mesh.events.stg        durable, bound with #
consumer   events, prefetch 50, ack after fan-out`}</code>
                </pre>
              </div>
              <p className="mt-4 max-w-[62ch] text-[13.5px] leading-relaxed text-muted">
                <Hi>
                  {'The # binding takes everything, which is right for an observation feed. A real consumer would bind stg.*.deny and never see the rest.'}
                </Hi>
              </p>
            </Reveal>

            <Reveal as="article" delay={0.08} className="min-w-0 rounded-2xl border border-line bg-raised p-6 lg:col-span-5 lg:p-8">
              <h4 className="text-[16px] font-medium text-ink">Deliberate limits</h4>
              <ul className="mt-5 flex flex-col gap-4">
                {[
                  ['Storage is an emptyDir', 'a restart starts from an empty queue, on purpose'],
                  ['AMQP 5672 only', 'no VirtualService, no gateway route, unreachable from outside the mesh'],
                  ['Metadata only', 'never a bearer token, never a request or response body'],
                  ['Port named tcp-amqp', 'Istio treats it as TCP, so policy matches identity and port, not paths'],
                ].map(([t, d]) => (
                  <li key={t}>
                    <p className="text-[13.5px] font-medium text-ink">
                      <Hi>{t}</Hi>
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-faint">
                      <Hi>{d}</Hi>
                    </p>
                  </li>
                ))}
              </ul>
              <p className="mt-6 border-l-2 pl-4 text-[13px] leading-relaxed text-muted" style={{ borderColor: 'var(--line-strong)' }}>
                It is an observation channel for a learning environment, not a durable audit log.
              </p>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}
