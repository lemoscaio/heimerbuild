import { describe, expect, test } from "bun:test"
import {
	applyOverrides,
	assertValidOverrides,
	type DataOverride,
	staleOverrideLines,
} from "./apply-overrides"
import { CHAMPION_OVERRIDES } from "./champion-overrides"
import { ITEM_OVERRIDES } from "./item-overrides"

type Thing = { id: string; tags: string[]; cost: number }

const things: Thing[] = [
	{ id: "1", tags: ["Boots"], cost: 300 },
	{ id: "2", tags: ["Damage"], cost: 1000 },
]

function override(
	fields: Partial<DataOverride<Thing>> = {},
): DataOverride<Thing> {
	return {
		id: "add-tag",
		target: "2",
		field: "tags",
		since: "16.19",
		reason: "test",
		apply: (tags: string[]) => [...tags, "Added"],
		...fields,
	} as DataOverride<Thing>
}

function run(overrides: DataOverride<Thing>[], version = "16.19.1") {
	return applyOverrides(things, overrides, {
		version,
		kind: "item",
		idOf: (thing) => thing.id,
	})
}

describe("applyOverrides", () => {
	test("changes the target field and leaves everything else as it was", () => {
		const { entities, report } = run([override()])

		expect(entities).toEqual([
			{ id: "1", tags: ["Boots"], cost: 300 },
			{ id: "2", tags: ["Damage", "Added"], cost: 1000 },
		])
		expect(things[1]?.tags).toEqual(["Damage"])
		expect(report).toEqual({
			applied: [{ id: "add-tag", entity: "item 2" }],
			obsolete: [],
			missingTarget: [],
		})
	})

	test("skips overrides outside their patch range", () => {
		const { entities, report } = run([
			override({ since: "16.20" }),
			override({ id: "old", since: "16.1", until: "16.18" }),
		])

		expect(entities).toEqual(things)
		expect(report.applied).toEqual([])
	})

	test("applies every override of an entity, in list order", () => {
		const { entities } = run([
			override(),
			override({ id: "discount", field: "cost", apply: () => 900 }),
		])

		expect(entities[1]).toEqual({
			id: "2",
			tags: ["Damage", "Added"],
			cost: 900,
		})
	})

	test("reports an override whose apply changes nothing as obsolete", () => {
		const { entities, report } = run([
			override({
				target: "1",
				apply: (tags: string[]) => [...new Set([...tags, "Boots"])],
			}),
		])

		expect(entities).toEqual(things)
		expect(report.obsolete).toEqual([{ id: "add-tag", entity: "item 1" }])
	})

	test("sees a change even when apply mutates its input", () => {
		const { report } = run([
			override({
				apply: (tags: string[]) => {
					tags.push("Added")
					return tags
				},
			}),
		])

		expect(report.applied).toHaveLength(1)
		expect(things[1]?.tags).toEqual(["Damage"])
	})

	test("reports an override whose target is not in the data", () => {
		const { report } = run([override({ target: "999" })])

		expect(report.missingTarget).toEqual([
			{ id: "add-tag", entity: "item 999" },
		])
	})

	test("fails on a duplicate id before applying anything", () => {
		expect(() =>
			run([override(), override({ field: "cost", apply: () => 1 })]),
		).toThrow('Duplicate override id "add-tag"')
	})
})

describe("assertValidOverrides", () => {
	test("fails on two overrides of the same field of an entity in overlapping patches", () => {
		expect(() =>
			assertValidOverrides<Thing>([
				override({ since: "16.19" }),
				override({ id: "later", since: "16.22" }),
			]),
		).toThrow('Overrides "add-tag" and "later" both change tags of 2')
	})

	test("allows the same fix again in a later, separate range", () => {
		expect(() =>
			assertValidOverrides<Thing>([
				override({ since: "16.19", until: "16.20" }),
				override({ id: "again", since: "16.22" }),
			]),
		).not.toThrow()
	})

	test("fails on an id that is not kebab-case and on a malformed range", () => {
		expect(() =>
			assertValidOverrides<Thing>([override({ id: "Add tag" })]),
		).toThrow("not kebab-case")
		expect(() =>
			assertValidOverrides<Thing>([
				override({ since: "16.20", until: "16.19" }),
			]),
		).toThrow(
			'Override "add-tag": Patch range 16.20..16.19 ends before it starts',
		)
	})

	test("accepts the committed override lists", () => {
		expect(() => assertValidOverrides(ITEM_OVERRIDES)).not.toThrow()
		expect(() => assertValidOverrides(CHAMPION_OVERRIDES)).not.toThrow()
	})
})

describe("staleOverrideLines", () => {
	test("lists obsolete and missing-target overrides of every report", () => {
		const lines = staleOverrideLines([
			{
				applied: [{ id: "a", entity: "item 1" }],
				obsolete: [{ id: "b", entity: "item 2" }],
				missingTarget: [],
			},
			{
				applied: [],
				obsolete: [],
				missingTarget: [{ id: "c", entity: "champion Garen" }],
			},
		])

		expect(lines).toHaveLength(2)
		expect(lines[0]).toContain("`b` (item 2)")
		expect(lines[1]).toContain("`c` (champion Garen)")
	})
})
