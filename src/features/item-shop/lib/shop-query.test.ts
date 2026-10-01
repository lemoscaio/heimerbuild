import { describe, expect, test } from "bun:test"
import type { Item } from "@schemas/item"
import { shopCatalog } from "./shop-catalog"
import {
	applyShopTokens,
	commitShopQuery,
	describeToken,
	filtersFromTokens,
	nameSearchText,
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

const noFilters: ShopFilters = {
	role: "ALL",
	stats: [],
	match: "all",
	conditions: [],
}

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
		expect(
			commitShopQuery("health ", { catalog: { itemNames, terms: [] } }),
		).toEqual({
			tokens: [],
			text: "health ",
		})
		expect(
			commitShopQuery("health potion", { catalog: { itemNames, terms: [] } }),
		).toEqual({
			tokens: [],
			text: "health potion",
		})
		expect(
			commitShopQuery("health potion", {
				catalog: { itemNames, terms: [] },
				includeLastWord: true,
			}).tokens,
		).toEqual([])
	})

	test("aliases that start no item name, or only part of a name's first word, become tokens", () => {
		const itemNames = ["Health Potion", "Manamune", "Rabadon's Deathcap"]
		expect(
			commitShopQuery("ap mr ", { catalog: { itemNames, terms: [] } }),
		).toEqual({
			tokens: [
				{ kind: "stat", stat: "abilityPower" },
				{ kind: "stat", stat: "magicResist" },
			],
			text: "",
		})
		expect(
			commitShopQuery("mana ", { catalog: { itemNames, terms: [] } }).tokens,
		).toEqual([{ kind: "stat", stat: "mana" }])
		expect(
			commitShopQuery("health mr ", { catalog: { itemNames, terms: [] } }),
		).toEqual({
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
			conditions: [],
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
			conditions: [],
		})
	})

	test("a stat already selected is not added twice, and the last role wins", () => {
		const filters: ShopFilters = {
			role: "MAGE",
			stats: ["abilityPower"],
			match: "all",
			conditions: [],
		}
		expect(applyShopTokens(filters, parseShopQuery("ap tank").tokens)).toEqual({
			role: "TANK",
			stats: ["abilityPower"],
			match: "all",
			conditions: [],
		})
	})

	test("removing a token removes its filter", () => {
		const filters: ShopFilters = {
			role: "MAGE",
			stats: ["abilityPower", "magicResist"],
			match: "any",
			conditions: [],
		}
		const tokens = tokensFromFilters(filters)
		const [role, abilityPower] = tokens
		expect(
			filtersFromTokens(
				tokens.filter((token) => token !== abilityPower),
				filters,
			),
		).toEqual({
			role: "MAGE",
			stats: ["magicResist"],
			match: "any",
			conditions: [],
		})
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

describe("nameSearchText", () => {
	test("drops the words being typed as tokens, which no item name has", () => {
		expect(nameSearchText("long from:she ap>= gold<")).toBe("long")
		expect(nameSearchText("zhonya's")).toBe("zhonya's")
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
				conditions: [],
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
			searchTokensForAnalytics({
				role: "TANK",
				stats: [],
				match: "all",
				conditions: [],
			}),
		).toEqual([{ kind: "role", value: "TANK" }])
	})
})

describe("conditions", () => {
	const catalog = shopCatalog([
		shopItem("1036", "Long Sword", { into: ["3134"] }),
		shopItem("1055", "Doran's Blade", { into: [] }),
		shopItem("1054", "Doran's Shield", { into: [] }),
		shopItem("3057", "Sheen", { into: ["3078"] }),
		shopItem("3078", "Trinity Force", { from: ["3057"] }),
		shopItem("3089", "Rabadon's Deathcap", { from: ["1058"] }),
		shopItem("3053", "Sterak's Gage", {
			groupLimits: [{ group: "LifelineItems", max: 1, label: "Lifeline" }],
		}),
		shopItem("1001", "Doran's Ring", {
			from: ["1036"],
			groupLimits: [{ group: "DoransItems", max: 1, label: "Starter" }],
		}),
		shopItem("1002", "Doran's Bow", { from: ["1036"] }),
	])
	const sheen = { id: "3057", name: "Sheen", icon: "3057.png" }
	const rabadon = { id: "3089", name: "Rabadon's Deathcap", icon: "3089.png" }

	test("has:active, active, antiheal and has:antiheal type the effect tokens", () => {
		expect(
			parseShopQuery("has:active active antiheal has:antiheal").tokens,
		).toEqual([
			{ kind: "has", effect: "active" },
			{ kind: "has", effect: "active" },
			{ kind: "has", effect: "antiHeal" },
			{ kind: "has", effect: "antiHeal" },
		])
	})

	test("a stat alias with >= and a number is a stat minimum, gold takes <= and >=", () => {
		expect(
			parseShopQuery("ap>=80 ms%>=5 GOLD<=1500 gold>=3000").tokens,
		).toEqual([
			{ kind: "statMin", stat: "abilityPower", min: 80 },
			{ kind: "statMin", stat: "movementSpeedPercent", min: 5 },
			{ kind: "gold", bound: "max", value: 1500 },
			{ kind: "gold", bound: "min", value: 3000 },
		])
	})

	test("other comparisons stay free text", () => {
		expect(parseShopQuery("ap<=80 zhonya>=1 ap>= gold<=x").tokens).toEqual([])
	})

	test("item terms come from the catalog: an exact slug, or the only item it starts", () => {
		expect(parseShopQuery("from:sheen", { catalog }).tokens).toEqual([
			{ kind: "from", item: sheen },
		])
		expect(parseShopQuery("into:rabadon", { catalog }).tokens).toEqual([
			{ kind: "into", item: rabadon },
		])
		expect(parseShopQuery("group:lifeline", { catalog }).tokens).toEqual([
			{ kind: "group", group: "LifelineItems", label: "Lifeline" },
		])
	})

	test("an ambiguous or unknown item term stays free text", () => {
		expect(parseShopQuery("from:doran into:sheen from:", { catalog })).toEqual({
			tokens: [],
			freeText: "from:doran into:sheen from:",
		})
	})

	test("every condition's term parses back to it", () => {
		const tokens: ShopToken[] = [
			{ kind: "has", effect: "active" },
			{ kind: "has", effect: "antiHeal" },
			{ kind: "group", group: "LifelineItems", label: "Lifeline" },
			{ kind: "from", item: sheen },
			{ kind: "into", item: rabadon },
			{ kind: "statMin", stat: "attackSpeedPercent", min: 30 },
			{ kind: "gold", bound: "max", value: 1000 },
		]
		for (const token of tokens) {
			expect(
				parseShopQuery(describeToken(token).term, { catalog }).tokens,
			).toEqual([token])
		}
	})

	test("describes conditions, sending ids and gold buckets to analytics", () => {
		expect(
			describeToken({ kind: "statMin", stat: "attackSpeedPercent", min: 30 }),
		).toMatchObject({
			key: "statMin:attackSpeedPercent",
			term: "as>=30",
			label: "Attack Speed at least 30%",
			value: { kind: "statMin", value: "attackSpeedPercent" },
		})
		expect(describeToken({ kind: "from", item: sheen })).toMatchObject({
			key: "from:3057",
			term: "from:sheen",
			label: "Builds from Sheen",
			icon: "3057.png",
			value: { kind: "from", value: "3057" },
		})
		expect(
			describeToken({ kind: "gold", bound: "max", value: 1499 }).value,
		).toEqual({ kind: "gold", value: "max:1000" })
	})

	test("conditions add up after the stats, and one with the same key replaces the old one", () => {
		const filters = applyShopTokens(
			noFilters,
			parseShopQuery("ap>=80 has:active ap ap>=100 gold<=1500").tokens,
		)
		expect(filters).toEqual({
			...noFilters,
			stats: ["abilityPower"],
			conditions: [
				{ kind: "statMin", stat: "abilityPower", min: 100 },
				{ kind: "has", effect: "active" },
				{ kind: "gold", bound: "max", value: 1500 },
			],
		})
		expect(filtersFromTokens(tokensFromFilters(filters), filters)).toEqual(
			filters,
		)
		expect(tokensFromFilters(filters).map(({ kind }) => kind)).toEqual([
			"stat",
			"statMin",
			"has",
			"gold",
		])
	})

	test("suggests a complete comparison first, unless that exact one is applied", () => {
		expect(suggestShopTokens("ap>=80").map(({ term }) => term)).toEqual([
			"ap>=80",
		])
		const active: ShopToken[] = [
			{ kind: "statMin", stat: "abilityPower", min: 80 },
		]
		expect(suggestShopTokens("ap>=80", { active })).toEqual([])
		expect(
			suggestShopTokens("ap>=100", { active }).map(({ term }) => term),
		).toEqual(["ap>=100"])
	})

	test("suggests the effects, and item terms only once their prefix is typed", () => {
		expect(suggestShopTokens("has:").map(({ term }) => term)).toEqual([
			"has:active",
			"antiheal",
		])
		expect(
			suggestShopTokens("fr", { catalog }).map(({ term }) => term),
		).toEqual([])
		expect(
			suggestShopTokens("into:d", { catalog }).map(({ term }) => term),
		).toEqual(["into:rabadonsdeathcap", "into:doransring", "into:doransbow"])
		expect(
			suggestShopTokens("group:", { catalog }).map(({ term }) => term),
		).toEqual(["group:lifeline", "group:starter"])
	})

	test("analytics get the conditions' ids, never the typed text", () => {
		expect(
			searchTokensForAnalytics({
				...noFilters,
				conditions: [
					{ kind: "into", item: rabadon },
					{ kind: "gold", bound: "min", value: 3200 },
				],
			}),
		).toEqual([
			{ kind: "into", value: "3089" },
			{ kind: "gold", value: "min:3000" },
		])
	})
})

function shopItem(id: string, name: string, fields: Partial<Item> = {}): Item {
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
		...fields,
	}
}
