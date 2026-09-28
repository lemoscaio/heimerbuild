import { describe, expect, test } from "bun:test"
import { addItemId, knownItemIds, MAX_ITEMS, removeItemAt } from "./build-items"

const itemsById = { "1036": {}, "3089": {}, "3020": {}, "3006": {} }

describe("addItemId", () => {
	test.each([
		{ case: "a new item", build: ["3089"], add: "3020" },
		{ case: "a second copy of an item", build: ["3089"], add: "3089" },
		{ case: "an item over a group limit", build: ["3020"], add: "3006" },
	])("adds $case to the first free slot", ({ build, add }) => {
		expect(addItemId(build, add)).toEqual([...build, add])
	})

	test("adds nothing when every slot is taken", () => {
		const full = Array.from({ length: MAX_ITEMS }, () => "1036")
		expect(addItemId(full, "3089")).toBeUndefined()
	})

	test("never mutates the given list", () => {
		const build = Object.freeze(["1036"])
		expect(() => addItemId(build, "1036")).not.toThrow()
		expect(build).toEqual(["1036"])
	})
})

describe("removeItemAt", () => {
	test("removes only the given slot, keeping the other copies", () => {
		expect(removeItemAt(["1036", "3089", "1036"], 0)).toEqual(["3089", "1036"])
	})

	test("keeps the build when the slot is empty", () => {
		expect(removeItemAt(["1036"], 4)).toEqual(["1036"])
	})
})

describe("knownItemIds", () => {
	test("keeps known ids in link order, copies and group limits included", () => {
		expect(knownItemIds(["3020", "3089", "3006", "3089"], itemsById)).toEqual([
			"3020",
			"3089",
			"3006",
			"3089",
		])
	})

	test("drops ids that are not in this patch", () => {
		expect(knownItemIds(["9999", "1036", "toString"], itemsById)).toEqual([
			"1036",
		])
	})

	test("returns no items when the link has none", () => {
		expect(knownItemIds(undefined, itemsById)).toEqual([])
	})

	test("never returns more than the item slots", () => {
		const many = Array.from({ length: MAX_ITEMS + 1 }, () => "1036")
		expect(knownItemIds(many, itemsById)).toHaveLength(MAX_ITEMS)
	})
})
