import { describe, expect, test } from "bun:test"
import type { ComputedStats } from "./compute-stats"
import { capMovementSpeed, softCapMovementSpeed } from "./movement-speed"

describe("softCapMovementSpeed", () => {
	test("leaves speeds from 220 to 415 as they are", () => {
		expect(softCapMovementSpeed(220)).toBe(220)
		expect(softCapMovementSpeed(345)).toBe(345)
		expect(softCapMovementSpeed(415)).toBe(415)
	})

	test("keeps 80% of the speed between 415 and 490", () => {
		expect(softCapMovementSpeed(450)).toBeCloseTo(450 * 0.8 + 83)
		expect(softCapMovementSpeed(490)).toBeCloseTo(475)
	})

	test("keeps 50% of the speed over 490", () => {
		expect(softCapMovementSpeed(600)).toBeCloseTo(600 * 0.5 + 230)
	})

	test("raises speeds under 220", () => {
		expect(softCapMovementSpeed(200)).toBeCloseTo(110 + 200 * 0.5)
		expect(softCapMovementSpeed(-50)).toBeCloseTo(110 - 50 * 0.01)
	})

	test("never jumps at a threshold", () => {
		for (const threshold of [0, 220, 415, 490]) {
			expect(softCapMovementSpeed(threshold + 1e-9)).toBeCloseTo(
				softCapMovementSpeed(threshold - 1e-9),
			)
		}
	})
})

describe("capMovementSpeed", () => {
	test("caps the total and keeps the base, so the bonus shrinks", () => {
		const stats = {
			movementSpeed: { base: 345, bonus: 155, total: 500 },
		} as ComputedStats

		expect(capMovementSpeed(stats).movementSpeed).toEqual({
			base: 345,
			bonus: 480 - 345,
			total: 480,
		})
	})
})
