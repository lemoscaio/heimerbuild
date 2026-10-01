import { describe, expect, test } from "bun:test"
import type { Item } from "@schemas/item"
import { applyMoreFilter, moreFilters } from "./more-filters"
import { shopCatalog } from "./shop-catalog"
import { parseShopQuery, type ShopFilters } from "./shop-query"

const noFilters: ShopFilters = {
	role: "ALL",
	stats: [],
	match: "all",
	conditions: [],
}

describe("moreFilters", () => {
	test("every example parses to a token, so the menu shows only syntax that works", () => {
		const catalog = shopCatalog([
			item("3057", "Sheen", { into: ["3078"] }),
			item("3089", "Rabadon's Deathcap", { from: ["1058"] }),
			item("3053", "Sterak's Gage", {
				groupLimits: [{ group: "LifelineItems", max: 1, label: "Lifeline" }],
			}),
		])
		for (const filter of [...moreFilters.ready, ...moreFilters.withValue]) {
			expect(parseShopQuery(filter.example, { catalog }).tokens).toHaveLength(1)
		}
	})

	test("the ready filters are the effects, and the others start their example", () => {
		expect(moreFilters.ready.map(({ example }) => example)).toEqual([
			"has:active",
			"antiheal",
		])
		for (const filter of moreFilters.withValue) {
			expect(
				filter.kind === "shortcut" && filter.example.startsWith(filter.text),
			).toBe(true)
		}
	})
})

describe("applyMoreFilter", () => {
	const [active] = moreFilters.ready
	const from = moreFilters.withValue.find(
		(filter) => filter.kind === "shortcut" && filter.text === "from:",
	)

	test("a ready filter joins the filters and keeps the text", () => {
		expect(
			applyMoreFilter(active, { query: "zho", filters: noFilters }),
		).toEqual({
			query: "zho",
			filters: {
				...noFilters,
				conditions: [{ kind: "has", effect: "active" }],
			},
		})
	})

	test("a shortcut ends the text with its prefix", () => {
		if (!from) throw new Error("from: missing")
		expect(applyMoreFilter(from, { query: "", filters: noFilters }).query).toBe(
			"from:",
		)
		expect(
			applyMoreFilter(from, { query: "zho  ", filters: noFilters }).query,
		).toBe("zho from:")
	})
})

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
