import { useRef, useState } from "react"

type OpenChangeDetails = { reason: string; cancel: () => void }

/**
 * The open state of the search's suggestions. A picked filter prefix (`group:`, `ap>=`) keeps
 * them open, so its values show right away instead of the combobox closing after the pick.
 */
export function useSuggestionsPopup() {
	const [isOpen, setOpen] = useState(false)
	const keepOpen = useRef(false)

	/** Call from the value change of a prefix pick; the close that follows it is canceled. */
	function keepOpenAfterPick() {
		keepOpen.current = true
		// The combobox closes in the same task as the value change, so the flag never outlives it.
		queueMicrotask(() => {
			keepOpen.current = false
		})
	}

	function onOpenChange(open: boolean, details: OpenChangeDetails) {
		if (!open && keepOpen.current && details.reason === "item-press") {
			details.cancel()
			return
		}
		setOpen(open)
	}

	return { isOpen, onOpenChange, keepOpenAfterPick }
}
