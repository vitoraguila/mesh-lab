import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowLeftIcon, ArrowRightIcon } from '@phosphor-icons/react'
import { SectionTitle } from './ui/SectionTitle'
import { Reveal } from './ui/Reveal'
import { TechIcon } from './ui/TechIcon'
import { Hi } from '../lib/terms'
import { EASE } from '../lib/motion'
import type { TechKey } from '../lib/techIcons'

type Panel = { n: string; tag: string; mark: TechKey; title: string; body: string; code: string[]; foot: string }

const PANELS: Panel[] = [
  {
    n: '01',
    tag: 'Source',
    mark: 'go',
    title: 'Source, with no cluster in it',
    body: 'An ordinary Go module. It reads configuration from environment variables and serves HTTP on a port. No authorization logic, and nothing about Kubernetes.',
    code: ['apps/catalog/', '  main.go', '  go.mod', '  Dockerfile', '  deploy/'],
    foot: 'Seven services, three languages, same shape.',
  },
  {
    n: '02',
    tag: 'Dockerfile',
    mark: 'docker',
    title: 'A Dockerfile is a recipe, not a machine',
    body: 'Two stages. The first has a full Go toolchain and compiles a static binary. The second starts from scratch, an empty filesystem, and copies in that one file.',
    code: [
      'FROM golang:1.25.5-alpine AS build',
      'RUN CGO_ENABLED=0 go build -o /server .',
      '',
      'FROM scratch',
      'COPY --from=build /server /server',
      'USER 10001:10001',
      'EXPOSE 8080',
    ],
    foot: 'No shell, no package manager, no root user in the shipped image.',
  },
  {
    n: '03',
    tag: 'Build',
    mark: 'docker',
    title: 'Build turns the recipe into an image',
    body: 'An image is read-only layers plus metadata: which binary, as which user, on which port. It is a file. It does not run, and nothing about staging is inside it.',
    code: ['make build APP=catalog', '', '=> [build 4/4] go build', '=> exporting layers', '=> naming to catalog:dev'],
    foot: 'Tag dev is the default. TAG=experiment-1 names it differently.',
  },
  {
    n: '04',
    tag: 'Load',
    mark: 'kubernetes',
    title: 'The node needs the image locally',
    body: 'Normally a cluster pulls from a registry. Minikube can skip that: load the image straight into the node, with no push, pull, credentials or network.',
    code: [
      'minikube -p mesh-study image load catalog:dev',
      '',
      'kubectl get pod -n stg -l app=catalog',
      'catalog-7d9f4b8c6d-xk2p9   2/2   Running',
    ],
    foot: 'imagePullPolicy: IfNotPresent is what makes the local copy win.',
  },
  {
    n: '05',
    tag: 'Promote',
    mark: 'helm',
    title: 'One image, both environments',
    body: 'The same catalog:dev is deployed to stg and to prd. Promoting a version means pointing an environment at a tag, not rebuilding anything.',
    code: [
      'apps/catalog/deploy/environments/stg/config.yaml',
      '',
      'catalog:',
      '  config:',
      '    SERVICE_VERSION: "v2-experiment"',
    ],
    foot: 'Kubernetes injects the difference at pod creation.',
  },
]

function Body({ p }: { p: Panel }) {
  return (
    <>
      <p className="mt-3 max-w-[46ch] text-[14.5px] leading-relaxed text-muted">
        <Hi>{p.body}</Hi>
      </p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-line wash p-4">
        <pre className="font-mono text-[11.5px] leading-[1.8] text-ink">
          <code>{p.code.join('\n')}</code>
        </pre>
      </div>
      <p className="mt-3 max-w-[52ch] text-[12.5px] leading-snug text-faint">
        <Hi>{p.foot}</Hi>
      </p>
    </>
  )
}

const ARTIFACTS = [
  { title: 'Go service', detail: 'main.go + go.mod', result: 'Your application starts here.' },
  { title: 'Build recipe', detail: 'Dockerfile', result: 'Describe what goes into the image.' },
  { title: 'Container image', detail: 'catalog:dev', result: 'A portable package, ready to run.' },
  { title: 'Local node', detail: 'mesh-study', result: 'The cluster can now start your image.' },
  { title: 'Two environments', detail: 'stg / prd', result: 'Same image. Independent configuration.' },
]

export function ImagesSection() {
  const [active, setActive] = useState(0)
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const reduce = useReducedMotion()
  const panel = PANELS[active]
  const artifact = ARTIFACTS[active]
  function select(index: number, focus = false) {
    const next = Math.max(0, Math.min(PANELS.length - 1, index))
    setActive(next)
    if (focus) tabs.current[next]?.focus({ preventScroll: true })
  }
  return <section id="images" className="image-walkthrough">
    <div className="walkthrough-inner">
      <Reveal>
        <div className="mb-4 flex items-center gap-4"><TechIcon tech="go" size={32} /><TechIcon tech="docker" size={32} /><TechIcon tech="kubernetes" size={32} /></div>
        <SectionTitle>From source code to running service.</SectionTitle>
        <p className="walkthrough-intro">Five steps. One portable application. Choose a step to see what changes along the way.</p>
      </Reveal>
      <div className="build-tabs" role="tablist" aria-label="From source to running service">
        {PANELS.map((p, i) => <button key={p.n} ref={el => { tabs.current[i] = el }} type="button" role="tab"
          id={`build-tab-${i}`} aria-controls="build-panel" aria-selected={active === i} tabIndex={active === i ? 0 : -1}
          onClick={() => select(i)} onKeyDown={event => {
            const next = event.key === 'ArrowRight' ? (active + 1) % PANELS.length : event.key === 'ArrowLeft' ? (active + PANELS.length - 1) % PANELS.length : event.key === 'Home' ? 0 : event.key === 'End' ? PANELS.length - 1 : null
            if (next !== null) { event.preventDefault(); select(next, true) }
          }}>
          <span className="build-step-number">{p.n}</span><TechIcon tech={p.mark} size={24} label={false} /><span>{p.tag}</span>
          {i < PANELS.length - 1 && <ArrowRightIcon className="build-step-arrow" size={18} aria-hidden="true" />}
        </button>)}
      </div>
      <div id="build-panel" role="tabpanel" aria-labelledby={`build-tab-${active}`} tabIndex={0} className="build-panel">
        <motion.div className={`build-artifact build-artifact-${active}`} key={`artifact-${active}`}
          initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .45, ease: EASE }}>
          <div className="artifact-sheet"><TechIcon tech={panel.mark} size={64} /><strong>{artifact.title}</strong><code>{artifact.detail}</code></div>
          <p>{artifact.result}</p>
        </motion.div>
        <motion.div className="build-explanation" key={active} initial={reduce ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .35, ease: EASE }}>
          <h3>{panel.title}</h3><Body p={panel} />
        </motion.div>
      </div>
      <div className="build-controls">
        <p aria-live="polite">Step {active + 1} of {PANELS.length}<span>{panel.tag}</span></p>
        <div><button type="button" className="icon-control" aria-label="Previous build step" disabled={active === 0} onClick={() => select(active - 1)}><ArrowLeftIcon size={20} /></button>
        <button type="button" className="action-button" disabled={active === PANELS.length - 1} onClick={() => select(active + 1)}>Next step <ArrowRightIcon size={20} /></button></div>
      </div>
    </div>
  </section>
}
