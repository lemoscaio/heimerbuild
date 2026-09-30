import { LazyMotion, MotionConfig } from "motion/react"

function loadMotionFeatures() {
	return import("./motion-features").then((module) => module.motionFeatures)
}

/**
 * Motion for the whole app: only `m` components (`strict`), with the animation code
 * loaded after the first render and the user's reduced-motion setting honoured.
 */
export function MotionProvider({ children }: React.PropsWithChildren) {
	return (
		<LazyMotion features={loadMotionFeatures} strict>
			<MotionConfig reducedMotion="user">{children}</MotionConfig>
		</LazyMotion>
	)
}
