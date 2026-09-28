import { useLayoutEffect } from "react"
import { createPortal } from "react-dom"
import { tooltipPosition } from "@/lib/tooltip-position"

type TooltipProps = {
	/** The element the tooltip points at; it goes above it, or below when there is no room. */
	anchor: HTMLElement
	ref: React.RefObject<HTMLDivElement | null>
} & Omit<React.ComponentProps<"div">, "ref">

/** Rendered in `document.body` with a fixed position, so scrolling containers never clip it. */
export function Tooltip({ anchor, ref, className, ...props }: TooltipProps) {
	useLayoutEffect(() => {
		const element = ref.current
		if (!element) return
		const { top, left } = tooltipPosition(
			anchor.getBoundingClientRect(),
			element.getBoundingClientRect(),
			{ width: window.innerWidth, height: window.innerHeight },
		)
		element.style.top = `${top}px`
		element.style.left = `${left}px`
	}, [anchor, ref])

	return createPortal(
		<div
			ref={ref}
			role="tooltip"
			className={className ? `tooltip ${className}` : "tooltip"}
			{...props}
		/>,
		document.body,
	)
}
