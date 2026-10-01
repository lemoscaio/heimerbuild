import { describe, expect, test } from "bun:test"
import type { Item } from "@schemas/item"
import type { ShopFilters } from "./shop-query"
import {
	pickSuggestions,
	type Suggestion,
	shopSuggestions,
	suggestionKey,
	tokenSuggestion,
} from "./shop-suggestions"

function item(id: string, name: string): Item {
	return {
		id,
		name,
		description: "",
		plaintext: "",
		icon: `${id}.png`,
		gold: { base: 0, total: 0, sell: 0, purchasable: true },
		tags: [],
		maps: [11],
		from: [],
		into: [],
		inStore: true,
		epicness: 5,
		roles: [],
		groupLimits: [],
		active: false,
		antiHeal: false,
		stats: {},
	}
}

const items = ["3089", "3157", "3165", "3135", "3116"].map((id) =>
	item(id, `Item ${id}`),
)
const noFilters: ShopFilters = { role: "ALL", stats: [], match: "all" }

describe("shopSuggestions", () => {
	test("the filters show as chips, the role first, then the stats in order", () => {
		const { chips } = shopSuggestions({
			query: "",
			filters: {
				role: "MAGE",
				stats: ["magicResist", "abilityPower"],
				match: "any",
			},
			items,
		})
		expect(chips.map(({ term }) => term)).toEqual(["role:mage", "mr", "ap"])
	})

	test("suggests tokens for the typed word, then the first four items", () => {
		const { suggestions } = shopSuggestions({
			query: "staff ap",
			filters: noFilters,
			items,
		})
		expect(suggestions.map(suggestionKey)).toEqual([
			"stat:abilityPower",
			"item:3089",
			"item:3157",
			"item:3165",
			"item:3135",
		])
	})

	test("skips the applied tokens, including the current match mode", () => {
		function keys(filters: ShopFilters, query: string) {
			return shopSuggestions({ query, filters, items: [] }).suggestions.map(
				suggestionKey,
			)
		}
		expect(keys({ ...noFilters, stats: ["abilityPower"] }, "ap")).toEqual([])
		expect(keys(noFilters, "an")).toEqual([])
		expect(keys({ ...noFilters, match: "any" }, "an")).toEqual(["match:all"])
	})

	test("no text, no suggestions", () => {
		expect(
			shopSuggestions({ query: "", filters: noFilters, items }).suggestions,
		).toEqual([])
	})
})

describe("pickSuggestions", () => {
	const chips = [tokenSuggestion({ kind: "stat", stat: "abilityPower" })]
	const filters: ShopFilters = { ...noFilters, stats: ["abilityPower"] }

	test("a picked token joins the filters and replaces the typed word", () => {
		const armor = tokenSuggestion({ kind: "stat", stat: "armor" })
		const result = pickSuggestions([...chips, armor], {
			chips,
			query: "zhonya arm",
			filters,
		})
		expect(result.picked).toEqual(armor)
		expect(result.filters.stats).toEqual(["abilityPower", "armor"])
		expect(result.query).toBe("zhonya ")
	})

	test("a picked item keeps the text and the filters", () => {
		const zhonya: Suggestion = { kind: "item", item: items[1] }
		const result = pickSuggestions([...chips, zhonya], {
			chips,
			query: "zho",
			filters,
		})
		expect(result.picked).toEqual(zhonya)
		expect(result).toMatchObject({ query: "zho", filters })
	})

	test("a removed chip drops its filter, with nothing picked", () => {
		const result = pickSuggestions([], { chips, query: "zho", filters })
		expect(result.picked).toBeUndefined()
		expect(result).toMatchObject({ query: "zho", filters: noFilters })
	})

	test("the match token keeps the mode it sets", () => {
		const or = tokenSuggestion({ kind: "match", match: "any" })
		expect(
			pickSuggestions([...chips, or], { chips, query: "or", filters }).filters,
		).toEqual({ ...filters, match: "any" })
	})
})
