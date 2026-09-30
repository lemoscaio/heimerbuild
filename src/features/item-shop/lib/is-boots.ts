import type { Item } from "../../../../scripts/sync-data/schemas/item"

/** Gunmetal Greaves lacks the Boots tag in some patches but shares the boots group limit. */
export function isBoots({
	tags,
	groupLimits,
}: Pick<Item, "tags" | "groupLimits">) {
	return (
		tags.includes("Boots") || groupLimits.some(({ group }) => group === "Boots")
	)
}
