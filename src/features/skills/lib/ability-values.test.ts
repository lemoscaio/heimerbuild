import { describe, expect, test } from "bun:test"
import { formatAbilityValue, rankUpChanges } from "./ability-values"

// Teemo's R on 16.19.1.
const noxiousTrap = {
	rankValues: [
		{ label: "Damage", values: [200, 325, 450] },
		{ label: "Slow", values: [30, 40, 50], unit: "%" as const },
		{ label: "Recharge", values: [30, 30, 30] },
	],
}

describe("rankUpChanges", () => {
	test("lists what the next rank changes, from the values at each rank", () => {
		expect(rankUpChanges(noxiousTrap, 1)).toEqual([
			{ label: "Damage", from: 200, to: 325 },
			{ label: "Slow", unit: "%", from: 30, to: 40 },
		])
	})

	test("learning the ability shows every value, from nothing", () => {
		expect(rankUpChanges(noxiousTrap, 0)).toEqual([
			{ label: "Damage", from: undefined, to: 200 },
			{ label: "Slow", unit: "%", from: undefined, to: 30 },
			{ label: "Recharge", from: undefined, to: 30 },
		])
	})

	test("a maxed ability has no next rank", () => {
		expect(rankUpChanges(noxiousTrap, 3)).toEqual([])
	})
})

test("formatAbilityValue keeps up to two decimals and the unit", () => {
	expect(formatAbilityValue(2.25)).toBe("2.25")
	expect(formatAbilityValue(697.5)).toBe("697.5")
	expect(formatAbilityValue(12, "%")).toBe("12%")
	expect(formatAbilityValue(1.333)).toBe("1.33")
})
