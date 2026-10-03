import { describe, expect, test } from "bun:test"
import type { ComputedStats } from "./compute-stats"
import {
	capMovementSpeed,
	type SoftCapRules,
	softCapMovementSpeed,
	softCapsFor,
} from "./movement-speed"

const PATCH = "16.19.1"

describe("softCapMovementSpeed", () => {
	test("leaves speeds from 220 to 415 as they are", () => {
		expect(softCapMovementSpeed(220, PATCH)).toBe(220)
		expect(softCapMovementSpeed(345, PATCH)).toBe(345)
		expect(softCapMovementSpeed(415, PATCH)).toBe(415)
	})

	test("keeps 80% of the speed between 415 and 490", () => {
		expect(softCapMovementSpeed(450, PATCH)).toBeCloseTo(450 * 0.8 + 83)
		expect(softCapMovementSpeed(490, PATCH)).toBeCloseTo(475)
	})

	test("keeps 50% of the speed over 490", () => {
		expect(softCapMovementSpeed(600, PATCH)).toBeCloseTo(600 * 0.5 + 230)
	})

	test("raises speeds under 220", () => {
		expect(softCapMovementSpeed(200, PATCH)).toBeCloseTo(110 + 200 * 0.5)
		expect(softCapMovementSpeed(-50, PATCH)).toBeCloseTo(110 - 50 * 0.01)
	})

	test("never jumps at a threshold", () => {
		for (const threshold of [0, 220, 415, 490]) {
			expect(softCapMovementSpeed(threshold + 1e-9, PATCH)).toBeCloseTo(
				softCapMovementSpeed(threshold - 1e-9, PATCH),
			)
		}
	})
})

describe("capMovementSpeed", () => {
	test("caps the total and keeps the base, so the bonus shrinks", () => {
		const stats = {
			movementSpeed: { base: 345, bonus: 155, total: 500 },
		} as ComputedStats

		expect(capMovementSpeed(stats, PATCH).movementSpeed).toEqual({
			base: 345,
			bonus: 480 - 345,
			total: 480,
		})
	})
})

describe("softCapsFor", () => {
	const caps = (offset: number) => [{ from: 415, ratio: 0.8, offset }]
	const rules: SoftCapRules[] = [
		{
			since: "16.19",
			until: "16.21",
			caps: caps(83),
			sourceUrl: "https://example.com/a",
		},
		{ since: "16.22", caps: caps(90), sourceUrl: "https://example.com/b" },
	]

	test("picks the version in force on the build's patch", () => {
		expect(softCapsFor("16.19.1", rules)).toEqual(caps(83))
		expect(softCapsFor("16.21.3", rules)).toEqual(caps(83))
		expect(softCapsFor("16.22.1", rules)).toEqual(caps(90))
	})

	test("a version stops after its until, and starts at its since", () => {
		expect(softCapsFor("16.22.1", rules)).not.toEqual(caps(83))
		expect(softCapsFor("16.18.1", rules)).toEqual([])
	})

	test("the verified caps hold from 16.19 on; an older patch has none", () => {
		expect(softCapMovementSpeed(450, "16.19.1")).toBeCloseTo(443)
		expect(softCapMovementSpeed(450, "16.18.1")).toBe(450)
	})
})
