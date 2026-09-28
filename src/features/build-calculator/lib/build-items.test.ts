import { describe, expect, test } from "bun:test"
import {
	addItemId,
	allowedItemIds,
	MAX_ITEMS,
	removeItemAt,
} from "./build-items"

const boots = { group: "Boots", max: 1 }
const itemsById = {
	"1036": { groupLimits: [] },
	"3089": { groupLimits: [{ group: "3089", max: 1 }] },
	"3020": { groupLimits: [boots] },
	"3006": { groupLimits: [boots] },
	"3074": { groupLimits: [{ group: "Hydra", max: 3 }] },
	"3748": { groupLimits: [{ group: "Hydra", max: 3 }] },
	"6698": { groupLimits: [{ group: "Hydra", max: 3 }] },
}

describe("addItemId", () => {
	test.each([
		{ case: "a new item", build: ["3089"], add: "3020" },
		{
			case: "a second copy of an unlimited item",
			build: ["1036"],
			add: "1036",
		},
		{ case: "an item below its group limit", build: ["3074"], add: "3748" },
	])("adds $case to the first free slot", ({ build, add }) => {
		expect(addItemId(build, add, itemsById)).toEqual({
			added: true,
			itemIds: [...build, add],
		})
	})

	test.each([
		{
			case: "a second pair of boots",
			build: ["1036", "3020"],
			add: "3006",
			conflictId: "3020",
		},
		{
			case: "a second copy of a unique item",
			build: ["3089"],
			add: "3089",
			conflictId: "3089",
		},
		{
			case: "an item over a limit above 1",
			build: ["3074", "3748", "6698"],
			add: "3074",
			conflictId: "3074",
		},
	])(
		"rejects $case and names the item in the way",
		({ build, add, conflictId }) => {
			expect(addItemId(build, add, itemsById)).toEqual({
				added: false,
				reason: "limit",
				conflictId,
			})
		},
	)

	test("rejects any item when every slot is taken", () => {
		const full = Array.from({ length: MAX_ITEMS }, () => "1036")
		expect(addItemId(full, "3089", itemsById)).toEqual({
			added: false,
			reason: "full",
		})
	})

	test("never mutates the given list", () => {
		const build = Object.freeze(["1036"])
		expect(() => addItemId(build, "1036", itemsById)).not.toThrow()
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

describe("allowedItemIds", () => {
	test("keeps known ids in link order, duplicates included", () => {
		expect(allowedItemIds(["1036", "3089", "1036"], itemsById)).toEqual([
			"1036",
			"3089",
			"1036",
		])
	})

	test("drops unknown ids and items that break a limit", () => {
		expect(
			allowedItemIds(["3020", "9999", "3006", "3089", "3089"], itemsById),
		).toEqual(["3020", "3089"])
	})

	test("returns no items when the link has none", () => {
		expect(allowedItemIds(undefined, itemsById)).toEqual([])
	})

	test("never returns more than the item slots", () => {
		const many = Array.from({ length: MAX_ITEMS + 1 }, () => "1036")
		expect(allowedItemIds(many, itemsById)).toHaveLength(MAX_ITEMS)
	})
})
