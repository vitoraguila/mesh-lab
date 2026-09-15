import { useRef } from 'react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowDownRightIcon, AsteriskSimpleIcon } from '@phosphor-icons/react'

/** A reading pause: scroll emphasis connects the model to the experiment. */
export function LearningBridge() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 85%', 'end 60%'] })
  const x = useTransform(scrollYProgress, [0, 1], [-35, 0])
  const opacity = useTransform(scrollYProgress, [0, 1], [.3, 1])
  return <aside ref={ref} className="learning-bridge">
    <AsteriskSimpleIcon className="bridge-spark" aria-hidden="true" weight="bold" />
    <div className="bridge-inner">
      <p>You’ve met the moving parts.</p>
      <motion.p className="bridge-statement" style={reduce ? undefined : { x, opacity }}>
        Now make<br />a request.<ArrowDownRightIcon aria-hidden />
      </motion.p>
      <p>Choose an identity. Change the destination. Discover why the same system can say yes to one call and no to another.</p>
      <a href="#journey" className="secondary-link">Try the request console <ArrowDownRightIcon size={20} /></a>
    </div>
  </aside>
}
