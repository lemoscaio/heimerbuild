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
export const ITEM_OVERRIDES: readonly ItemOverride[] = [
	defineItemOverride({
		id: "gunmetal-greaves-boots-tag",
		itemId: "3172",
		field: "tags",
		since: "16.19",
		reason:
			"Riot data has no Boots tag (it has NonbootsMovement), but it is the Berserker's Greaves upgrade and shares the Boots group limit",
		source: "https://github.com/lemoscaio/heimerbuild/issues/159",
		apply: (tags) => [...tags, "Boots"],
	}),
]
