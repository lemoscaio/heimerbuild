import type { Item } from "@schemas/item"
import type { ShopGrouping } from "@/types/shop-view"
import { isBoots } from "./is-boots"

export type ShopTier = "starter" | "basic" | "epic" | "boots" | "legendary"

export type ShopSectionKey = ShopTier | "components" | "all"

type ShopItem = Pick<Item, "epicness" | "tags" | "groupLimits">

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
	components: "Starter & basic",
	all: "All items",
}

/** The section each tier lands in, in section order, per grouping. */
const groupings: Record<ShopGrouping, Record<ShopTier, ShopSectionKey>> = {
	tiers: {
		starter: "starter",
		basic: "basic",
		epic: "epic",
		boots: "boots",
		legendary: "legendary",
	},
	compact: {
		starter: "components",
		basic: "components",
		epic: "components",
		boots: "boots",
		legendary: "legendary",
	},
	none: {
		starter: "all",
		basic: "all",
		epic: "all",
		boots: "all",
		legendary: "all",
	},
}

const tierOfEpicness: Record<Item["epicness"], ShopTier> = {
	0: "basic",
	1: "starter",
	4: "epic",
	5: "legendary",
	// Elixirs, listed with the potions and wards; tier-3 boots also carry 7, but isBoots runs first.
	7: "starter",
}

/** The in-game shop tier of an item. */
export function shopTierOf(item: ShopItem): ShopTier {
	return isBoots(item) ? "boots" : tierOfEpicness[item.epicness]
}

type GroupShopItemsOptions = {
	/** `tiers` (default): the five in-game tiers; `compact`: components merged; `none`: one list. */
	grouping?: ShopGrouping
}

/** The shop's sections in shop order, each keeping the items' order; empty sections are left out. */
export function groupShopItems<T extends ShopItem>(
	items: readonly T[],
	{ grouping = "tiers" }: GroupShopItemsOptions = {},
): ShopSection<T>[] {
	const sectionOfTier = groupings[grouping]
	const sections = items.map((item) => sectionOfTier[shopTierOf(item)])
	const sectionOrder = [...new Set(Object.values(sectionOfTier))]
	return sectionOrder.flatMap((key) => {
		const sectionItems = items.filter((_, index) => sections[index] === key)
		return sectionItems.length
			? [{ key, title: sectionTitles[key], items: sectionItems }]
			: []
	})
}
