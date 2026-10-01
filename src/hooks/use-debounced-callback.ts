import { useEffect, useRef } from "react"

/** Calls `callback` once calls stop for `delayMs`, with the last arguments. Pending calls drop on unmount. */
export function useDebouncedCallback<Args extends unknown[]>(
	callback: (...args: Args) => void,
	delayMs: number,
) {
	const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => () => clearTimeout(timeoutRef.current), [])

	return function debounced(...args: Args) {
		clearTimeout(timeoutRef.current)
		timeoutRef.current = setTimeout(() => callback(...args), delayMs)
	}
}
