import {
	AnimatePresence,
	animate,
	useMotionValue,
	useReducedMotionConfig,
	useTransform,
} from "motion/react"
import * as m from "motion/react-m"
import { useEffect } from "react"
import {
	type MotionRender,
	MotionRenderElement,
} from "@/components/motion/motion-render"
import { transitions } from "@/components/motion/tokens"

type SourcesRevealProps = React.PropsWithChildren<{
	open: boolean
	/** The element that grows, a `span` inside a row's button. */
	render?: MotionRender
}>

/** The sources (legend, a row's bar and line) growing in and out; closed, they leave the DOM. */
export function SourcesReveal({ open, render, children }: SourcesRevealProps) {
	return (
		<AnimatePresence initial={false}>
			{open && (
				<MotionRenderElement
					render={render}
					className="block overflow-hidden"
					initial={{ height: 0, opacity: 0 }}
					animate={{ height: "auto", opacity: 1 }}
					exit={{ height: 0, opacity: 0 }}
				>
					{children}
				</MotionRenderElement>
			)}
		</AnimatePresence>
	)
}

type BarSpanProps = {
	/** Fractions of the bar. */
	left: number
	width?: number
	className?: string
}

/** A bar segment or marker gliding to its place; a new segment grows from its left edge. */
export function AnimatedBarSpan({ left, width, className }: BarSpanProps) {
	const place = {
		left: `${left * 100}%`,
		...(width !== undefined && { width: `${width * 100}%` }),
	}
	return (
		<m.span
			className={className}
			initial={width === undefined ? place : { ...place, width: "0%" }}
			animate={place}
		/>
	)
}

/** A motion value that glides to each new `value`, at once under reduced motion. */
function useGlidingValue(value: number) {
	const motionValue = useMotionValue(value)
	const reduceMotion = useReducedMotionConfig()
	useEffect(() => {
		const controls = animate(
			motionValue,
			value,
			reduceMotion ? transitions.instant : transitions.base,
		)
		return () => controls.stop()
	}, [motionValue, value, reduceMotion])
	return motionValue
}

type AnimatedNumberProps = {
	value: number
	format: (value: number) => string
}

/** A number that counts to its new value instead of jumping (a preview, the other form). */
export function AnimatedNumber({ value, format }: AnimatedNumberProps) {
	const text = useTransform(useGlidingValue(value), format)
	return <m.span>{text}</m.span>
}
