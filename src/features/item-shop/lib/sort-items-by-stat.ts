import type { Item, StatKey } from "@schemas/item"

export type SortDirection = "desc" | "asc"

export type ItemSort = { stat: StatKey; direction: SortDirection }

/** Sorts by a stat, counting items without it as 0 (first when lowest first). Ties keep their order. */
export function sortItemsByStat<T extends Pick<Item, "stats">>(
	items: readonly T[],
	{ stat, direction }: ItemSort,
) {
	const sign = direction === "desc" ? -1 : 1
	return items.toSorted(
		(a, b) => sign * ((a.stats[stat] ?? 0) - (b.stats[stat] ?? 0)),
	)
}
