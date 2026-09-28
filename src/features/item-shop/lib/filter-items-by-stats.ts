import type { Item, StatKey } from "../../../../scripts/sync-data/schemas/item"

export function hasStat(item: Pick<Item, "stats">, stat: StatKey) {
	return (item.stats[stat] ?? 0) !== 0
}

/** Items that give every selected stat (AND). No selection keeps every item. */
export function filterItemsByStats<T extends Pick<Item, "stats">>(
	items: readonly T[],
	stats: readonly StatKey[],
) {
	return items.filter((item) => stats.every((stat) => hasStat(item, stat)))
}
