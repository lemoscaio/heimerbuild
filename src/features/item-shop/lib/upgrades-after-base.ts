import type { Item } from "@schemas/item"

/** The items in shop order with each free upgrade right after its base item (Muramana after Manamune). */
export function upgradesAfterBase<
	T extends Pick<Item, "id" | "transformsFrom">,
>(items: readonly T[]): T[] {
	const ids = new Set(items.map(({ id }) => id))
	const placed = (item: T) =>
		!!item.transformsFrom && ids.has(item.transformsFrom)
	return items
		.filter((item) => !placed(item))
		.flatMap((item) => [
			item,
			...items.filter(
				(upgrade) => placed(upgrade) && upgrade.transformsFrom === item.id,
			),
		])
}
