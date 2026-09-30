import {
	type HTMLMotionProps,
	MotionConfig,
	stagger,
	type Transition,
	useMotionValue,
	useReducedMotionConfig,
	useTransform,
	type Variants,
} from "motion/react"
import * as m from "motion/react-m"
import { useState } from "react"

const EASE_OUT: Transition["ease"] = [0.22, 1, 0.36, 1]

const regionVariants: Variants = {
	open: { height: "auto", opacity: 1 },
	collapsed: { height: 0, opacity: 0 },
}

const openTransition: Transition = {
	duration: 0.35,
	ease: EASE_OUT,
	delayChildren: stagger(0.015, { startDelay: 0.05 }),
}
const collapseTransition: Transition = { duration: 0.25, ease: EASE_OUT }
const cardTransition: Transition = { duration: 0.25, ease: EASE_OUT }
const instant: Transition = { duration: 0 }

type ChampionListRegionProps = {
	expanded: boolean
} & HTMLMotionProps<"section">

/**
 * Shows and hides the champion list by animating its height and opacity.
 * `ChampionCardReveal` children follow its "open" / "collapsed" variants.
 */
export function ChampionListRegion({
	expanded,
	...props
}: ChampionListRegionProps) {
	const reduceMotion = useReducedMotionConfig()
	// Leaves the layout only once the collapse has finished, so it can animate out.
	const [collapseDone, setCollapseDone] = useState(!expanded)
	if (expanded && collapseDone) setCollapseDone(false)
	const height = useMotionValue<number | string>(expanded ? "auto" : 0)
	// Clips only while the height moves: at rest, the cards' hover scale and focus rings stay whole.
	const overflow = useTransform(height, (value) =>
		value === "auto" ? "visible" : "hidden",
	)

	function transition() {
		if (reduceMotion) return instant
		return expanded ? openTransition : collapseTransition
	}

	return (
		<MotionConfig transition={reduceMotion ? instant : cardTransition}>
			<m.section
				hidden={!expanded && collapseDone}
				initial={false}
				animate={expanded ? "open" : "collapsed"}
				variants={regionVariants}
				transition={transition()}
				style={{ height, overflow }}
				onAnimationComplete={(definition) => {
					if (definition === "collapsed") setCollapseDone(true)
				}}
				{...props}
			/>
		</MotionConfig>
	)
}
