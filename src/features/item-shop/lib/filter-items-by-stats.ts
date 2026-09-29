import type { Item, StatKey } from "../../../../scripts/sync-data/schemas/item"

/** `all`: the item gives every selected stat (AND). `any`: at least one (OR). */
export type StatMatch = "all" | "any"

type FilterItemsByStatsOptions = { match?: StatMatch }

export function hasStat(item: Pick<Item, "stats">, stat: StatKey) {
	return (item.stats[stat] ?? 0) !== 0
}

/** Items that give the selected stats. No selection keeps every item, whatever the match. */
export function filterItemsByStats<T extends Pick<Item, "stats">>(
	items: readonly T[],
	stats: readonly StatKey[],
	{ match = "all" }: FilterItemsByStatsOptions = {},
) {
	if (!stats.length) return [...items]
	return items.filter((item) =>
		match === "all"
			? stats.every((stat) => hasStat(item, stat))
			: stats.some((stat) => hasStat(item, stat)),
	)
}
