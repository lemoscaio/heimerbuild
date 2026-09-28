import type { Item } from "../../../../scripts/sync-data/schemas/item"

export const MAX_ITEMS = 6

type LimitedItem = Pick<Item, "groupLimits">
type ItemsById = Readonly<Record<string, LimitedItem>>

export type AddItemResult =
	| { added: true; itemIds: string[] }
	| { added: false; reason: "full" }
	| { added: false; reason: "limit"; conflictId: string }

/** The first item in the build that already fills a group limit of `itemId`. */
function limitConflict(
	itemIds: readonly string[],
	itemId: string,
	itemsById: ItemsById,
) {
	for (const { group, max } of itemsById[itemId]?.groupLimits ?? []) {
		const inGroup = itemIds.filter((id) =>
			itemsById[id]?.groupLimits.some((limit) => limit.group === group),
		)
		if (inGroup.length >= max) return inGroup[0]
	}
	return undefined
}

/** Adds the item to the first free slot, unless the build is full or a group limit (one pair of boots) is reached. */
export function addItemId(
	itemIds: readonly string[],
	itemId: string,
	itemsById: ItemsById,
): AddItemResult {
	if (itemIds.length >= MAX_ITEMS) return { added: false, reason: "full" }
	const conflictId = limitConflict(itemIds, itemId, itemsById)
	if (conflictId !== undefined) {
		return { added: false, reason: "limit", conflictId }
	}
	return { added: true, itemIds: [...itemIds, itemId] }
}

export function removeItemAt(itemIds: readonly string[], slot: number) {
	return itemIds.filter((_, index) => index !== slot)
}

/** Item ids from a link that exist in this patch and respect the group limits, in link order. */
export function allowedItemIds(
	itemIds: readonly string[] | undefined,
	itemsById: ItemsById,
) {
	let allowed: string[] = []
	for (const id of itemIds ?? []) {
		if (!Object.hasOwn(itemsById, id)) continue
		const result = addItemId(allowed, id, itemsById)
		if (result.added) allowed = result.itemIds
	}
	return allowed
}
