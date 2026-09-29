import { normalizeSearchText } from "@/lib/normalize-search-text"
import type { Item } from "../../../../scripts/sync-data/schemas/item"

/** Items whose name contains the query, ignoring case, accents, punctuation and spaces. */
export function filterItemsByName<T extends Pick<Item, "name">>(
	items: readonly T[],
	query: string,
) {
	const normalizedQuery = normalizeSearchText(query)
	if (!normalizedQuery) return [...items]
	return items.filter((item) =>
		normalizeSearchText(item.name).includes(normalizedQuery),
	)
}
