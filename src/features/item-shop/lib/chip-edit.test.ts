import { describe, expect, test } from "bun:test"
import { chipEditText, editLastChip } from "./chip-edit"
import type { ShopFilters, ShopToken } from "./shop-query"

const noFilters: ShopFilters = {
	role: "ALL",
	stats: [],
	match: "all",
	conditions: [],
}

const sheen = { id: "3057", name: "Sheen", icon: "3057.png" }

describe("chipEditText", () => {
	test("a token with a value leaves its prefix, to pick another value", () => {
		const cases: [ShopToken, string][] = [
			[{ kind: "group", group: "boots", label: "Boots" }, "group:"],
			[{ kind: "from", item: sheen }, "from:"],
			[{ kind: "into", item: sheen }, "into:"],
			[{ kind: "statMin", stat: "abilityPower", min: 80 }, "ap>="],
			[{ kind: "gold", bound: "max", value: 1500 }, "gold<="],
			[{ kind: "gold", bound: "min", value: 3000 }, "gold>="],
		]
		for (const [token, text] of cases) {
			expect(chipEditText(token)).toBe(text)
		}
	})

	test("a token without a separate value becomes its whole term", () => {
		const cases: [ShopToken, string][] = [
			[{ kind: "has", effect: "active" }, "has:active"],
			[{ kind: "has", effect: "antiHeal" }, "antiheal"],
			[{ kind: "role", role: "TANK" }, "role:tank"],
			[{ kind: "stat", stat: "abilityPower" }, "ap"],
		]
		for (const [token, text] of cases) {
			expect(chipEditText(token)).toBe(text)
		}
	})
})

describe("editLastChip", () => {
	test("the last chip leaves the filters and its text fills the empty search", () => {
		const filters: ShopFilters = {
			role: "MAGE",
			stats: ["abilityPower"],
			match: "any",
			conditions: [
				{ kind: "has", effect: "active" },
				{ kind: "group", group: "boots", label: "Boots" },
			],
		}
		expect(editLastChip({ query: "", filters })).toEqual({
			query: "group:",
			filters: { ...filters, conditions: [{ kind: "has", effect: "active" }] },
			edited: "Boots group",
		})
	})

	test("the chips are edited from the last one: conditions, then stats, then the role", () => {
		const filters: ShopFilters = {
			...noFilters,
			role: "TANK",
			stats: ["armor"],
		}
		const first = editLastChip({ query: "", filters })
		expect(first).toMatchObject({
			query: "armor",
			filters: { ...filters, stats: [] },
		})
		expect(editLastChip({ query: "", filters: first.filters })).toMatchObject({
			query: "role:tank",
			filters: noFilters,
		})
	})

	test("without chips, nothing changes", () => {
		expect(editLastChip({ query: "", filters: noFilters })).toEqual({
			query: "",
			filters: noFilters,
		})
	})
})
