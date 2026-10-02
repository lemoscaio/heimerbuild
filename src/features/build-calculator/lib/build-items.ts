export const MAX_ITEMS = 6

/** Adds the item to the first free slot, copies and group limits included; `undefined` when the build is full. */
export function addItemId(itemIds: readonly string[], itemId: string) {
	if (itemIds.length >= MAX_ITEMS) return undefined
	return [...itemIds, itemId]
}

export function removeItemAt(itemIds: readonly string[], slot: number) {
	return itemIds.filter((_, index) => index !== slot)
}

/** Item ids from a link that exist in this patch, in link order, up to the slot count. */
export function knownItemIds(
	itemIds: readonly string[] | undefined,
	itemsById: Readonly<Record<string, unknown>>,
) {
	return (itemIds ?? [])
		.filter((id) => Object.hasOwn(itemsById, id))
		.slice(0, MAX_ITEMS)
}

/**
 * The build's items from a link's ids: the known ones once the items load. Until then the ids stay
 * as given, so an edit elsewhere in the build does not drop them.
 */
export function readBuildItems<Item>(
	itemIds: readonly string[],
	itemsById: Readonly<Record<string, Item>> | undefined,
): { ids: readonly string[]; items: Item[] } {
	if (!itemsById) return { ids: itemIds, items: [] }
	const ids = knownItemIds(itemIds, itemsById)
	return { ids, items: ids.map((id) => itemsById[id]) }
}
