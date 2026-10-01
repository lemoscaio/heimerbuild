import { useState } from "react"
import { editLastChip } from "../lib/chip-edit"
import type { ShopFilters } from "../lib/shop-query"

type SearchChange = { query: string; filters: ShopFilters }

type SearchKeysOptions = {
	isOpen: boolean
	query: string
	filters: ShopFilters
	onSearchChange: (change: SearchChange) => void
	/** Enter with no suggestion highlighted, or Tab leaving the search: commit the typed text. */
	onCommit: () => void
	/** Escape with the suggestions closed. */
	onEscape: () => void
	/** Puts text in the search as if typed (`useSearchCompletion`). */
	complete: (text: string) => void
}

type SearchKeyEvent = React.KeyboardEvent<HTMLInputElement> & {
	preventBaseUIHandler?: () => void
}

/**
 * The search input's own keys on top of the combobox's: Escape leaves to the items, Backspace
 * in an empty input edits the last chip, and Tab accepts the highlighted suggestion like Enter.
 * `editing` names the chip being edited while its text is still untouched, to announce it.
 */
export function useSearchKeys({
	isOpen,
	query,
	filters,
	onSearchChange,
	onCommit,
	onEscape,
	complete,
}: SearchKeysOptions) {
	const [edited, setEdited] = useState<{ label: string; text: string }>()

	function onKeyDown(event: SearchKeyEvent) {
		const input = event.currentTarget
		const option = isOpen ? highlightedOption(input) : null
		setEdited(undefined)
		// A first Escape closes the suggestions; with them closed, Escape clears the text only
		// (the combobox would also clear the tokens) and moves to the items.
		if (event.key === "Escape" && !isOpen) {
			event.preventBaseUIHandler?.()
			event.preventDefault()
			onEscape()
		} else if (event.key === "Backspace" && input.value === "") {
			const { edited: label, ...change } = editLastChip({ query, filters })
			if (!label) return
			// The combobox would remove the whole chip.
			event.preventBaseUIHandler?.()
			event.preventDefault()
			setEdited({ label, text: change.query })
			onSearchChange({ ...change, query: "" })
			// Typed once the chip is gone, so its suggestions open with the first highlighted.
			queueMicrotask(() => complete(change.query))
		} else if (event.key === "Tab" && !event.shiftKey && option) {
			event.preventBaseUIHandler?.()
			event.preventDefault()
			// The combobox's Enter clicks the highlighted item too, so both take the same path.
			option.click()
		} else if (event.key === "Tab" || (event.key === "Enter" && !option)) {
			onCommit()
		}
	}

	return {
		onKeyDown,
		editing: edited?.text === query ? edited.label : undefined,
	}
}

function highlightedOption(input: HTMLInputElement) {
	const id = input.getAttribute("aria-activedescendant")
	return id ? input.ownerDocument.getElementById(id) : null
}
