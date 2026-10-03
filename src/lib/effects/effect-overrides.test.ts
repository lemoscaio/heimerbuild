import { describe, expect, test } from "bun:test"
import {
	EFFECTS_PARAM_PATTERN,
	parseEffectOverrides,
	serializeEffectOverrides,
} from "./effect-overrides"

describe("the effects param", () => {
	test("ids turn effects on, a leading dash turns them off", () => {
		expect(parseEffectOverrides("ghost,-teemo-w-passive")).toEqual({
			ghost: true,
			"teemo-w-passive": false,
		})
		expect(
			serializeEffectOverrides({ ghost: true, "teemo-w-passive": false }),
		).toBe("ghost,-teemo-w-passive")
	})

	test("no choices means no param", () => {
		expect(serializeEffectOverrides({})).toBeUndefined()
		expect(serializeEffectOverrides(undefined)).toBeUndefined()
		expect(parseEffectOverrides(undefined)).toBeUndefined()
	})

	test("an unreadable value means no choices", () => {
		for (const value of [
			"",
			"Ghost",
			"ghost,,heal",
			"--ghost",
			"ghost-",
			"a b",
		]) {
			expect(EFFECTS_PARAM_PATTERN.test(value)).toBe(false)
			expect(parseEffectOverrides(value)).toBeUndefined()
		}
	})

	test("reads back what it writes", () => {
		const overrides = { "nimbus-cloak-flash": true, heal: false }
		expect(parseEffectOverrides(serializeEffectOverrides(overrides))).toEqual(
			overrides,
		)
	})
})
