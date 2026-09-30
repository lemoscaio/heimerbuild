import { describe, expect, test } from "bun:test"
import { duration, staggerSpread } from "./tokens"

describe("motion tokens", () => {
	test("no duration is longer than 300 ms", () => {
		for (const value of Object.values(duration)) {
			expect(value).toBeLessThanOrEqual(0.3)
		}
	})

	test("a staggered item finishes within the slowest duration", () => {
		expect(staggerSpread + duration.fast).toBeLessThanOrEqual(duration.slow)
	})
})
