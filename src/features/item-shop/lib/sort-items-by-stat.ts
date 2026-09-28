import type { Item, StatKey } from "../../../../scripts/sync-data/schemas/item"
import { hasStat } from "./filter-items-by-stats"

export type SortDirection = "desc" | "asc"

export type ItemSort = { stat: StatKey; direction: SortDirection }

/** Sorts by a stat; items without it go last in both directions. Ties keep their order. */
export function sortItemsByStat<T extends Pick<Item, "stats">>(
	items: readonly T[],
	{ stat, direction }: ItemSort,
) {
	const sign = direction === "desc" ? -1 : 1
	return items.toSorted((a, b) => {
		const aHas = hasStat(a, stat)
		const bHas = hasStat(b, stat)
		if (aHas !== bHas) {
			return aHas ? -1 : 1
		}
		return aHas ? sign * ((a.stats[stat] ?? 0) - (b.stats[stat] ?? 0)) : 0
	})
}
