import { useRef, useState } from "react"
import { moveRovingIndex } from "../lib/move-roving-index"

/**
 * Makes a wrapped grid of items one Tab stop: arrow keys, Home and End move focus.
 * The Tab stop stays on the last focused item while it is listed, else the first.
 */
export function useRovingFocus(keys: readonly string[]) {
	const containerRef = useRef<HTMLFieldSetElement>(null)
	const [focusedKey, setFocusedKey] = useState<string>()
	const activeKey =
		focusedKey !== undefined && keys.includes(focusedKey) ? focusedKey : keys[0]

	function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
		const elements = rovingItems(containerRef.current)
		const index = activeKey === undefined ? -1 : keys.indexOf(activeKey)
		if (index < 0 || event.altKey || event.ctrlKey || event.metaKey) return
		const next = moveRovingIndex(index, event.key, {
			count: keys.length,
			columns: countColumns(elements),
		})
		if (next === undefined) return
		event.preventDefault()
		setFocusedKey(keys[next])
		elements[next]?.focus()
	}

	function getItemProps(key: string) {
		return {
			"data-roving-item": "",
			tabIndex: key === activeKey ? 0 : -1,
			onFocus: () => setFocusedKey(key),
		}
	}

	return { containerRef, handleKeyDown, getItemProps }
}

function rovingItems(container: HTMLElement | null) {
	return [
		...(container?.querySelectorAll<HTMLElement>("[data-roving-item]") ?? []),
	]
}

/** Items in the first row: all rows but the last are full. */
function countColumns(elements: readonly HTMLElement[]) {
	const top = elements[0]?.offsetTop
	const firstRow = elements.findIndex((element) => element.offsetTop !== top)
	return firstRow < 0 ? elements.length || 1 : firstRow
}
