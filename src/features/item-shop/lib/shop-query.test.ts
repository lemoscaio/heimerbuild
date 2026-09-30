import { describe, expect, test } from "bun:test"
import {
	applyShopTokens,
	commitShopQuery,
	describeToken,
	filtersFromTokens,
	parseShopQuery,
	type ShopFilters,
	type ShopToken,
	searchTokensForAnalytics,
	suggestShopTokens,
	tokensFromFilters,
	typedWord,
	withoutTypedWord,
} from "./shop-query"
import { shopStats } from "./shop-stats"

const noFilters: ShopFilters = { role: "ALL", stats: [], match: "all" }

describe("parseShopQuery", () => {
	test("stat aliases become stat tokens, other words stay as free text", () => {
		expect(parseShopQuery("ap mr bans")).toEqual({
			tokens: [
				{ kind: "stat", stat: "abilityPower" },
				{ kind: "stat", stat: "magicResist" },
			],
			freeText: "bans",
		})
	})

	test("ignores case and accents", () => {
		expect(parseShopQuery("AP Hé").tokens).toEqual([
			{ kind: "stat", stat: "abilityPower" },
		])
		expect(parseShopQuery("HEALTH").tokens).toEqual([
			{ kind: "stat", stat: "health" },
		])
		expect(parseShopQuery("Rôle:TANK").tokens).toEqual([
			{ kind: "role", role: "TANK" },
		])
	})

	test("several aliases type the same stat", () => {
		for (const word of ["hp", "health"]) {
			expect(parseShopQuery(word).tokens).toEqual([
				{ kind: "stat", stat: "health" },
			])
		}
		expect(parseShopQuery("ms ms% %ms").tokens).toEqual([
			{ kind: "stat", stat: "movementSpeedFlat" },
			{ kind: "stat", stat: "movementSpeedPercent" },
			{ kind: "stat", stat: "movementSpeedPercent" },
		])
	})

	test("roles with or without the role: prefix, and the and/or switch", () => {
		expect(parseShopQuery("role:mage fighter or and").tokens).toEqual([
			{ kind: "role", role: "MAGE" },
			{ kind: "role", role: "FIGHTER" },
			{ kind: "match", match: "any" },
			{ kind: "match", match: "all" },
		])
	})

	test("a query without tokens is all free text, spaces collapsed", () => {
		expect(parseShopQuery("  long   sword ")).toEqual({
			tokens: [],
			freeText: "long sword",
		})
		expect(parseShopQuery("role:nobody")).toEqual({
			tokens: [],
			freeText: "role:nobody",
		})
	})
})

describe("describeToken", () => {
	test("describes each kind of token in one place", () => {
		expect(
			describeToken({ kind: "stat", stat: "magicPenetrationFlat" }),
		).toMatchObject({
			key: "stat:magicPenetrationFlat",
			term: "mpen",
			label: "Flat Magic Penetration",
			kindLabel: "Stat",
			value: { kind: "stat", value: "magicPenetrationFlat" },
		})
		expect(describeToken({ kind: "role", role: "TANK" })).toMatchObject({
			key: "role:TANK",
			term: "role:tank",
			kindLabel: "Role",
			value: { kind: "role", value: "TANK" },
		})
		expect(describeToken({ kind: "match", match: "any" })).toMatchObject({
			key: "match:any",
			term: "or",
			kindLabel: "Match",
			value: { kind: "match", value: "any" },
		})
	})

	test("every role and match term parses back to its token", () => {
		const tokens: ShopToken[] = [
			{ kind: "role", role: "MAGE" },
			{ kind: "role", role: "SUPPORT" },
			{ kind: "match", match: "all" },
			{ kind: "match", match: "any" },
		]
		for (const token of tokens) {
			expect(parseShopQuery(describeToken(token).term).tokens).toEqual([token])
		}
	})
})

describe("token terms", () => {
	test("every stat's main term parses back to that stat, and no term types two tokens", () => {
		const terms = shopStats.flatMap(({ aliases }) => aliases)
		expect(new Set(terms).size).toBe(terms.length)
		for (const { stat } of shopStats) {
			const token: ShopToken = { kind: "stat", stat }
			expect(parseShopQuery(describeToken(token).term).tokens).toEqual([token])
		}
	})
})

