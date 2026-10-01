import type { createTooltipHandle } from "@/components/ui/tooltip"
import { useDebouncedCallback } from "@/hooks/use-debounced-callback"

const TAP_TOOLTIP_MS = 1500

type TooltipHandle<Payload> = ReturnType<typeof createTooltipHandle<Payload>>

/**
 * Base UI tooltips ignore touch: a tap on a trigger shows its tooltip for a moment, so icon-only
 * controls name themselves on phones too. Triggers need an `id` and `closeOnClick={false}`.
 */
export function useTapTooltip<Payload>(handle: TooltipHandle<Payload>) {
	const closeLater = useDebouncedCallback(() => handle.close(), TAP_TOOLTIP_MS)

	return function showOnTap(event: React.PointerEvent<HTMLElement>) {
		if (event.pointerType === "mouse") return
		handle.open(event.currentTarget.id)
		closeLater()
	}
}
