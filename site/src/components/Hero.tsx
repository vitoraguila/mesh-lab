import { motion, useReducedMotion } from 'motion/react'
import { ArrowDownRightIcon, ArrowUpRightIcon, TerminalWindowIcon, AsteriskSimpleIcon } from '@phosphor-icons/react'
import { HeroTopology } from './HeroTopology'
import { EASE } from '../lib/motion'

const ROUTES = [
  { href: 'journey', title: 'Follow a request', detail: 'Routing & authorization' },
  { href: 'events', title: 'Follow an event', detail: 'Messages & queues' },
  { href: 'signals', title: 'Follow a metric', detail: 'Prometheus & Grafana' },
]

export function Hero() {
  const reduce = useReducedMotion()
  return (
    <section id="top" className="hero">
      <div className="hero-shapes" aria-hidden="true"><AsteriskSimpleIcon className="hero-spark" weight="bold" /><span className="hero-orbit" /></div>
      <div className="hero-layout">
        <div className="hero-copy">
          <motion.p className="hero-intro" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .7 }}>
            A free, open microservice case study
          </motion.p>
          <h1 className="hero-title">
            {['Learn how', 'microservices move.'].map((line, i) => (
              <span className="hero-line" key={line}>
                <motion.span initial={reduce ? false : { y: '105%' }} animate={{ y: 0 }}
                  transition={{ duration: .9, delay: i * .12, ease: EASE }}>
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <motion.p className="hero-description" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .25, ease: EASE }}>
            Explore a real architecture through requests, events, and metrics. No signup, no sales pitch, nothing to trade. Just the system, explained.
          </motion.p>
          <motion.div className="hero-actions" initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .35, ease: EASE }}>
            <a href="#overview" className="primary-link action-button">See the architecture <ArrowDownRightIcon size={20} /></a>
            <a href="#install" className="secondary-link outline-button"><TerminalWindowIcon size={18} /> Run it locally</a>
          </motion.div>
        </div>
        <motion.figure className="hero-model" initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: .2, ease: EASE }}>
          <div className="model-heading"><span>The request path</span><span>Illustrated example</span></div>
          <HeroTopology />
          <figcaption>Every service has a proxy. Every request meets a policy.</figcaption>
        </motion.figure>
      </div>
      <nav className="hero-routes" aria-label="Explore the three data flows">
        {ROUTES.map(route => <a href={`#${route.href}`} key={route.href}>
          <div><span>{route.detail}</span><strong>{route.title}</strong></div><ArrowUpRightIcon size={24} />
        </a>)}
      </nav>
      <div id="nav-sentinel" className="absolute top-[72px] left-0 h-px w-px" />
    </section>
  )
}
