import { describe, expect, test } from "bun:test"
import type { Item } from "../../../../scripts/sync-data/schemas/item"
import { filterItemsByRole } from "./filter-items-by-role"

function item(id: string, roles: Item["roles"]) {
	return { id, roles } as Item
}

const items = [
	item("1", ["MAGE"]),
	item("2", ["FIGHTER", "TANK"]),
	item("3", []),
	item("4", ["TANK"]),
]

function idsFor(role: Parameters<typeof filterItemsByRole>[1]) {
	return filterItemsByRole(items, role).map(({ id }) => id)
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
})
