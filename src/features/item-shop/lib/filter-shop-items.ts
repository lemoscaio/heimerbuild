import type { Item } from "@schemas/item"
import { filterItemsByConditions } from "./filter-items-by-conditions"
import { filterItemsByName } from "./filter-items-by-name"
import { filterItemsByRole } from "./filter-items-by-role"
import { filterItemsByStats } from "./filter-items-by-stats"
import { nameSearchText, type ShopFilters } from "./shop-query"

type ShopSearch = { filters: ShopFilters; query: string }

/** The items the shop shows for a role, stats, conditions and name search, in shop order. */
export function filterShopItems(
	items: readonly Item[],
	{ filters: { role, stats, match, conditions }, query }: ShopSearch,
) {
	return filterItemsByConditions(
		filterItemsByStats(
			filterItemsByName(filterItemsByRole(items, role), nameSearchText(query)),
			stats,
			{ match },
		),
		conditions,
		{ allItems: items },
	)
}
