export const MAX_ITEMS = 6

/** Adds the item when it is not in the build and a slot is free, removes it when it is. */
export function toggleItemId(itemIds: readonly string[], itemId: string) {
	if (itemIds.includes(itemId)) {
		return itemIds.filter((id) => id !== itemId)
	}
	return itemIds.length < MAX_ITEMS ? [...itemIds, itemId] : [...itemIds]
}
