import { describe, expect, test } from "bun:test"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { type ItemSort, sortItemsByStat } from "./sort-items-by-stat"

function item(id: string, stats: Item["stats"]) {
	return { id, stats } as Item
}

const items = [
	item("tome", { abilityPower: 20 }),
	item("longsword", { attackDamage: 10 }),
	item("bruiser", { attackDamage: 40, health: 300 }),
	item("pickaxe", { attackDamage: 25 }),
	item("blade", { attackDamage: 25 }),
	item("zero", { attackDamage: 0 }),
]

describe("sortItemsByStat", () => {
	test.each<[string, ItemSort, string[]]>([
		[
			"highest first, items without the stat last",
			{ stat: "attackDamage", direction: "desc" },
			["bruiser", "pickaxe", "blade", "longsword", "tome", "zero"],
		],
		[
			"lowest first, items without the stat still last",
			{ stat: "attackDamage", direction: "asc" },
			["longsword", "pickaxe", "blade", "bruiser", "tome", "zero"],
		],
		[
			"a stat only one item has",
			{ stat: "health", direction: "desc" },
			["bruiser", "tome", "longsword", "pickaxe", "blade", "zero"],
		],
		[
			"a stat nobody has keeps the order",
			{ stat: "armor", direction: "asc" },
			["tome", "longsword", "bruiser", "pickaxe", "blade", "zero"],
		],
	])("%s", (_, sort, expected) => {
		expect(sortItemsByStat(items, sort).map(({ id }) => id)).toEqual(expected)
	})

	test("does not reorder the given list", () => {
		const before = items.map(({ id }) => id)
		sortItemsByStat(items, { stat: "attackDamage", direction: "desc" })
		expect(items.map(({ id }) => id)).toEqual(before)
	})
})
