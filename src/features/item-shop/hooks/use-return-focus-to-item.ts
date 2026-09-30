import { useEffect, useRef } from "react"
import { isFocusLost } from "@/lib/focus-lost"
import { focusRovingItem } from "./use-roving-focus"

/**
 * When the selected item's details close (added to the build, or closed) and take focus
 * with them, focus returns to the item's tile, so the keyboard keeps its place in the shop.
 */
export function useReturnFocusToItem(
	selectedItemId: string | undefined,
	listRef: React.RefObject<HTMLElement | null>,
) {
	const previousId = useRef(selectedItemId)

	useEffect(() => {
		const closedId = previousId.current
		previousId.current = selectedItemId
		if (closedId && !selectedItemId && isFocusLost()) {
			focusRovingItem(listRef.current, closedId)
		}
	}, [selectedItemId, listRef])
}
