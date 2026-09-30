import type { HTMLMotionProps } from "motion/react"
import * as m from "motion/react-m"
import { cn } from "@/lib/cn"

/** Base UI style `render` prop: the element to animate instead of a `div`, e.g. `<section />`. */
export type MotionRender = React.ReactElement<{ className?: string }>

type MotionElement = React.ComponentType<HTMLMotionProps<"div">>

// One motion component per element type, created once: a new one each render would remount.
const motionElements = new Map<MotionRender["type"], MotionElement>()

function motionElementFor(type: MotionRender["type"]): MotionElement {
	const existing = motionElements.get(type)
	if (existing) return existing
	const created = m.create<HTMLMotionProps<"div">>(type)
	motionElements.set(type, created)
	return created
}

type MotionRenderProps = HTMLMotionProps<"div"> & {
	render: MotionRender | undefined
}

/** Renders `render` (or a `div`) as a motion element, merging its props with the primitive's. */
export function MotionRenderElement({
	render,
	className,
	transition,
	...props
}: MotionRenderProps) {
	const Element = motionElementFor(render?.type ?? "div")
	return (
		<Element
			{...render?.props}
			{...props}
			// An explicit `transition={undefined}` would hide MotionProvider's default.
			{...(transition && { transition })}
			className={cn(render?.props.className, className)}
		/>
	)
}
