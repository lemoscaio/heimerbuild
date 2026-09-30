import {
	type HTMLMotionProps,
	useMotionValue,
	useReducedMotionConfig,
	useTransform,
	type Variants,
} from "motion/react"
import { useState } from "react"
import { type MotionRender, MotionRenderElement } from "./motion-render"
import { duration, easing } from "./tokens"
import { CLOSED, OPEN } from "./variant-labels"

const collapseVariants: Variants = {
	[OPEN]: { height: "auto", opacity: 1 },
	[CLOSED]: { height: 0, opacity: 0 },
}

const openTransition = { duration: duration.slow, ease: easing.out }

type CollapseProps = {
	open: boolean
	render?: MotionRender
} & HTMLMotionProps<"div">

/**
 * Opens and closes its content by animating height and opacity. It clips only while
 * moving and is `hidden` once closed; a `Stagger` inside follows its open/close.
 */
export function Collapse({ open, render, style, ...props }: CollapseProps) {
	const reduceMotion = useReducedMotionConfig()
	// Leaves the layout only once the close has finished, so it can animate out.
	const [closeDone, setCloseDone] = useState(!open)
	if (open && closeDone) setCloseDone(false)
	const height = useMotionValue<number | string>(open ? "auto" : 0)
	const overflow = useTransform(height, (value) =>
		value === "auto" ? "visible" : "hidden",
	)

	return (
		<MotionRenderElement
			render={render}
			hidden={!open && closeDone}
			initial={false}
			animate={open ? OPEN : CLOSED}
			variants={collapseVariants}
			// Closing, and everything under reduced motion, uses MotionProvider's default.
			transition={open && !reduceMotion ? openTransition : undefined}
			style={{ ...style, height, overflow }}
			onAnimationComplete={(definition) => {
				if (definition === CLOSED) setCloseDone(true)
			}}
			{...props}
		/>
	)
}
