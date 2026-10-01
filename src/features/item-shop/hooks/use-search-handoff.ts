import { useRef } from "react"

/**
 * Hands focus to the search when a menu closes after `handOff(then)`, then runs `then` (such
 * as typing a filter's prefix there). Otherwise the menu returns focus to its trigger.
 */
export function useSearchHandoff(
	inputRef: React.RefObject<HTMLInputElement | null>,
) {
	const pending = useRef<() => void>(undefined)

	function handOff(then: () => void) {
		pending.current = then
	}

	/** For the menu's `finalFocus`. */
	function finalFocus() {
		const then = pending.current
		if (!then) return true
		pending.current = undefined
		// Run once focus has moved, or the menu's closing would dismiss the suggestions.
		requestAnimationFrame(then)
		return inputRef.current
	}

	return { handOff, finalFocus }
}