describe("commitShopQuery", () => {
	test("a space commits the finished words", () => {
		expect(commitShopQuery("ap ")).toEqual({
			tokens: [{ kind: "stat", stat: "abilityPower" }],
			text: "",
		})
	})

	test("the word being typed is never committed early", () => {
		expect(commitShopQuery("ap")).toEqual({ tokens: [], text: "ap" })
		expect(commitShopQuery("mr zho")).toEqual({
			tokens: [{ kind: "stat", stat: "magicResist" }],
			text: "zho",
		})
	})

	test("finished free words stay, with the space typed after them", () => {
		expect(commitShopQuery("long ")).toEqual({ tokens: [], text: "long " })
		expect(commitShopQuery("long sw")).toEqual({
			tokens: [],
			text: "long sw",
		})
	})

	test("an alias that continues the start of an item name stays free text", () => {
		const itemNames = ["Health Potion", "Manamune", "Rabadon's Deathcap"]
		expect(commitShopQuery("health ", { itemNames })).toEqual({
			tokens: [],
			text: "health ",
		})
		expect(commitShopQuery("health potion", { itemNames })).toEqual({
			tokens: [],
			text: "health potion",
		})
		expect(
			commitShopQuery("health potion", { itemNames, includeLastWord: true })
				.tokens,
		).toEqual([])
	})

	test("aliases that start no item name, or only part of a name's first word, become tokens", () => {
		const itemNames = ["Health Potion", "Manamune", "Rabadon's Deathcap"]
		expect(commitShopQuery("ap mr ", { itemNames })).toEqual({
			tokens: [
				{ kind: "stat", stat: "abilityPower" },
				{ kind: "stat", stat: "magicResist" },
			],
			text: "",
		})
		expect(commitShopQuery("mana ", { itemNames }).tokens).toEqual([
			{ kind: "stat", stat: "mana" },
		])
		expect(commitShopQuery("health mr ", { itemNames })).toEqual({
			tokens: [{ kind: "stat", stat: "magicResist" }],
			text: "health ",
		})
	})

	test("Enter or Tab also commit the last word", () => {
		expect(commitShopQuery("bans mr", { includeLastWord: true })).toEqual({
			tokens: [{ kind: "stat", stat: "magicResist" }],
			text: "bans",
		})
		expect(commitShopQuery("zhon", { includeLastWord: true })).toEqual({
			tokens: [],
			text: "zhon",
		})
	})
})

describe("filters and tokens", () => {
	test("icons and tokens agree: the tokens of any filters rebuild the same filters", () => {
		const filters: ShopFilters = {
			role: "SUPPORT",
			stats: ["mana", "abilityPower", "healAndShieldPowerPercent"],
			match: "any",
		}
		expect(filtersFromTokens(tokensFromFilters(filters), filters)).toEqual(
			filters,
		)
		expect(tokensFromFilters(noFilters)).toEqual([])
	})

	test("typing ap mr selects both stats, or switches to OR, role:tank selects Tank", () => {
		const { tokens } = parseShopQuery("ap mr or role:tank")
		expect(applyShopTokens(noFilters, tokens)).toEqual({
			role: "TANK",
			stats: ["abilityPower", "magicResist"],
			match: "any",
		})
	})

	test("a stat already selected is not added twice, and the last role wins", () => {
		const filters: ShopFilters = {
			role: "MAGE",
			stats: ["abilityPower"],
			match: "all",
		}
		expect(applyShopTokens(filters, parseShopQuery("ap tank").tokens)).toEqual({
			role: "TANK",
			stats: ["abilityPower"],
			match: "all",
		})
	})

	test("removing a token removes its filter", () => {
		const filters: ShopFilters = {
			role: "MAGE",
			stats: ["abilityPower", "magicResist"],
			match: "any",
		}
		const tokens = tokensFromFilters(filters)
		const [role, abilityPower] = tokens
		expect(
			filtersFromTokens(
				tokens.filter((token) => token !== abilityPower),
				filters,
			),
		).toEqual({ role: "MAGE", stats: ["magicResist"], match: "any" })
		expect(
			filtersFromTokens(
				tokens.filter((token) => token !== role),
				filters,
			).role,
		).toBe("ALL")
	})
})

describe("suggestShopTokens", () => {
	test("suggests tokens whose term or stat name starts with the typed word", () => {
		expect(suggestShopTokens("ab").map(({ term }) => term)).toEqual([
			"ap",
			"ah",
		])
		expect(suggestShopTokens("TA").map(({ term }) => term)).toEqual([
			"role:tank",
		])
		expect(suggestShopTokens("o").map(({ term }) => term)).toEqual([
			"omni",
			"or",
		])
	})

	test("one entry per token, skipping the active ones, up to the limit", () => {
		expect(
			suggestShopTokens("m", {
				active: [{ kind: "stat", stat: "mana" }],
			}).map(({ term }) => term),
		).toEqual(["mr", "mpen", "mpen%", "ms", "ms%"])
		expect(suggestShopTokens("m", { limit: 2 })).toHaveLength(2)
		expect(suggestShopTokens("  ")).toEqual([])
	})
})

describe("the word being typed", () => {
	test("is the last word, or nothing right after a space", () => {
		expect(typedWord("mr zho")).toBe("zho")
		expect(typedWord("mr ")).toBe("")
		expect(typedWord("")).toBe("")
	})

	test("can be dropped once a suggestion replaces it", () => {
		expect(withoutTypedWord("long ab")).toBe("long ")
		expect(withoutTypedWord("long ")).toBe("long ")
	})

	test("tokens are named after what they filter", () => {
		expect(describeToken({ kind: "stat", stat: "abilityPower" }).label).toBe(
			"Ability Power",
		)
		expect(describeToken({ kind: "role", role: "MAGE" }).label).toBe("Mage")
	})
})

describe("searchTokensForAnalytics", () => {
	test("sends stat keys, role ids and the match mode, never display labels", () => {
		expect(
			searchTokensForAnalytics({
				role: "MAGE",
				stats: ["abilityPower", "magicResist"],
				match: "any",
			}),
		).toEqual([
			{ kind: "role", value: "MAGE" },
			{ kind: "stat", value: "abilityPower" },
			{ kind: "stat", value: "magicResist" },
			{ kind: "match", value: "any" },
		])
	})

	test("leaves the match mode out while no stat is selected", () => {
		expect(
			searchTokensForAnalytics({ role: "TANK", stats: [], match: "all" }),
		).toEqual([{ kind: "role", value: "TANK" }])
	})
})
