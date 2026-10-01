import { describe, expect, test } from "bun:test"
import type { Item } from "@schemas/item"
import { shopCatalog } from "./shop-catalog"
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
const noFilters: ShopFilters = {
	role: "ALL",
	stats: [],
	match: "all",
	conditions: [],
}

describe("shopSuggestions", () => {
	test("the conditions show as chips after the stats", () => {
		const { chips } = shopSuggestions({
			query: "",
			filters: {
				...noFilters,
				stats: ["abilityPower"],
				conditions: [
					{ kind: "statMin", stat: "abilityPower", min: 80 },
					{ kind: "gold", bound: "max", value: 3000 },
				],
			},
			items,
		})
		expect(chips.map(({ term }) => term)).toEqual([
			"ap",
			"ap>=80",
			"gold<=3000",
		])
	})

	test("suggests the catalog's item terms once their prefix is typed", () => {
		const catalog = shopCatalog([
			{ ...item("1058", "Needlessly Large Rod"), into: ["3089"] },
			{ ...item("3089", "Rabadon's Deathcap"), from: ["1058"] },
		])
		function keys(query: string) {
			return shopSuggestions({
				query,
				filters: noFilters,
				items: [],
				catalog,
			}).suggestions.map(suggestionKey)
		}
		expect(keys("into:death")).toEqual(["into:3089"])
		expect(keys("from:")).toEqual(["from:1058"])
		expect(keys("fro")).toEqual(["shortcut:from:"])
	})

	test("the filters show as chips, the role first, then the stats in order", () => {
		const { chips } = shopSuggestions({
			query: "",
			filters: {
				role: "MAGE",
				stats: ["magicResist", "abilityPower"],
				match: "any",
				conditions: [],
			},
			items,
		})
		expect(chips.map(({ term }) => term)).toEqual(["role:mage", "mr", "ap"])
	})

	test("suggests tokens for the typed word, the filters it starts that need a value, then the first four items", () => {
		const { suggestions } = shopSuggestions({
			query: "staff ap",
			filters: noFilters,
			items,
		})
		expect(suggestions.map(suggestionKey)).toEqual([
			"stat:abilityPower",
			"shortcut:ap>=",
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
		expect(keys({ ...noFilters, stats: ["abilityPower"] }, "ap")).toEqual([
			"shortcut:ap>=",
		])
		expect(keys(noFilters, "and")).toEqual([])
		expect(keys({ ...noFilters, match: "any" }, "and")).toEqual(["match:all"])
	})

	test("no text, no suggestions; a token being typed suggests no items", () => {
		expect(
			shopSuggestions({ query: "", filters: noFilters, items }).suggestions,
		).toEqual([])
		expect(
			shopSuggestions({
				query: "gold<=1",
				filters: noFilters,
				items,
			}).suggestions.map(suggestionKey),
		).toEqual(["gold:max"])
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

	test("a picked shortcut replaces the typed word with its prefix, to complete", () => {
		const from: Suggestion = {
			kind: "shortcut",
			text: "from:",
			label: "Builds from an item",
			kindLabel: "Recipe",
			example: "from:sheen",
		}
		const result = pickSuggestions([...chips, from], {
			chips,
			query: "zhonya fr",
			filters,
		})
		expect(result).toMatchObject({
			picked: from,
			query: "zhonya from:",
			filters,
		})
	})

	test("a picked condition joins the filters as a chip", () => {
		const active = tokenSuggestion({ kind: "has", effect: "active" })
		const result = pickSuggestions([...chips, active], {
			chips,
			query: "has:",
			filters,
		})
		expect(result.filters.conditions).toEqual([
			{ kind: "has", effect: "active" },
		])
		expect(result.query).toBe("")
	})

	test("the match token keeps the mode it sets", () => {
		const or = tokenSuggestion({ kind: "match", match: "any" })
		expect(
			pickSuggestions([...chips, or], { chips, query: "or", filters }).filters,
		).toEqual({ ...filters, match: "any" })
	})
})
