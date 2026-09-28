import { useEffect, useId, useRef, useState } from "react"

// Lets the pointer travel from the trigger into the tooltip without closing it.
const CLOSE_DELAY_MS = 150

// Only one tooltip is open at a time: focus and hover may point at different items.
let dismissOpenTooltip: (() => void) | undefined

/**
 * Tooltip state for one trigger: opens on mouse hover, keyboard focus and tap,
 * closes on leave, blur, Escape, scroll or a tap elsewhere.
 */
export function useTooltip() {
	const id = useId()
	const [anchor, setAnchor] = useState<HTMLElement | null>(null)
	const tooltipRef = useRef<HTMLDivElement>(null)
	const closeTimer = useRef<number | undefined>(undefined)

	function open(element: HTMLElement) {
		window.clearTimeout(closeTimer.current)
		setAnchor(element)
	}

	function close() {
		window.clearTimeout(closeTimer.current)
		setAnchor(null)
	}

	function scheduleClose() {
		window.clearTimeout(closeTimer.current)
		closeTimer.current = window.setTimeout(
			() => setAnchor(null),
			CLOSE_DELAY_MS,
		)
	}

	useEffect(() => {
		if (!anchor) return
		const dismiss = () => {
			window.clearTimeout(closeTimer.current)
			setAnchor(null)
		}
		dismissOpenTooltip?.()
		dismissOpenTooltip = dismiss
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") dismiss()
		}
		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node
			if (!anchor.contains(target) && !tooltipRef.current?.contains(target)) {
				dismiss()
			}
		}
		document.addEventListener("keydown", handleKeyDown)
		document.addEventListener("pointerdown", handlePointerDown)
		window.addEventListener("scroll", dismiss, { capture: true, passive: true })
		return () => {
			if (dismissOpenTooltip === dismiss) dismissOpenTooltip = undefined
			window.clearTimeout(closeTimer.current)
			document.removeEventListener("keydown", handleKeyDown)
			document.removeEventListener("pointerdown", handlePointerDown)
			window.removeEventListener("scroll", dismiss, { capture: true })
		}
	}, [anchor])

	return {
		anchor,
		triggerProps: {
			"aria-describedby": anchor ? id : undefined,
			onPointerEnter: (event: React.PointerEvent<HTMLElement>) => {
				if (event.pointerType === "mouse") open(event.currentTarget)
			},
			onPointerLeave: (event: React.PointerEvent<HTMLElement>) => {
				if (event.pointerType === "mouse") scheduleClose()
			},
			// Touch and pen have no hover: a tap shows the tooltip (and still clicks).
			onPointerUp: (event: React.PointerEvent<HTMLElement>) => {
				if (event.pointerType !== "mouse") open(event.currentTarget)
			},
			onFocus: (event: React.FocusEvent<HTMLElement>) =>
				open(event.currentTarget),
			onBlur: close,
		},
		tooltipProps: {
			id,
			ref: tooltipRef,
			onPointerEnter: () => window.clearTimeout(closeTimer.current),
			onPointerLeave: scheduleClose,
		},
	}
}
