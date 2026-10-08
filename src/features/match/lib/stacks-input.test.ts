import { describe, expect, test } from "bun:test"
import { sliderStacks, stacksFromField } from "./stacks-input"

describe("the match stacks input", () => {
	test("the slider sits at the count, and at its end past its max", () => {
		expect(sliderStacks(250, 1500)).toBe(250)
		expect(sliderStacks(0, 1500)).toBe(0)
		expect(sliderStacks(2400, 1500)).toBe(1500)
	})

	test("a typed count becomes whole stacks from 0 to 9999", () => {
		expect(stacksFromField(250)).toBe(250)
		expect(stacksFromField(12.6)).toBe(13)
		expect(stacksFromField(-5)).toBe(0)
		expect(stacksFromField(123456)).toBe(9999)
	})

	test("an emptied field keeps the last count", () => {
		expect(stacksFromField(null)).toBeUndefined()
	})
})
