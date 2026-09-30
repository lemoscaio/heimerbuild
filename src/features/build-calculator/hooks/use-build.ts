import { useState } from "react"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { track } from "@/lib/analytics/analytics"
import { computeStats } from "@/lib/stats/compute-stats"
import { MIN_LEVEL } from "@/lib/stats/growth"
import {
	addItemId,
	knownItemIds,
	MAX_ITEMS,
	removeItemAt,
} from "../lib/build-items"
import {
	type BuildSearch,
	type BuildView,
	toBuildSearch,
} from "../lib/build-search"
import { recordRecentBuild } from "../services/recent-builds"

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
	const [selectedItemId, setSelectedItemId] = useState<string>()

	const level = search.lvl ?? MIN_LEVEL
	const view: BuildView = search.view ?? "overview"
	// Until the items load, keep the ids from the link so a level change does not drop them.
	const itemIds = itemsById
		? knownItemIds(search.items, itemsById)
		: (search.items ?? [])
	const items = itemsById ? itemIds.map((id) => itemsById[id]) : []
	const stats = champion && computeStats(champion, level, items)
	const selectedItem = selectedItemId ? itemsById?.[selectedItemId] : undefined
	const preview =
		champion && selectedItem
			? {
					itemName: selectedItem.name,
					stats: computeStats(champion, level, [...items, selectedItem]),
				}
			: undefined
	const isFull = itemIds.length >= MAX_ITEMS

	// Edits keep the link's own patch: changing it would reload the route mid-edit.
	// Each edit also lists the build in the home page's recent builds (this browser only).
	function saveBuild(
		next: { level: number; itemIds: readonly string[] },
		navigation: { replace: boolean },
	) {
		onSearchChange(
			toBuildSearch({ ...next, patch: search.patch, view }),
			navigation,
		)
		recordRecentBuild({
			championKey,
			level: next.level,
			itemIds: [...next.itemIds],
			patch: search.patch,
		})
	}

	function setLevel(nextLevel: number) {
		saveBuild({ level: nextLevel, itemIds }, { replace: true })
	}

	function setItemIds(nextItemIds: readonly string[]) {
		saveBuild({ level, itemIds: nextItemIds }, { replace: false })
	}

	function addItem(itemId: string) {
		if (!itemsById) return
		const nextItemIds = addItemId(itemIds, itemId)
		if (nextItemIds) {
			setNotice(undefined)
			setSelectedItemId(undefined)
			setItemIds(nextItemIds)
			track("item_added", { itemId })
		} else {
			setNotice(`All ${MAX_ITEMS} item slots are full. Remove an item first.`)
		}
	}

	function setView(nextView: BuildView) {
		onSearchChange(
			toBuildSearch({ level, itemIds, patch: search.patch, view: nextView }),
			{ replace: false },
		)
	}

	function selectItem(itemId: string) {
		if (itemId === selectedItemId) return
		setSelectedItemId(itemId)
		track("shop_item_selected", { itemId })
	}

	function removeItem(slot: number) {
		const itemId = itemIds[slot]
		setNotice(undefined)
		setItemIds(removeItemAt(itemIds, slot))
		if (itemId) {
			track("item_removed", { itemId })
		}
	}

	return {
		champion,
		level,
		setLevel,
		/** The overview workbench or the expanded shop, kept in the URL. */
		view,
		setView,
		items,
		addItem,
		removeItem,
		/** Why the last item could not be added (full build), until the next change. */
		notice,
		isFull,
		/** The shop item picked for a closer look, not in the build yet. */
		selectedItem,
		selectItem,
		clearSelection: () => setSelectedItemId(undefined),
		stats,
		/** The stats with the selected item added, while one is selected. */
		preview,
		/** The full build for sharing, pinned to the patch in use. */
		shareSearch: toBuildSearch({ level, itemIds, patch, view }),
	}
}
