import { describe, expect, test } from "bun:test"
import type { Item } from "@schemas/item"
import {
	filterItemsByConditions,
	recipeComponents,
} from "./filter-items-by-conditions"
import type { ConditionToken } from "./shop-query"

type TestItem = Parameters<typeof filterItemsByConditions>[0][number]

function item(id: string, fields: Partial<Item> = {}): TestItem {
	return {
		id,
		from: [],
		active: false,
		antiHeal: false,
		groupLimits: [],
		stats: {},
		gold: { base: 0, total: 0, sell: 0, purchasable: true },
		...fields,
	}
}

function gold(total: number) {
	return { base: 0, total, sell: 0, purchasable: true }
}

const longSword = item("1036", { gold: gold(350) })
const sheen = item("3057", { gold: gold(900) })
const phage = item("3044", { from: ["1036"], gold: gold(1100) })
const trinity = item("3078", {
	from: ["3057", "3044"],
	active: false,
	gold: gold(3333),
	stats: { attackDamage: 36, attackSpeedPercent: 0.3 },
	groupLimits: [{ group: "{57352a0f}", max: 1, label: "Spellblade" }],
})
const thornmail = item("3075", { antiHeal: true, gold: gold(2450) })
const hydra = item("3074", {
	active: true,
	gold: gold(3300),
	stats: { attackDamage: 65 },
})
const items = [longSword, sheen, phage, trinity, thornmail, hydra]

function ids(conditions: readonly ConditionToken[], from = items) {
	return filterItemsByConditions(from, conditions, { allItems: items }).map(
		({ id }) => id,
	)
}

function ref(id: string) {
	return { id, name: id, icon: `${id}.png` }
}

describe("filterItemsByConditions", () => {
	test("no condition keeps every item", () => {
		expect(ids([])).toEqual(items.map(({ id }) => id))
	})

	test("has: keeps the items with that effect", () => {
		expect(ids([{ kind: "has", effect: "active" }])).toEqual(["3074"])
		expect(ids([{ kind: "has", effect: "antiHeal" }])).toEqual(["3075"])
	})

	test("group: keeps the members of a purchase group", () => {
		expect(
			ids([{ kind: "group", group: "{57352a0f}", label: "Spellblade" }]),
		).toEqual(["3078"])
	})

	test("from: keeps the items with that component anywhere in their recipe", () => {
		expect(ids([{ kind: "from", item: ref("1036") }])).toEqual(["3044", "3078"])
	})

	test("into: keeps the components of an item at any depth, even ones the other filters hid", () => {
		expect(ids([{ kind: "into", item: ref("3078") }])).toEqual([
			"1036",
			"3057",
			"3044",
		])
		expect(ids([{ kind: "into", item: ref("3078") }], [longSword])).toEqual([
			"1036",
		])
	})

	test("statMin compares percent stats in percent", () => {
		expect(
			ids([{ kind: "statMin", stat: "attackSpeedPercent", min: 30 }]),
		).toEqual(["3078"])
		expect(ids([{ kind: "statMin", stat: "attackDamage", min: 40 }])).toEqual([
			"3074",
		])
	})

	test("gold bounds include the bound, and every condition must hold", () => {
		expect(ids([{ kind: "gold", bound: "max", value: 900 }])).toEqual([
			"1036",
			"3057",
		])
		expect(
			ids([
				{ kind: "gold", bound: "min", value: 3300 },
				{ kind: "statMin", stat: "attackDamage", min: 1 },
				{ kind: "from", item: ref("3057") },
			]),
		).toEqual(["3078"])
	})
})

describe("recipeComponents", () => {
	test("follows the recipe down, and an unknown item has no components", () => {
		const componentsOf = recipeComponents(items)
		expect([...componentsOf("3078")].sort()).toEqual(["1036", "3044", "3057"])
		expect(componentsOf("9999").size).toBe(0)
	})
})
