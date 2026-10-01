import { describe, expect, test } from "bun:test"
import type { LevelState } from "@schemas/champion"
import { attackTypeAtLevel, levelStateAt } from "./level-states"

const kayleLike: LevelState[] = [
	{
		fromLevel: 6,
		attackType: "ranged",
		attackRange: { base: 525, perLevel: 0 },
	},
	{ fromLevel: 16, attackRange: { base: 625, perLevel: 0 } },
]

describe("levelStateAt", () => {
	test("is empty before the first state and without level states", () => {
		expect(levelStateAt(kayleLike, 5)).toEqual({})
		expect(levelStateAt(undefined, 18)).toEqual({})
	})

	test("applies a state from its level on", () => {
		expect(levelStateAt(kayleLike, 6)).toEqual({
			attackType: "ranged",
			attackRange: { base: 525, perLevel: 0 },
		})
		expect(levelStateAt(kayleLike, 15).attackRange?.base).toBe(525)
	})

	test("a later state replaces only the fields it sets", () => {
		expect(levelStateAt(kayleLike, 16)).toEqual({
			attackType: "ranged",
			attackRange: { base: 625, perLevel: 0 },
		})
	})
})

describe("attackTypeAtLevel", () => {
	const kayle = { attackType: "melee" as const, levelStates: kayleLike }

	test("follows the level states", () => {
		expect(attackTypeAtLevel(kayle, 5)).toBe("melee")
		expect(attackTypeAtLevel(kayle, 6)).toBe("ranged")
		expect(attackTypeAtLevel(kayle, 18)).toBe("ranged")
	})

	test("is the champion's own without level states", () => {
		expect(attackTypeAtLevel({ attackType: "ranged" }, 1)).toBe("ranged")
	})
})
