import { describe, expect, test } from "bun:test"
import { clampTargetStat, presetOf, readTarget, TARGET_PRESETS } from "./target"

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
