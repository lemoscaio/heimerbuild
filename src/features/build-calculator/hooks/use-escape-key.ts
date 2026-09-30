import { useEffect, useEffectEvent } from "react"

/** Calls `onEscape` for Escape pressed anywhere, unless a field or a popup handled it. */
export function useEscapeKey(onEscape: () => void) {
	// The listener stays attached across renders and always calls the latest callback.
	const handleEscape = useEffectEvent(onEscape)

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape" || event.defaultPrevented) return
			if (
				event.target instanceof HTMLElement &&
				event.target.closest("input, textarea, [contenteditable]")
			) {
				return
			}
			handleEscape()
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [])
}
