import { describe, expect, test } from "bun:test"
import { attackWindupTime } from "./attack-windup"

describe("attackWindupTime", () => {
	test("at base attack speed it is the percent of the attack time (Teemo: 20% of 1 / 0.69)", () => {
		expect(
			attackWindupTime(
				{ percent: 0.2, modifier: 1 },
				{ base: 0.69, total: 0.69 },
			),
		).toBeCloseTo(0.2 / 0.69)
	})

	test("without a modifier it shrinks with the attack time", () => {
		expect(
			attackWindupTime(
				{ percent: 0.2, modifier: 1 },
				{ base: 0.625, total: 1.25 },
			),
		).toBeCloseTo(0.16)
	})

	test("a modifier keeps part of the base windup (Darius 0.5: half the change)", () => {
		// Base 0.2 / 0.625 = 0.32 s; at 1.25 attacks/s the full change would give 0.16 s.
		expect(
			attackWindupTime(
				{ percent: 0.2, modifier: 0.5 },
				{ base: 0.625, total: 1.25 },
			),
		).toBeCloseTo(0.24)
	})

	test("matches the wiki's second form when base attack speed and ratio are equal", () => {
		// attackTime × percent × (1 + bonus attack speed × (1 − modifier)), bonus = 100%.
		const total = 0.625 * 2
		expect(
			attackWindupTime(
				{ percent: 0.18, modifier: 0.5 },
				{ base: 0.625, total },
			),
		).toBeCloseTo((1 / total) * 0.18 * (1 + 1 * 0.5))
	})

	test("is never longer than the attack", () => {
		expect(
			attackWindupTime(
				{ percent: 0.3, modifier: 0 },
				{ base: 0.625, total: 3 },
			),
		).toBeCloseTo(1 / 3)
	})
})
