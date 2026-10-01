import { describe, expect, test } from "bun:test"
import type { Item } from "@schemas/item"
import { shopCatalog } from "./shop-catalog"

function item(id: string, name: string, fields: Partial<Item>) {
	return {
		id,
		name,
		icon: `${id}.png`,
		from: [],
		into: [],
		groupLimits: [],
		...fields,
	} as unknown as Item
}

describe("shopCatalog", () => {
	const catalog = shopCatalog([
		item("1036", "Long Sword", { into: ["3044"] }),
		item("3044", "Phage", { from: ["1036"], into: ["3078"] }),
		item("3078", "Trinity Force", {
			from: ["3044"],
			groupLimits: [
				{ group: "{57352a0f}", max: 1, label: "Spellblade" },
				{ group: "3078", max: 1 },
			],
		}),
		item("3057", "Sheen", {
			groupLimits: [{ group: "{57352a0f}", max: 1, label: "Spellblade" }],
		}),
	])

	test("labeled groups once, components as from:, built items as into:", () => {
		expect(catalog.terms.map(({ term }) => term)).toEqual([
			"group:spellblade",
			"from:longsword",
			"from:phage",
			"into:phage",
			"into:trinityforce",
		])
	})

	test("keeps each name's words for suggestions, and every item name", () => {
		expect(catalog.terms.at(-1)?.words).toEqual(["trinity", "force"])
		expect(catalog.itemNames).toEqual([
			"Long Sword",
			"Phage",
			"Trinity Force",
			"Sheen",
		])
	})
})
