import { useState, useSyncExternalStore } from "react"
import {
	parseStoredValue,
	readStoredString,
	removeLocalStorage,
	type StoredValueOptions,
	writeLocalStorage,
} from "@/lib/local-storage"

// The native `storage` event only reaches other tabs: writes here announce themselves.
const SAME_TAB_EVENT = "heimerbuild:local-storage"

type SetValue<Value> = (next: Value | ((previous: Value) => Value)) => void

/**
 * A value kept in this browser's localStorage, checked against its schema on every read
 * and shared by every hook on the same key, in this tab and others. API after usehooks-ts.
 */
export function useLocalStorage<Value>(
	key: string,
	options: StoredValueOptions<Value>,
): [value: Value, setValue: SetValue<Value>, remove: () => void] {
	const { storage } = options
	const stored = useSyncExternalStore(
		subscribe,
		() => readStoredString(key, { storage }),
		() => null,
	)
	// Full or blocked storage: the value lasts in this component until the page reloads.
	const [unsaved, setUnsaved] = useState<{ raw: string }>()
	const value = parseStoredValue(unsaved?.raw ?? stored, options)

	function setValue(next: Value | ((previous: Value) => Value)) {
		const resolved = next instanceof Function ? next(value) : next
		const saved = writeLocalStorage(key, resolved, { storage })
		setUnsaved(saved ? undefined : { raw: JSON.stringify(resolved) })
		window.dispatchEvent(new Event(SAME_TAB_EVENT))
	}

	function remove() {
		removeLocalStorage(key, { storage })
		setUnsaved(undefined)
		window.dispatchEvent(new Event(SAME_TAB_EVENT))
	}

	return [value, setValue, remove]
}

// Snapshots are per key, so a change to another key never re-renders.
function subscribe(onChange: () => void) {
	window.addEventListener("storage", onChange)
	window.addEventListener(SAME_TAB_EVENT, onChange)
	return () => {
		window.removeEventListener("storage", onChange)
		window.removeEventListener(SAME_TAB_EVENT, onChange)
	}
}
