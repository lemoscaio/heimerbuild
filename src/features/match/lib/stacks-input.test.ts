import { describe, expect, test } from "bun:test"
import type { MatchStackSource } from "@/lib/effects/effect"
import { sliderStacks, stacksFromField } from "./stacks-input"

const UNCAPPED: MatchStackSource = {
	id: "siphoning-strike",
	name: "Siphoning Strike stacks",
	sliderMax: 1500,
}
const CAPPED: MatchStackSource = {
	id: "mejai-stacks",
	name: "Mejai's Glory",
	sliderMax: 25,
	capped: true,
}

describe("the match stacks input", () => {
	test("the slider sits at the count, and at its end past its max", () => {
		expect(sliderStacks(250, 1500)).toBe(250)
		expect(sliderStacks(0, 1500)).toBe(0)
		expect(sliderStacks(2400, 1500)).toBe(1500)
	})

	test("a typed count becomes whole stacks from 0 to 9999", () => {
		expect(stacksFromField(250, UNCAPPED)).toBe(250)
		expect(stacksFromField(12.6, UNCAPPED)).toBe(13)
		expect(stacksFromField(-5, UNCAPPED)).toBe(0)
		expect(stacksFromField(123456, UNCAPPED)).toBe(9999)
	})

	test("a capped source's count stops at its cap", () => {
		expect(stacksFromField(18, CAPPED)).toBe(18)
		expect(stacksFromField(40, CAPPED)).toBe(25)
	})

	test("an emptied field keeps the last count", () => {
		expect(stacksFromField(null, UNCAPPED)).toBeUndefined()
	})
})
