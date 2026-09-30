import { describe, expect, test } from "bun:test"
import type { Item } from "@schemas/item"
import { filterItemsByRole } from "./filter-items-by-role"

function item(
	id: string,
	roles: Item["roles"],
	{
		tags = [],
		groupLimits = [],
	}: Partial<Pick<Item, "tags" | "groupLimits">> = {},
) {
	return { id, roles, tags, groupLimits }
}

const items = [
	item("1", ["MAGE"]),
	item("2", ["FIGHTER", "TANK"]),
	item("3", []),
	item("4", ["TANK"]),
]

const everyRoleItems = [
	item("potion", ["FIGHTER"], { tags: ["Consumable"] }),
	item("boots", ["SUPPORT"], { tags: ["Boots"] }),
	item("greaves", [], { groupLimits: [{ group: "Boots", max: 1 }] }),
]

function idsFor(
	role: Parameters<typeof filterItemsByRole>[1],
	list: readonly ReturnType<typeof item>[] = items,
) {
	return filterItemsByRole(list, role).map(({ id }) => id)
}

describe("filterItemsByRole", () => {
	test("keeps every item, in order, for ALL", () => {
		expect(idsFor("ALL")).toEqual(["1", "2", "3", "4"])
	})

	test("keeps only the items tagged with the role", () => {
		expect(idsFor("TANK")).toEqual(["2", "4"])
		expect(idsFor("MAGE")).toEqual(["1"])
	})

	test("returns nothing when no item has the role", () => {
		expect(idsFor("SUPPORT")).toEqual([])
	})

	test("keeps consumables and boots under every role, whatever their class", () => {
		const list = [...items, ...everyRoleItems]
		expect(idsFor("MAGE", list)).toEqual(["1", "potion", "boots", "greaves"])
		expect(idsFor("MARKSMAN", list)).toEqual(["potion", "boots", "greaves"])
	})
})
