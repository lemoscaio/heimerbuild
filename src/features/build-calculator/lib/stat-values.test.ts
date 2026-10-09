import { describe, expect, test } from "bun:test"
import { formatBonus, formatDelta, type ValueFormat } from "./stat-values"

const ATTACK_SPEED: ValueFormat = {
	format: "attackSpeed",
	attackSpeedRatio: 0.625,
}
const ARMOR: ValueFormat = { attackSpeedRatio: 0.625 }

describe("formatBonus", () => {
	test("bonus attack speed reads as a percent of the ratio, as in game", () => {
		expect(formatBonus(0.25, ATTACK_SPEED)).toBe("+40%")
		expect(formatBonus(-0.0625, ATTACK_SPEED)).toBe("−10%")
	})

	test("other bonuses keep the stat's unit", () => {
		expect(formatBonus(36, ARMOR)).toBe("+36")
		expect(formatBonus(-150, ARMOR)).toBe("−150")
	})
})

describe("formatDelta", () => {
	test("a difference between attack speed totals stays in attacks per second", () => {
		expect(formatDelta(0.582, ATTACK_SPEED)).toBe("+0.582")
	})
})
