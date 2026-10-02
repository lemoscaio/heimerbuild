import type { Item } from "@schemas/item"
import { useState } from "react"
import { track } from "@/lib/analytics/analytics"
import {
	addItemId,
	MAX_ITEMS,
	readBuildItems,
	removeItemAt,
} from "../lib/build-items"

type UseBuildItemsOptions = {
	/** This patch's items; undefined while they load. */
	itemsById: Readonly<Record<string, Item>> | undefined
	/** The chosen item ids, in slot order. */
	value: readonly string[]
	onChange: (itemIds: readonly string[]) => void
}

export type BuildItems = ReturnType<typeof useBuildItems>

/** The build's chosen items, controlled by `value`, with the full-build notice and the announcement. */
export function useBuildItems({
	itemsById,
	value,
	onChange,
}: UseBuildItemsOptions) {
	const [notice, setNotice] = useState<string>()
	const [announcement, setAnnouncement] = useState<string>()
	const { ids, items } = readBuildItems(value, itemsById)

	/** Returns whether the item went in: a full build keeps it out and shows `notice`. */
	function add(itemId: string) {
		if (!itemsById) return false
		const nextIds = addItemId(ids, itemId)
		if (!nextIds) {
			setNotice(`All ${MAX_ITEMS} item slots are full. Remove an item first.`)
			return false
		}
		setNotice(undefined)
		setAnnouncement(
			`Added ${itemsById[itemId]?.name}, ${nextIds.length} of ${MAX_ITEMS} item slots filled`,
		)
		onChange(nextIds)
		track("item_added", { itemId })
		return true
	}

	function remove(slot: number) {
		const itemId = ids[slot]
		setNotice(undefined)
		setAnnouncement(undefined)
		onChange(removeItemAt(ids, slot))
		if (itemId) {
			track("item_removed", { itemId })
		}
	}

	return {
		/** The checked ids: known items only, the given ones while the items load. */
		ids,
		/** The chosen items, in slot order. */
		list: items,
		isFull: ids.length >= MAX_ITEMS,
		add,
		remove,
		/** Why the last item could not be added (full build), until the next change. */
		notice,
		/** The last item added, for screen readers, until an item is removed. */
		announcement,
	}
}
