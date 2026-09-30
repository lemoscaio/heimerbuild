import {
	type HTMLMotionProps,
	useReducedMotionConfig,
	type Variants,
} from "motion/react"
import { type MotionRender, MotionRenderElement } from "./motion-render"
import { duration, easing, staggerSpread } from "./tokens"
import { CLOSED, OPEN } from "./variant-labels"

// Spread over a fixed window, not a fixed step, so the last item ends in time however many there are.
function spreadDelay(index: number, total: number) {
	return total > 1 ? (index / (total - 1)) * staggerSpread : 0
}

const rootVariants: Variants = {
	[OPEN]: { transition: { delayChildren: spreadDelay } },
	[CLOSED]: {},
}
const reducedRootVariants: Variants = { [OPEN]: {}, [CLOSED]: {} }

const itemVariants: Variants = {
	[OPEN]: { opacity: 1, y: 0 },
	[CLOSED]: { opacity: 0, y: 8 },
}

const itemTransition = { duration: duration.fast, ease: easing.out }

type StaggerProps = {
	render?: MotionRender
} & HTMLMotionProps<"div">

/**
 * Staggers its `Stagger.Item`s in when its parent's variant turns "open" (e.g. a `Collapse`),
 * through Motion's variant propagation. Items only declare themselves.
 */
function StaggerRoot({ render, ...props }: StaggerProps) {
	const reduceMotion = useReducedMotionConfig()
	return (
		<MotionRenderElement
			render={render}
			variants={reduceMotion ? reducedRootVariants : rootVariants}
			{...props}
		/>
	)
}

/** Fades and slides in on its `Stagger`'s turn. */
function StaggerItem({ render, ...props }: StaggerProps) {
	const reduceMotion = useReducedMotionConfig()
	return (
		<MotionRenderElement
			render={render}
			variants={itemVariants}
			transition={reduceMotion ? undefined : itemTransition}
			{...props}
		/>
	)
}

export const Stagger = Object.assign(StaggerRoot, { Item: StaggerItem })
