import { useEffect, useState } from "react"
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
import { type BuildSearch, toBuildSearch } from "../lib/build-search"
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

	const level = search.lvl ?? MIN_LEVEL
	// Until the items load, keep the ids from the link so a level change does not drop them.
	const itemIds = itemsById
		? knownItemIds(search.items, itemsById)
		: (search.items ?? [])
	const items = itemsById ? itemIds.map((id) => itemsById[id]) : []
	const stats = champion && computeStats(champion, level, items)

	// Opening or editing a build lists it in the home page's recent builds (this browser only).
	const hasChampion = !!champion
	const itemIdsKey = itemIds.join(",")
	useEffect(() => {
		if (!hasChampion) return
		recordRecentBuild({
			championKey,
			level,
			itemIds: itemIdsKey ? itemIdsKey.split(",") : [],
			patch: search.patch,
		})
	}, [hasChampion, championKey, level, itemIdsKey, search.patch])

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
		const nextItemIds = addItemId(itemIds, itemId)
		if (nextItemIds) {
			setNotice(undefined)
			setItemIds(nextItemIds)
			track("item_added", { itemId })
		} else {
			setNotice(`All ${MAX_ITEMS} item slots are full. Remove an item first.`)
		}
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
		items,
		addItem,
		removeItem,
		/** Why the last item could not be added (full build), until the next change. */
		notice,
		stats,
		/** The full build for sharing, pinned to the patch in use. */
		shareSearch: toBuildSearch({ level, itemIds, patch }),
	}
}
