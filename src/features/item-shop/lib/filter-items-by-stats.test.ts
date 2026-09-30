import { describe, expect, test } from "bun:test"
import type { Item, StatKey } from "@schemas/item"
import { filterItemsByStats, type StatMatch } from "./filter-items-by-stats"

function item(id: string, stats: Item["stats"]) {
	return { id, stats } as Item
}

const items = [
	item("longsword", { attackDamage: 10 }),
	item("tome", { abilityPower: 20 }),
	item("bruiser", { attackDamage: 40, health: 300 }),
	item("tank", { health: 400, armor: 40 }),
	item("zero", { attackDamage: 0 }),
]

function ids(stats: StatKey[], match?: StatMatch) {
	return filterItemsByStats(items, stats, { match }).map(({ id }) => id)
}

describe("filterItemsByStats", () => {
	test.each<[string, StatKey[], string[]]>([
		[
			"no stat keeps every item",
			[],
			["longsword", "tome", "bruiser", "tank", "zero"],
		],
		["one stat", ["attackDamage"], ["longsword", "bruiser"]],
		["two stats need both (AND)", ["attackDamage", "health"], ["bruiser"]],
		["a stat nobody has", ["lethality"], []],
		["stats that never meet", ["abilityPower", "armor"], []],
	])("%s", (_, stats, expected) => {
		expect(ids(stats)).toEqual(expected)
		expect(ids(stats, "all")).toEqual(expected)
	})

	test.each<[string, StatKey[], string[]]>([
		[
			"no stat keeps every item",
			[],
			["longsword", "tome", "bruiser", "tank", "zero"],
		],
		["one stat", ["attackDamage"], ["longsword", "bruiser"]],
		["two stats need either (OR)", ["abilityPower", "armor"], ["tome", "tank"]],
		[
			"an item with both stats is listed once",
			["attackDamage", "health"],
			["longsword", "bruiser", "tank"],
		],
		["a stat nobody has", ["lethality"], []],
		[
			"a zero stat does not count",
			["attackDamage", "lethality"],
			["longsword", "bruiser"],
		],
	])("any: %s", (_, stats, expected) => {
		expect(ids(stats, "any")).toEqual(expected)
	})
})
