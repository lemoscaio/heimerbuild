import { describe, expect, test } from "bun:test"
import {
	clampTargetStat,
	presetOf,
	readTarget,
	readTargetParam,
	TARGET_PRESETS,
	toTargetParam,
} from "./target"

describe("readTarget", () => {
	test("an untouched target is the Dummy preset", () => {
		expect(readTarget({})).toEqual({ health: 1800, armor: 60, magicResist: 45 })
		expect(presetOf(readTarget({}))?.id).toBe("dummy")
	})

	test("takes each number given, in its range", () => {
		expect(readTarget({ health: 0, armor: -20, magicResist: 99.6 })).toEqual({
			health: 1,
			armor: 0,
			magicResist: 100,
		})
	})
})

describe("presetOf", () => {
	test("names the preset the numbers match, and none once one is edited", () => {
		const tank = TARGET_PRESETS[3].stats

		expect(presetOf(tank)?.name).toBe("Tank")
		expect(presetOf({ ...tank, armor: tank.armor + 1 })).toBeUndefined()
	})
})

describe("clampTargetStat", () => {
	test("keeps health from 1 and resistances from 0 to their max, whole", () => {
		expect(clampTargetStat("health", 50_000)).toBe(20_000)
		expect(clampTargetStat("armor", Number.NaN)).toBe(0)
		expect(clampTargetStat("magicResist", 12.4)).toBe(12)
	})
})

describe("the target's link value", () => {
	test("is no value for the Dummy, a preset's id, or the numbers", () => {
		expect(toTargetParam({})).toBeUndefined()
		expect(toTargetParam({ ...TARGET_PRESETS[0].stats })).toBeUndefined()
		expect(toTargetParam({ ...TARGET_PRESETS[3].stats })).toBe("tank")
		expect(toTargetParam({ health: 2000, armor: 60, magicResist: 45 })).toBe(
			"2000-60-45",
		)
	})

	test("opens the same target", () => {
		for (const value of [
			{},
			{ ...TARGET_PRESETS[2].stats },
			{ health: 950, armor: 0, magicResist: 300 },
		]) {
			expect(readTarget(readTargetParam(toTargetParam(value)))).toEqual(
				readTarget(value),
			)
		}
	})

	test("reads an unknown preset as the Dummy and numbers in their ranges", () => {
		expect(readTargetParam("boss")).toEqual({})
		expect(readTargetParam("99999-60-45")).toEqual({
			health: 20_000,
			armor: 60,
			magicResist: 45,
		})
	})
})
