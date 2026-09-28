import { useState } from "react"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { computeStats } from "@/lib/stats/compute-stats"
import { MIN_LEVEL } from "@/lib/stats/growth"
import {
	type AddItemResult,
	addItemId,
	allowedItemIds,
	MAX_ITEMS,
	removeItemAt,
} from "../lib/build-items"
import { type BuildSearch, toBuildSearch } from "../lib/build-search"

type UseBuildOptions = {
	patch: string
	championKey: string
	/** The build as read from the URL. */
	search: BuildSearch
	onSearchChange: (
		search: BuildSearch,
		navigation: { replace: boolean },
	) => void
}

/** Build state kept in the URL search: champion, level and chosen items, plus their stats. */
export function useBuild({
	patch,
	championKey,
	search,
	onSearchChange,
}: UseBuildOptions) {
	const { data: champion } = useChampion(patch, championKey)
	const { data: itemsById } = useItems(patch)
	const [notice, setNotice] = useState<string>()

	const level = search.lvl ?? MIN_LEVEL
	// Until the items load, keep the ids from the link so a level change does not drop them.
	const itemIds = itemsById
		? allowedItemIds(search.items, itemsById)
		: (search.items ?? [])
	const items = itemsById ? itemIds.map((id) => itemsById[id]) : []
	const stats = champion && computeStats(champion, level, items)

	// Edits keep the link's own patch: changing it would reload the route mid-edit.
	function setLevel(nextLevel: number) {
		onSearchChange(
			toBuildSearch({ level: nextLevel, itemIds, patch: search.patch }),
			{ replace: true },
		)
	}

	function setItemIds(nextItemIds: readonly string[]) {
		onSearchChange(
			toBuildSearch({ level, itemIds: nextItemIds, patch: search.patch }),
			{ replace: false },
		)
	}

	function addItem(itemId: string) {
		if (!itemsById) return
		const result = addItemId(itemIds, itemId, itemsById)
		if (result.added) {
			setNotice(undefined)
			setItemIds(result.itemIds)
		} else {
			setNotice(rejectionNotice(result, itemId, itemsById))
		}
	}

	function removeItem(slot: number) {
		setNotice(undefined)
		setItemIds(removeItemAt(itemIds, slot))
	}

	return {
		champion,
		level,
		setLevel,
		items,
		addItem,
		removeItem,
		/** Why the last item could not be added, until the next change. */
		notice,
		stats,
		/** The full build for sharing, pinned to the patch in use. */
		shareSearch: toBuildSearch({ level, itemIds, patch }),
	}
}

function rejectionNotice(
	result: Exclude<AddItemResult, { added: true }>,
	itemId: string,
	itemsById: Record<string, { name: string }>,
) {
	if (result.reason === "full") {
		return `All ${MAX_ITEMS} item slots are full. Remove an item first.`
	}
	const { name } = itemsById[itemId]
	const conflict = itemsById[result.conflictId].name
	return name === conflict
		? `A build can hold only one ${name}.`
		: `${name} cannot be combined with ${conflict}.`
}
