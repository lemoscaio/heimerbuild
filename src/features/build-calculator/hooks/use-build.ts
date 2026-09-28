import { useState } from "react"
import { useChampion } from "@/data/hooks/use-champion"
import { useItems } from "@/data/hooks/use-items"
import { computeStats } from "@/lib/stats/compute-stats"
import { MIN_LEVEL } from "@/lib/stats/growth"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { toggleItemId } from "../lib/build-items"

/** Champion, level and chosen items of the build, plus the stats they add up to. */
export function useBuild(patch: string, championKey: string) {
	const { data: champion } = useChampion(patch, championKey)
	const { data: itemsById } = useItems(patch)
	const [level, setLevel] = useState(MIN_LEVEL)
	const [itemIds, setItemIds] = useState<string[]>([])

	const items = itemsById
		? itemIds.flatMap((id): Item[] => (itemsById[id] ? [itemsById[id]] : []))
		: []
	const stats = champion && computeStats(champion, level, items)

	function toggleItem(itemId: string) {
		setItemIds((current) => toggleItemId(current, itemId))
	}

	return { champion, level, setLevel, items, toggleItem, stats }
}
