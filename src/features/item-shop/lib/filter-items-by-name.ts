import type { Item } from "@schemas/item"
import { normalizeSearchText } from "@/lib/normalize-search-text"

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
