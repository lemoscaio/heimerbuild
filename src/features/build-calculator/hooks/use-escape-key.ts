import { useEffect } from "react"

/** Calls `onEscape` for Escape pressed anywhere, unless a field or a popup handled it. */
export function useEscapeKey(onEscape: () => void) {
	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key !== "Escape" || event.defaultPrevented) return
			if (
				event.target instanceof HTMLElement &&
				event.target.closest("input, textarea, [contenteditable]")
			) {
				return
			}
			onEscape()
		}
		window.addEventListener("keydown", handleKeyDown)
		return () => window.removeEventListener("keydown", handleKeyDown)
	}, [onEscape])
}
