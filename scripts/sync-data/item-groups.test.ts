import { describe, expect, test } from "bun:test"
import { labelItemGroups } from "./item-groups"
import type { Item } from "./schemas/item"

function item(name: string, groups: readonly string[]) {
	return {
		name,
		groupLimits: groups.map((group) => ({ group, max: 1 })),
	} as Item
}

const labels = { Lifeline: "Lifeline", Covered: null }

describe("labelItemGroups", () => {
	test("labels the groups in the label map, never the ones mapped to null", () => {
		const { items, unlabeled } = labelItemGroups(
			[
				item("Sterak's Gage", ["Lifeline", "3053"]),
				item("Hexdrinker", ["Lifeline", "Covered"]),
				item("Maw", ["Covered"]),
			],
			{ labels },
		)
		expect(items.map(({ groupLimits }) => groupLimits)).toEqual([
			[
				{ group: "Lifeline", max: 1, label: "Lifeline" },
				{ group: "3053", max: 1 },
			],
			[
				{ group: "Lifeline", max: 1, label: "Lifeline" },
				{ group: "Covered", max: 1 },
			],
			[{ group: "Covered", max: 1 }],
		])
		expect(unlabeled).toEqual([])
	})

	test("lists each group of several items missing from the label map", () => {
		const { unlabeled } = labelItemGroups(
			[
				item("Sheen", ["{57352a0f}", "3057"]),
				item("Lich Bane", ["{57352a0f}"]),
			],
			{ labels },
		)
		expect(unlabeled).toEqual([
			{ group: "{57352a0f}", names: ["Sheen", "Lich Bane"] },
		])
	})
})
