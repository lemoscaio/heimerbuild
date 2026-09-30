import { describe, expect, test } from "bun:test"
import { ItemsFileSchema } from "@schemas/item"
import type { ShopGrouping } from "@/types/shop-view"
import {
	groupShopItems,
	type ShopSectionKey,
	type ShopTier,
	shopTierOf,
} from "./group-shop-items"

type Case = {
	name: string
	tags?: string[]
	from?: string[]
	into?: string[]
	groupLimits?: { group: string; max: number }[]
}

function item({ tags = [], from = [], into = [], groupLimits = [] }: Case) {
	return { tags, from, into, groupLimits }
}

describe("shopTierOf", () => {
	test.each<Case & { section: ShopTier }>([
		{ name: "a starter", tags: ["Lane", "Health"], section: "starter" },
		{ name: "a jungle pet", tags: ["Jungle"], section: "starter" },
		{ name: "a potion", tags: ["Consumable"], section: "starter" },
		{
			name: "a potion that upgrades",
			tags: ["Consumable", "Lane"],
			into: ["3000"],
			section: "starter",
		},
		{ name: "a trinket", tags: ["Trinket", "Vision"], section: "starter" },
		{
			name: "a support item upgrade",
			tags: ["Lane", "GoldPer"],
			from: ["3865"],
			section: "starter",
		},
		{
			name: "a lane starter that builds into more",
			tags: ["SpellDamage", "Lane"],
			into: ["3041"],
			section: "starter",
		},
		{
			name: "a basic component",
			tags: ["Damage"],
			into: ["3071"],
			section: "basic",
		},
		{
			name: "an epic component",
			from: ["1052"],
			into: ["3089"],
			section: "epic",
		},
		{
			name: "tier 1 boots that build into more",
			tags: ["Boots"],
			into: ["3020"],
			section: "boots",
		},
		{
			name: "boots only in the boots group",
			groupLimits: [{ group: "Boots", max: 1 }],
			section: "boots",
		},
		{ name: "a finished item", tags: ["SpellDamage"], section: "legendary" },
	])("$name goes to $section", (testCase) => {
		expect(shopTierOf(item(testCase))).toBe(testCase.section)
	})
})

describe("groupShopItems", () => {
	const legendary = { id: "l", ...item({ name: "l" }) }
	const component = { id: "c", ...item({ name: "c", into: ["l"] }) }
	const component2 = { id: "c2", ...item({ name: "c2", into: ["l"] }) }
	const epic = { id: "e", ...item({ name: "e", from: ["c"], into: ["l"] }) }

	test("orders sections as the shop does and keeps the item order inside each", () => {
		const sections = groupShopItems([legendary, epic, component2, component])
		expect(
			sections.map(({ key, items }) => [key, items.map(({ id }) => id)]),
		).toEqual([
			["basic", ["c2", "c"]],
			["epic", ["e"]],
			["legendary", ["l"]],
		])
	})

	test.each<{ grouping: ShopGrouping; sections: [ShopSectionKey, string[]][] }>(
		[
			{
				grouping: "tiers",
				sections: [
					["basic", ["c2", "c"]],
					["epic", ["e"]],
					["legendary", ["l"]],
				],
			},
			{
				grouping: "compact",
				sections: [
					["components", ["e", "c2", "c"]],
					["legendary", ["l"]],
				],
			},
			{ grouping: "none", sections: [["all", ["l", "e", "c2", "c"]]] },
		],
	)("$grouping grouping", ({ grouping, sections }) => {
		expect(
			groupShopItems([legendary, epic, component2, component], {
				grouping,
			}).map(({ key, items }) => [key, items.map(({ id }) => id)]),
		).toEqual(sections)
	})

	test("leaves out empty sections", () => {
		expect(groupShopItems([])).toEqual([])
	})

	test("places the current patch's items in sensible sections and loses none", async () => {
		const file = Bun.file(
			new URL("../../../../public/data/manifest.json", import.meta.url),
		)
		const { currentPatch } = await file.json()
		const { items } = ItemsFileSchema.parse(
			await Bun.file(
				new URL(
					`../../../../public/data/${currentPatch}/items.json`,
					import.meta.url,
				),
			).json(),
		)
		const sections = groupShopItems(items)
		const sectionOf = (name: string) =>
			sections.find((section) =>
				section.items.some((shopItem) => shopItem.name === name),
			)?.key

		expect(
			sections.reduce((total, section) => total + section.items.length, 0),
		).toBe(items.length)
		expect(sectionOf("Doran's Ring")).toBe("starter")
		expect(sectionOf("Dark Seal")).toBe("starter")
		expect(sectionOf("Tear of the Goddess")).toBe("starter")
		expect(sectionOf("Long Sword")).toBe("basic")
		expect(sectionOf("Whispering Circlet")).toBe("legendary")
		expect(sectionOf("Amplifying Tome")).toBe("basic")
		expect(sectionOf("Blasting Wand")).toBe("basic")
		expect(sectionOf("Fiendish Codex")).toBe("epic")
		expect(sectionOf("Gunmetal Greaves")).toBe("boots")
		expect(sectionOf("Sorcerer's Shoes")).toBe("boots")
		expect(sectionOf("Rabadon's Deathcap")).toBe("legendary")
	})
})
