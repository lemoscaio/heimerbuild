import { useState } from "react"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { useRunes } from "@/data/hooks/use-runes"
import { track } from "@/lib/analytics/analytics"
import {
	EMPTY_RUNE_SELECTION,
	parseRuneSelection,
	type RuneSelection,
	selectedShards,
	serializeRuneSelection,
} from "@/lib/rune-selection"
import { computeStats, type ItemInput } from "@/lib/stats/compute-stats"
import { MIN_LEVEL } from "@/lib/stats/growth"
import { shardStatsInput } from "@/lib/stats/rune-shards"
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

export type Build = ReturnType<typeof useBuild>

/**
 * Build state kept in the URL search: champion, level, items and runes, plus their stats.
 * No page state: the view and the item selection live in `useBuildPage`.
 */
export function useBuild({
	patch,
	championKey,
	search,
	onSearchChange,
}: UseBuildOptions) {
	const { data: champion } = useChampion(patch, championKey)
	const { data: itemsById } = useItems(patch)
	const [notice, setNotice] = useState<string>()
	const [announcement, setAnnouncement] = useState<string>()

	const level = search.lvl ?? MIN_LEVEL
	// Until the items load, keep the ids from the link so a level change does not drop them.
	const itemIds = itemsById
		? knownItemIds(search.items, itemsById)
		: (search.items ?? [])
	const items = itemsById ? itemIds.map((id) => itemsById[id]) : []
	const { data: runesFile } = useRunes(patch)
	const runeSelection = runesFile
		? parseRuneSelection(search.runes, runesFile)
		: EMPTY_RUNE_SELECTION
	// Until the runes load, keep the link's value so other edits do not drop it.
	const runes = runesFile ? serializeRuneSelection(runeSelection) : search.runes
	const shards = runesFile ? selectedShards(runeSelection, runesFile) : []

	/** Stats of `buildItems` plus the chosen stat shards (Adaptive Force depends on the items). */
	function statsWith(buildItems: readonly ItemInput[]) {
		if (!champion) return undefined
		const shardInput = shardStatsInput(shards, {
			level,
			defaultAdaptiveType: champion.adaptiveType,
			items: buildItems,
		})
		return computeStats(champion, level, [...buildItems, shardInput])
	}

	const stats = statsWith(items)
	const statsWithoutRunes = champion && computeStats(champion, level, items)
	const runesPreview =
		shards.length && stats ? { label: "stat shards", stats } : undefined
	const isFull = itemIds.length >= MAX_ITEMS

	// Edits keep the link's own patch: changing it would reload the route mid-edit.
	// Each edit also lists the build in the home page's recent builds (this browser only).
	function saveBuild(
		next: { level: number; itemIds: readonly string[] },
		navigation: { replace: boolean },
	) {
		onSearchChange(
			toBuildSearch({ ...next, patch: search.patch, runes }),
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

	/** Returns whether the item went in: a full build keeps it out and shows `notice`. */
	function addItem(itemId: string) {
		if (!itemsById) return false
		const nextItemIds = addItemId(itemIds, itemId)
		if (!nextItemIds) {
			setNotice(`All ${MAX_ITEMS} item slots are full. Remove an item first.`)
			return false
		}
		setNotice(undefined)
		setAnnouncement(
			`Added ${itemsById[itemId]?.name}, ${nextItemIds.length} of ${MAX_ITEMS} item slots filled`,
		)
		setItemIds(nextItemIds)
		track("item_added", { itemId })
		return true
	}

	// Each pick replaces the history entry, like the level: Back leaves the page, not one rune.
	function setRunes(nextSelection: RuneSelection) {
		onSearchChange(
			toBuildSearch({
				level,
				itemIds,
				patch: search.patch,
				runes: serializeRuneSelection(nextSelection),
			}),
			{ replace: true },
		)
	}

	function removeItem(slot: number) {
		const itemId = itemIds[slot]
		setNotice(undefined)
		setAnnouncement(undefined)
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
		/** The last item added, for screen readers, until an item is removed. */
		announcement,
		isFull,
		/** The rune page read from the URL, checked against this patch's runes. */
		runeSelection,
		setRunes,
		/** Totals with items and stat shards. */
		stats,
		/** Totals without the stat shards: the base of the runes preview. */
		statsWithoutRunes,
		/** The totals with `item` added to the build: the preview of a shop item. */
		statsWithItem: (item: ItemInput) => statsWith([...items, item]),
		/** `stats` labelled as the shards' effect, while at least one shard is chosen. */
		runesPreview,
		/** The build as the URL reads it: known items, checked runes, the link's own patch. */
		buildSearch: toBuildSearch({ level, itemIds, patch: search.patch, runes }),
		/** The full build for sharing, pinned to the patch in use. */
		shareSearch: toBuildSearch({ level, itemIds, patch, runes }),
	}
}
