import { LazyMotion, MotionConfig, useReducedMotion } from "motion/react"
import { transitions } from "@/components/motion/tokens"

function loadMotionFeatures() {
	return import("./motion-features").then((module) => module.motionFeatures)
}

/**
 * Motion for the whole app: only `m` components (`strict`), with the animation code
 * loaded after the first render, and a `base` default transition that turns instant
 * under reduced motion.
 */
export function MotionProvider({ children }: React.PropsWithChildren) {
	const reduceMotion = useReducedMotion()
	return (
		<LazyMotion features={loadMotionFeatures} strict>
			<MotionConfig
				reducedMotion="user"
				transition={reduceMotion ? transitions.instant : transitions.base}
			>
				{children}
			</MotionConfig>
		</LazyMotion>
	)
}
