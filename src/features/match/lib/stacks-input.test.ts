import { describe, expect, test } from "bun:test"
import {
	pressedStackPresets,
	stacksFromField,
	stacksFromPreset,
} from "./stacks-input"

const PRESETS = [100, 250, 500]

describe("the match stacks input", () => {
	test("presses the preset equal to the count, none otherwise", () => {
		expect(pressedStackPresets(PRESETS, 250)).toEqual(["250"])
		expect(pressedStackPresets(PRESETS, 0)).toEqual([])
		expect(pressedStackPresets(PRESETS, 251)).toEqual([])
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

	test("a preset sets its count; the pressed one clicked again keeps it", () => {
		expect(stacksFromPreset(["500"])).toBe(500)
		expect(stacksFromPreset([])).toBeUndefined()
	})
})
