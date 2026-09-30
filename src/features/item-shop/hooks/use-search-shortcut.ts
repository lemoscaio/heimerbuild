import { useEffect } from "react"
import { isSearchShortcut } from "../lib/is-search-shortcut"

/** Focuses the input when `/` is pressed anywhere on the page outside a text field. */
export function useSearchShortcut(
	inputRef: React.RefObject<HTMLInputElement | null>,
) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			const target = event.target instanceof HTMLElement ? event.target : null
			if (!isSearchShortcut({ ...pickKeys(event), target })) return
			// Otherwise the slash is typed into the input once it has focus.
			event.preventDefault()
			inputRef.current?.focus()
		}
		document.addEventListener("keydown", handleKeyDown)
		return () => document.removeEventListener("keydown", handleKeyDown)
	}, [inputRef])
}

function pickKeys({
	key,
	altKey,
	ctrlKey,
	metaKey,
	defaultPrevented,
}: KeyboardEvent) {
	return { key, altKey, ctrlKey, metaKey, defaultPrevented }
}
