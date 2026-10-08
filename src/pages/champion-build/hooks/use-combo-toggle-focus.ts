import { useEffect, useRef } from "react"
import type { BuildView } from "@/features/build-calculator/lib/build-search"
import { isFocusLost } from "@/lib/focus-lost"

/**
 * Expanding or collapsing the combo unmounts the button that was pressed: focus its counterpart on
 * the new screen (the returned ref) instead of leaving focus on the page.
 */
export function useComboToggleFocus(view: BuildView) {
	const toggleRef = useRef<HTMLButtonElement>(null)
	const previous = useRef(view)

	useEffect(() => {
		const before = previous.current
		previous.current = view
		if (before === view || (before !== "combo" && view !== "combo")) return
		if (isFocusLost()) toggleRef.current?.focus()
	}, [view])

	return toggleRef
}
