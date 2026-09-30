import { useEffect, useRef } from "react"
import type { createTooltipHandle } from "@/components/ui/tooltip"

const TAP_TOOLTIP_MS = 1500

type TooltipHandle<Payload> = ReturnType<typeof createTooltipHandle<Payload>>

/**
 * Base UI tooltips ignore touch: a tap on a trigger shows its tooltip for a moment, so icon-only
 * controls name themselves on phones too. Triggers need an `id` and `closeOnClick={false}`.
 */
export function useTapTooltip<Payload>(handle: TooltipHandle<Payload>) {
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(timeoutRef.current), [])

	return function showOnTap(event: React.PointerEvent<HTMLElement>) {
		if (event.pointerType === "mouse") return
		handle.open(event.currentTarget.id)
		clearTimeout(timeoutRef.current)
		timeoutRef.current = setTimeout(() => handle.close(), TAP_TOOLTIP_MS)
	}
}
