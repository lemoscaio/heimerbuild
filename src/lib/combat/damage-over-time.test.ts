import { describe, expect, test } from "bun:test"
import { tickTime } from "./damage-over-time"

type Timing = Parameters<typeof tickTime>[2]

function times(startedAt: number, count: number, timing: Timing) {
	return Array.from({ length: count }, (_, index) =>
		Number(tickTime(startedAt, index, timing).toFixed(3)),
	)
}

describe("tickTime: when each tick lands", () => {
	test("the first on the application, then every `every`", () => {
		expect(times(2, 3, { every: 0.5 })).toEqual([2, 2.5, 3])
	})

	test("delayed: the first one `every` after the application", () => {
		expect(times(2, 3, { every: 1, firstTick: "delayed" })).toEqual([3, 4, 5])
	})

	test("Ignite (wiki): the first at the cast, then every 1.056 s", () => {
		const ignite = { every: 1.056 }

		expect(times(0, 5, ignite)).toEqual([0, 1.056, 2.112, 3.168, 4.224])
		expect(times(3, 2, ignite)).toEqual([3, 4.056])
	})
})
