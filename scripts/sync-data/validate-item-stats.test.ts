import { describe, expect, test } from "bun:test"
import {
	formatMismatches,
	ITEM_STAT_ALLOWLIST,
	parseStatsBlock,
	validateItemStats,
} from "./validate-item-stats"

function description(...lines: string[]): string {
	return `<mainText><stats>${lines.join("<br>")}</stats><br><br><passive>Passive</passive><br>Restore <healing>4 Health</healing>.</mainText>`
}

function item(id: string, stats: Record<string, number>, desc: string) {
	return { id, name: `Item ${id}`, description: desc, stats }
}

describe("parseStatsBlock", () => {
	test("maps flat labels and turns percents into fractions", () => {
		expect(
			parseStatsBlock(
				description(
					"<attention>20</attention> Attack Damage",
					"<attention>10</attention> Lethality",
					"<attention>30%</attention> Attack Speed",
				),
			),
		).toEqual({ attackDamage: 20, lethality: 10, attackSpeedPercent: 0.3 })
	})

	test("tells flat and percent penetration apart", () => {
		expect(
			parseStatsBlock(
				description(
					"<attention>20</attention> Magic Penetration",
					"<attention>8%</attention> Magic Penetration",
					"<attention>4%</attention> Move Speed",
				),
			),
		).toEqual({
			magicPenetrationFlat: 20,
			magicPenetrationPercent: 0.08,
			movementSpeedPercent: 0.04,
		})
	})

	test("ignores text outside <stats> and labels the schema does not model", () => {
		expect(
			parseStatsBlock(
				description("<attention>3</attention> Gold Per 10 Seconds"),
			),
		).toEqual({})
		expect(parseStatsBlock("")).toEqual({})
	})

	test("fails on a label it cannot map", () => {
		expect(() =>
			parseStatsBlock(description("<attention>5</attention> Bogus Power")),
		).toThrow('unknown <stats> label "Bogus Power"')
	})
})

describe("validateItemStats", () => {
	const dirk = description(
		"<attention>20</attention> Attack Damage",
		"<attention>10</attention> Lethality",
	)

	test("reports item, field, expected and actual for each difference", () => {
		const { mismatches } = validateItemStats(
			[item("3134", { attackDamage: 25 }, dirk)],
			[],
		)
		expect(mismatches).toEqual([
			{
				itemId: "3134",
				name: "Item 3134",
				stat: "attackDamage",
				expected: 20,
				actual: 25,
			},
			{
				itemId: "3134",
				name: "Item 3134",
				stat: "lethality",
				expected: 10,
				actual: undefined,
			},
		])
		expect(formatMismatches(mismatches)).toContain(
			"3134 Item 3134: lethality expected 10, actual (missing)",
		)
	})

	test("reports stats the <stats> block does not show", () => {
		const { mismatches } = validateItemStats(
			[
				item(
					"1",
					{ health: 110, healthRegen: 4 },
					description("<attention>110</attention> Health"),
				),
			],
			[],
		)
		expect(mismatches.map((m) => [m.stat, m.expected, m.actual])).toEqual([
			["healthRegen", undefined, 4],
		])
	})

	test("treats a shown zero like a missing stat", () => {
		const shown = description(
			"<attention>0%</attention> Critical Strike Chance",
		)
		expect(validateItemStats([item("1", {}, shown)], []).mismatches).toEqual([])
	})

	test("skips allowlisted differences and reports unused entries as stale", () => {
		const allowlist = [
			{ itemId: "3134", stat: "lethality", reason: "test" },
			{ itemId: "9999", stat: "health", reason: "test" },
		] as const
		const { mismatches, stale } = validateItemStats(
			[item("3134", { attackDamage: 20 }, dirk)],
			allowlist,
		)
		expect(mismatches).toEqual([])
		expect(stale).toEqual([allowlist[1]])
	})

	test("prefixes parse errors with the item", () => {
		expect(() =>
			validateItemStats(
				[item("7", {}, description("<attention>1</attention> Bogus"))],
				[],
			),
		).toThrow('Item 7 (Item 7): unknown <stats> label "Bogus"')
	})
})

describe("ITEM_STAT_ALLOWLIST", () => {
	test("every entry is unique and explains why it is allowed", () => {
		const keys = ITEM_STAT_ALLOWLIST.map((e) => `${e.itemId}:${e.stat}`)
		expect(new Set(keys).size).toBe(keys.length)
		for (const entry of ITEM_STAT_ALLOWLIST) {
			expect(entry.reason.trim().length).toBeGreaterThan(10)
		}
	})
})
