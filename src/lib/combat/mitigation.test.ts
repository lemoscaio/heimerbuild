import { describe, expect, test } from "bun:test"
import type { ComputedStats } from "../stats/compute-stats"
import {
	damageMultiplier,
	effectiveResist,
	mitigate,
	reducedResists,
} from "./mitigation"

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

describe("the target's reductions", () => {
	test("flat ones add up and percent ones multiply (wiki Armor penetration)", () => {
		expect(
			reducedResists({ armor: 100, magicResist: 50 }, [
				{ resist: "armor", mode: "flat", value: 10 },
				{ resist: "armor", mode: "flat", value: 5 },
				{ resist: "armor", mode: "percent", value: 0.3 },
				{ resist: "armor", mode: "percent", value: 0.2 },
				{ resist: "magicResist", mode: "flat", value: 20 },
			]),
		).toEqual({ armor: 85 * 0.7 * 0.8, magicResist: 30 })
	})

	test("apply before the attacker's penetration", () => {
		const attacker = {
			armorPenetrationPercent: { total: 0.3 },
			lethality: { total: 10 },
			armorPenetrationFlat: { total: 0 },
		} as unknown as ComputedStats
		// 300 armor, 30 flat and 30% reduction, 30% penetration, 10 lethality: 300 → 270 → 189 → 132.3 → 122.3.
		const final = mitigate(100, "physical", {
			target: { armor: 300, magicResist: 0 },
			attacker,
			reductions: [
				{ resist: "armor", mode: "flat", value: 30 },
				{ resist: "armor", mode: "percent", value: 0.3 },
			],
		})

		expect(final).toBeCloseTo(100 * damageMultiplier(122.3))
	})
})
