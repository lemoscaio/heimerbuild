import { describe, expect, test } from "bun:test"
import { damageMultiplier, effectiveResist } from "./mitigation"

describe("damageMultiplier", () => {
	test("100 / (100 + R) at 0 or more, 2 − 100 / (100 − R) below 0 (wiki Armor)", () => {
		expect(damageMultiplier(0)).toBe(1)
		expect(damageMultiplier(100)).toBe(0.5)
		expect(damageMultiplier(200)).toBeCloseTo(1 / 3)
		expect(damageMultiplier(-100)).toBe(1.5)
	})
})

describe("effectiveResist", () => {
	test("applies flat reduction, percent reduction, percent penetration, then lethality (wiki example)", () => {
		// 300 armor, 30 flat and 30% reduction, then 10 flat penetration: 300 → 270 → 189 → 179.
		expect(
			effectiveResist(300, {
				flatReduction: 30,
				percentReduction: 0.3,
				flatPenetration: 10,
			}),
		).toBeCloseTo(179)
		expect(effectiveResist(100, { percentPenetration: 0.3 })).toBeCloseTo(70)
	})

	test("flat penetration stops at 0, flat reduction goes below it, and percent steps skip a resistance at or below 0", () => {
		expect(effectiveResist(20, { flatPenetration: 30 })).toBe(0)
		expect(effectiveResist(10, { flatReduction: 25 })).toBe(-15)
		expect(
			effectiveResist(10, { flatReduction: 25, percentPenetration: 0.5 }),
		).toBe(-15)
	})
})
