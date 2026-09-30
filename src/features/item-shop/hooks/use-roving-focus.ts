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
			rows: countRows(elements),
		})
		if (next === undefined) return
		event.preventDefault()
		setFocusedKey(keys[next])
		elements[next]?.focus()
	}

	function getItemProps(key: string) {
		return {
			"data-roving-item": key,
			tabIndex: key === activeKey ? 0 : -1,
			onFocus: () => setFocusedKey(key),
		}
	}

	return { containerRef, handleKeyDown, getItemProps }
}

/** Focuses the grid's Tab stop inside `container`, if it lists any item. */
export function focusRovingTabStop(container: HTMLElement | null) {
	rovingItems(container)
		.find((element) => element.tabIndex === 0)
		?.focus()
}

/** Focuses the item listed under `key` inside `container`, else the grid's Tab stop. */
export function focusRovingItem(container: HTMLElement | null, key: string) {
	const item = rovingItems(container).find(
		(element) => element.dataset.rovingItem === key,
	)
	if (item) item.focus()
	else focusRovingTabStop(container)
}

function rovingItems(container: HTMLElement | null) {
	return [
		...(container?.querySelectorAll<HTMLElement>("[data-roving-item]") ?? []),
	]
}

/** Items per visual row, in order: a new row starts wherever the top edge changes. */
function countRows(elements: readonly HTMLElement[]) {
	const rows: number[] = []
	let top: number | undefined
	for (const element of elements) {
		const elementTop = Math.round(element.getBoundingClientRect().top)
		if (elementTop === top) {
			rows[rows.length - 1] = (rows.at(-1) ?? 0) + 1
		} else {
			rows.push(1)
			top = elementTop
		}
	}
	return rows
}
