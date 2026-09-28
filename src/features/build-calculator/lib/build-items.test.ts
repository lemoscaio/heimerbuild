import { describe, expect, test } from "bun:test"
import { knownItemIds, MAX_ITEMS, toggleItemId } from "./build-items"

describe("toggleItemId", () => {
	test("adds an item that is not in the build", () => {
		expect(toggleItemId(["3089"], "3020")).toEqual(["3089", "3020"])
	})

	test("removes an item that is already in the build, keeping the order", () => {
		expect(toggleItemId(["3089", "3020", "4645"], "3020")).toEqual([
			"3089",
			"4645",
		])
	})

	test("ignores a new item when every slot is taken", () => {
		const full = ["1", "2", "3", "4", "5", "6"]
		expect(full).toHaveLength(MAX_ITEMS)
		expect(toggleItemId(full, "7")).toEqual(full)
	})

	test("never mutates the given list", () => {
		const itemIds = Object.freeze(["3089"])
		expect(() => toggleItemId(itemIds, "3020")).not.toThrow()
		expect(() => toggleItemId(itemIds, "3089")).not.toThrow()
		expect(itemIds).toEqual(["3089"])
	})
})

describe("knownItemIds", () => {
	const itemsById = { "3089": {}, "3020": {}, "4645": {} }

	test("keeps ids that exist in the patch, in link order", () => {
		expect(knownItemIds(["4645", "3089"], itemsById)).toEqual(["4645", "3089"])
	})

	test("drops unknown ids and duplicates", () => {
		expect(knownItemIds(["3089", "9999", "3089", "3020"], itemsById)).toEqual([
			"3089",
			"3020",
		])
	})

	test("returns no items when the link has none", () => {
		expect(knownItemIds(undefined, itemsById)).toEqual([])
	})

	test("never returns more than the item slots", () => {
		const many = Object.fromEntries(
			["1", "2", "3", "4", "5", "6", "7"].map((id) => [id, {}]),
		)
		expect(knownItemIds(Object.keys(many), many)).toHaveLength(MAX_ITEMS)
	})
})
