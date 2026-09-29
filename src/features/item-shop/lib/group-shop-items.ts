import type { Item } from "../../../../scripts/sync-data/schemas/item"

export type ShopSectionKey = "starter" | "boots" | "legendary"

type ShopItem = Pick<Item, "tags" | "into" | "groupLimits">

export type ShopSection<T extends ShopItem> = {
	key: ShopSectionKey
	title: string
	items: T[]
}

const sectionTitles: Record<ShopSectionKey, string> = {
	starter: "Starter & basic",
	boots: "Boots",
	legendary: "Legendary",
}

const sectionOrder: readonly ShopSectionKey[] = [
	"starter",
	"boots",
	"legendary",
]

// Starters (Doran's, support and jungle items), potions, wards and trinkets build into nothing.
const STARTER_TAGS = new Set(["Lane", "Jungle", "Consumable", "Trinket"])

/** Gunmetal Greaves lacks the Boots tag but shares the boots group limit. */
function isBoots({ tags, groupLimits }: ShopItem) {
	return (
		tags.includes("Boots") || groupLimits.some(({ group }) => group === "Boots")
	)
}

export function shopSectionOf(item: ShopItem): ShopSectionKey {
	if (isBoots(item)) return "boots"
	if (item.into.length || item.tags.some((tag) => STARTER_TAGS.has(tag))) {
		return "starter"
	}
	return "legendary"
}

/** The shop's sections in shop order, each keeping the items' order; empty sections are left out. */
export function groupShopItems<T extends ShopItem>(
	items: readonly T[],
): ShopSection<T>[] {
	const sections = items.map(shopSectionOf)
	return sectionOrder.flatMap((key) => {
		const sectionItems = items.filter((_, index) => sections[index] === key)
		return sectionItems.length
			? [{ key, title: sectionTitles[key], items: sectionItems }]
			: []
	})
}
