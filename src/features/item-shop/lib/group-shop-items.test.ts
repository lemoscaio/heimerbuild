import { describe, expect, test } from "bun:test"
import { type Item, ItemsFileSchema } from "@schemas/item"
import type { ShopGrouping } from "@/types/shop-view"
import {
	groupShopItems,
	type ShopSectionKey,
	type ShopTier,
	shopTierOf,
} from "./group-shop-items"

type Case = {
	name: string
	epicness?: Item["epicness"]
	tags?: string[]
	groupLimits?: { group: string; max: number }[]
}

function item({ epicness = 0, tags = [], groupLimits = [] }: Case) {
	return { epicness, tags, groupLimits }
}

describe("shopTierOf", () => {
	test.each<Case & { section: ShopTier }>([
		{ name: "a basic component", section: "basic" },
		{ name: "a starter", epicness: 1, section: "starter" },
		{ name: "an epic component", epicness: 4, section: "epic" },
		{ name: "a legendary", epicness: 5, section: "legendary" },
		{ name: "an elixir", epicness: 7, section: "starter" },
		{
			name: "tier 1 boots",
			tags: ["Boots"],
			groupLimits: [{ group: "Boots", max: 1 }],
			section: "boots",
		},
		{ name: "tier 2 boots", epicness: 4, tags: ["Boots"], section: "boots" },
		{
			name: "tier 3 boots only in the boots group",
			epicness: 7,
			groupLimits: [{ group: "Boots", max: 1 }],
			section: "boots",
		},
	])("$name goes to $section", (testCase) => {
		expect(shopTierOf(item(testCase))).toBe(testCase.section)
	})
})

describe("groupShopItems", () => {
	const legendary = { id: "l", ...item({ name: "l", epicness: 5 }) }
	const component = { id: "c", ...item({ name: "c" }) }
	const component2 = { id: "c2", ...item({ name: "c2" }) }
	const epic = { id: "e", ...item({ name: "e", epicness: 4 }) }

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
		expect(sectionOf("Elixir of Iron")).toBe("starter")
		expect(sectionOf("World Atlas")).toBe("starter")
		expect(sectionOf("Celestial Opposition")).toBe("legendary")
		expect(sectionOf("Gluttonous Greaves")).toBe("boots")
		expect(sectionOf("Swiftmarch")).toBe("boots")
	})
})
