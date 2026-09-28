import { describe, expect, test } from "bun:test"
import type { Item, StatKey } from "../../../../scripts/sync-data/schemas/item"
import { filterItemsByStats } from "./filter-items-by-stats"

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
		expect(filterItemsByStats(items, stats).map(({ id }) => id)).toEqual(
			expected,
		)
	})
})
