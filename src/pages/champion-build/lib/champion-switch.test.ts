import { describe, expect, test } from "bun:test"
import type { BuildValues } from "@/features/build-calculator/types/build-source"
import { switchChampionValues } from "./champion-switch"

const FULL_BUILD: BuildValues = {
	level: 9,
	itemIds: ["3031", "6672"],
	runes: "8000-8005-9111-9104-8014-8100-8139-8135-5005-5008-5001",
	summoners: "4,14",
	currentHealth: 40,
	gameTime: 30,
	form: "mega",
	skills: "QWEQQRQ",
	effects: { ghost: true, "teemo-w-passive": false },
	combo: "aa.q",
	free: true,
	choices: "1e-hail-of-blades-n",
	target: "tank",
}

describe("switchChampionValues", () => {
	test("keeps the items, runes, summoner spells, level, current health and game time", () => {
		const { values } = switchChampionValues(FULL_BUILD)

		expect(values).toMatchObject({
			level: 9,
			itemIds: ["3031", "6672"],
			runes: FULL_BUILD.runes,
			summoners: "4,14",
			currentHealth: 40,
			gameTime: 30,
		})
	})

	test("drops the form, skill points and the combo with its free mode, choices and target", () => {
		const { values } = switchChampionValues(FULL_BUILD)

		expect(values.form).toBeUndefined()
		expect(values.skills).toBeUndefined()
		expect(values.combo).toBeUndefined()
		expect(values.free).toBeUndefined()
		expect(values.choices).toBeUndefined()
		expect(values.target).toBeUndefined()
	})

	test("drops only the ability effect choices: a summoner spell's stays", () => {
		const { values, summary } = switchChampionValues(FULL_BUILD)

		expect(values.effects).toEqual({ ghost: true })
		expect(summary.resets).toContain("effects")
	})

	test("lists every reset of a build that had them all", () => {
		const { summary } = switchChampionValues(FULL_BUILD)

		expect(summary.resets).toEqual(["form", "skills", "effects", "combo"])
		expect(summary.kept).toEqual(["items", "runes", "spells"])
	})

	test("lists no reset that changes nothing", () => {
		const { values, summary } = switchChampionValues({
			level: 1,
			itemIds: [],
			effects: { ghost: true },
		})

		expect(summary.resets).toEqual([])
		expect(summary.kept).toEqual([])
		expect(values.effects).toEqual({ ghost: true })
	})

	test("leaves no effects when only ability choices were made", () => {
		const { values, summary } = switchChampionValues({
			level: 6,
			itemIds: [],
			effects: { "teemo-w-passive": false },
		})

		expect(values.effects).toBeUndefined()
		expect(summary.resets).toEqual(["effects"])
	})

	test("counts the combo reset for a target or free mode without steps", () => {
		expect(
			switchChampionValues({ level: 1, itemIds: [], target: "tank" }).summary
				.resets,
		).toEqual(["combo"])
		expect(
			switchChampionValues({ level: 1, itemIds: [], free: true }).summary
				.resets,
		).toEqual(["combo"])
	})
})
