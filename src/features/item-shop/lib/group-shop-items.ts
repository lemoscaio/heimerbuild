import type { Item } from "../../../../scripts/sync-data/schemas/item"

export type ShopSectionKey =
	| "starter"
	| "basic"
	| "epic"
	| "boots"
	| "legendary"

type ShopItem = Pick<Item, "tags" | "from" | "into" | "groupLimits">

export type ShopSection<T extends ShopItem> = {
	key: ShopSectionKey
	title: string
	items: T[]
}

const sectionTitles: Record<ShopSectionKey, string> = {
	starter: "Starter",
	basic: "Basic",
	epic: "Epic",
	boots: "Boots",
	legendary: "Legendary",
}

const sectionOrder: readonly ShopSectionKey[] = [
	"starter",
	"basic",
	"epic",
	"boots",
	"legendary",
]

// Potions, elixirs, wards and trinkets are starters even when they upgrade.
const CONSUMABLE_TAGS = new Set(["Consumable", "Trinket"])
// Doran's, support and jungle starters: lane items that build into nothing.
const STARTER_TAGS = new Set(["Lane", "Jungle"])

/** Gunmetal Greaves lacks the Boots tag but shares the boots group limit. */
function isBoots({ tags, groupLimits }: ShopItem) {
	return (
		tags.includes("Boots") || groupLimits.some(({ group }) => group === "Boots")
	)
}

/** The in-game shop tier of an item. */
export function shopSectionOf(item: ShopItem): ShopSectionKey {
	if (isBoots(item)) return "boots"
	if (item.tags.some((tag) => CONSUMABLE_TAGS.has(tag))) return "starter"
	if (item.into.length) return item.from.length ? "epic" : "basic"
	if (item.tags.some((tag) => STARTER_TAGS.has(tag))) return "starter"
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
