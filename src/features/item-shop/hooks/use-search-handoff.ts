import { useRef } from "react"

/**
 * Hands focus to the search when a menu closes after `handOff()`, then opens its suggestions
 * for the text just put there. Otherwise the menu returns focus to its trigger.
 */
export function useSearchHandoff(
	inputRef: React.RefObject<HTMLInputElement | null>,
	openSuggestions: () => void,
) {
	const pending = useRef(false)

	function handOff() {
		pending.current = true
	}

	/** For the menu's `finalFocus`. */
	function finalFocus() {
		if (!pending.current) return true
		pending.current = false
		// Open once focus has moved, or the menu's closing would dismiss the suggestions.
		requestAnimationFrame(openSuggestions)
		return inputRef.current
	}

	return { handOff, finalFocus }
}
