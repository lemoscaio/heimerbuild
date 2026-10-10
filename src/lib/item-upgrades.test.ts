import { describe, expect, test } from "bun:test"
import { ItemsFileSchema } from "@schemas/item"
import {
	canonicalItemValues,
	effectiveItems,
	ITEM_UPGRADES,
	unreachableUpgrades,
	upgradeLabel,
	upgradeLabels,
} from "./item-upgrades"

// Real current-patch data (public/data), as the build reads it.
const DATA = new URL("../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()
const { items } = ItemsFileSchema.parse(
	await Bun.file(new URL(`${PATCH}/items.json`, DATA)).json(),
)
const itemsById = Object.fromEntries(items.map((item) => [item.id, item]))
const names = (list: readonly { name: string }[]) =>
	list.map(({ name }) => name)
const held = (...ids: string[]) => ids.map((id) => itemsById[id])
// Ezreal's and Garen's resources in the data.
const MANA_USER = { resource: "MANA" }
const MANALESS = { resource: "NONE" }

describe("ITEM_UPGRADES", () => {
	test("each upgrade is synced with its base item, and every synced upgrade has its rule", () => {
		const synced = items.flatMap(({ id, transformsFrom }) =>
			transformsFrom ? [{ upgrade: id, base: transformsFrom }] : [],
		)

		const rules = ITEM_UPGRADES.map(({ upgrade, base }) => ({ upgrade, base }))

		expect(
			rules.toSorted((a, b) => a.upgrade.localeCompare(b.upgrade)),
		).toEqual(synced)
	})
})

describe("effectiveItems", () => {
	test("Manamune and Archangel's Staff are their upgrades from 360 Manaflow on, in their slots", () => {
		const build = held("3004", "3089", "3003")

		expect(
			names(
				effectiveItems(build, { "manaflow-mana": 360 }, itemsById, MANA_USER),
			),
		).toEqual(["Muramana", "Rabadon's Deathcap", "Seraph's Embrace"])
		expect(
			names(
				effectiveItems(build, { "manaflow-mana": 359 }, itemsById, MANA_USER),
			),
		).toEqual(["Manamune", "Rabadon's Deathcap", "Archangel's Staff"])
		expect(
			names(effectiveItems(build, undefined, itemsById, MANA_USER)),
		).toEqual(["Manamune", "Rabadon's Deathcap", "Archangel's Staff"])
	})

	test("Tear of the Goddess stays Tear at 360", () => {
		expect(
			names(
				effectiveItems(
					held("3070"),
					{ "manaflow-mana": 360 },
					itemsById,
					MANA_USER,
				),
			),
		).toEqual(["Tear of the Goddess"])
	})

	test("the upgrade keeps its base's group limits, so it still counts as the build's Manaflow item", () => {
		const [muramana] = effectiveItems(
			held("3004"),
			{ "manaflow-mana": 360 },
			itemsById,
			MANA_USER,
		)

		expect(muramana?.groupLimits.map(({ group }) => group)).toEqual([
			"{a4ceabbc}",
			"TearItems",
		])
	})

	test("a champion without mana gathers no Manaflow: Manamune and Archangel's never upgrade", () => {
		const build = held("3004", "3003")

		expect(
			names(
				effectiveItems(build, { "manaflow-mana": 360 }, itemsById, MANALESS),
			),
		).toEqual(["Manamune", "Archangel's Staff"])
	})

	test("the items stay as given while the patch's items load", () => {
		const build = held("3004")

		expect(
			effectiveItems(build, { "manaflow-mana": 360 }, undefined, MANA_USER),
		).toEqual(build)
	})
})

describe("canonicalItemValues", () => {
	test("an upgrade's id is its base item, with the count raised to 360", () => {
		expect(
			canonicalItemValues(
				{ itemIds: ["3089", "3042"], matchStacks: undefined },
				MANA_USER,
			),
		).toEqual({
			itemIds: ["3089", "3004"],
			matchStacks: { "manaflow-mana": 360 },
		})
	})

	test("other stacks stay, and so do the values without an upgrade", () => {
		const values = {
			itemIds: ["3070"],
			matchStacks: { "manaflow-mana": 120 },
		}

		expect(canonicalItemValues(values, MANA_USER)).toBe(values)
		expect(
			canonicalItemValues(
				{
					itemIds: ["3040"],
					matchStacks: { "manaflow-mana": 120, "mejai-stacks": 10 },
				},
				MANA_USER,
			),
		).toEqual({
			itemIds: ["3003"],
			matchStacks: { "manaflow-mana": 360, "mejai-stacks": 10 },
		})
	})
})

describe("canonicalItemValues without mana", () => {
	test("an upgrade's id on a champion without mana is its base item, with no count", () => {
		expect(
			canonicalItemValues(
				{ itemIds: ["3042"], matchStacks: undefined },
				MANALESS,
			),
		).toEqual({ itemIds: ["3004"], matchStacks: undefined })
	})
})

describe("unreachableUpgrades", () => {
	test("without mana, Muramana and Seraph's Embrace; with mana, none", () => {
		expect([...unreachableUpgrades(MANALESS)]).toEqual(["3042", "3040"])
		expect([...unreachableUpgrades(MANA_USER)]).toEqual([])
	})
})

describe("upgradeLabel", () => {
	test("names the base item and the count", () => {
		expect(upgradeLabel("3042", itemsById)).toBe(
			"Upgrade of Manamune · 360 Manaflow",
		)
		expect(upgradeLabels(itemsById)).toEqual({
			"3042": "Upgrade of Manamune · 360 Manaflow",
			"3040": "Upgrade of Archangel's Staff · 360 Manaflow",
		})
		expect(upgradeLabel("3004", itemsById)).toBeUndefined()
	})
})
