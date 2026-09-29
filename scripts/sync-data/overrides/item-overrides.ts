import type { Item } from "../schemas/item"
import type { DataOverride, FieldOverride } from "./apply-overrides"

export type ItemOverride = DataOverride<Item>

export function defineItemOverride<Field extends keyof Item>({
	itemId,
	...override
}: Omit<FieldOverride<Item, Field>, "target"> & {
	itemId: string
}): FieldOverride<Item, Field> {
	return { ...override, target: itemId }
}

/** Fixes for bugs in Riot's item data; see "Data overrides" in the README. */
export const ITEM_OVERRIDES: readonly ItemOverride[] = []
