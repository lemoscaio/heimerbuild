import type { Item } from "@schemas/item"
import { filterItemsByName } from "./filter-items-by-name"
import { filterItemsByRole } from "./filter-items-by-role"
import { filterItemsByStats } from "./filter-items-by-stats"
import type { ShopFilters } from "./shop-query"

type ShopSearch = { filters: ShopFilters; query: string }

/** The items the shop shows for a role, stats and name search, in shop order. */
export function filterShopItems(
	items: readonly Item[],
	{ filters: { role, stats, match }, query }: ShopSearch,
) {
	return filterItemsByStats(
		filterItemsByName(filterItemsByRole(items, role), query),
		stats,
		{ match },
	)
}
