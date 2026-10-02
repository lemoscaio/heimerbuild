import { describe, expect, test } from "bun:test"
import type { AbilitySlot } from "@schemas/champion"
import { skillChampion, TEEMO_ORDER } from "./skill-champions.fixtures"
import {
	placePoint,
	skillPointsAt,
	spendPoint,
	withKeptPicks,
} from "./skill-history"
import { skillRulesOf } from "./skill-rules"

const rules = skillRulesOf(skillChampion({ recommendedOrder: TEEMO_ORDER }))

function order(letters: string) {
	return [...letters] as AbilitySlot[]
}

function letters(points: { slot: AbilitySlot }[] | readonly AbilitySlot[]) {
	return points
		.map((point) => (typeof point === "string" ? point : point.slot))
		.join("")
}

describe("skillPointsAt", () => {
	test("shows the picks, then suggested points up to the level", () => {
		const points = skillPointsAt(order("QWE"), { level: 5, rules })
		expect(letters(points)).toBe("QWEEE")
		expect(points.map(({ isAuto }) => isAuto)).toEqual([
			false,
			false,
			false,
			true,
			true,
		])
	})

	test("hides the picks above the level", () => {
		expect(letters(skillPointsAt(order("QWEQQR"), { level: 4, rules }))).toBe(
			"QWEQ",
		)
	})
})

describe("spendPoint", () => {
	test("puts the first suggested point on the ability", () => {
		expect(spendPoint(order("QW"), { slot: "Q", level: 5, rules })).toEqual(
			order("QWQ"),
		)
	})

	test("refuses when every point is picked or the rank is not allowed yet", () => {
		expect(
			spendPoint(order("QWE"), { slot: "Q", level: 3, rules }),
		).toBeUndefined()
		expect(
			spendPoint(order("Q"), { slot: "Q", level: 5, rules }),
		).toBeUndefined()
		expect(spendPoint([], { slot: "R", level: 5, rules })).toBeUndefined()
	})
})

describe("placePoint", () => {
	test("changes an earlier level and keeps the later picks", () => {
		expect(
			placePoint(order("QWEQ"), { slot: "E", pointLevel: 1, level: 4, rules }),
		).toEqual(order("EWEQ"))
	})

	test("turns the suggested points before it into picks", () => {
		// Suggested at levels 2-3: Q and W (Teemo's E Q W E).
		expect(
			placePoint(order("E"), { slot: "Q", pointLevel: 4, level: 6, rules }),
		).toEqual(order("EQWQ"))
	})

	test("refuses a point the rules forbid for the whole order", () => {
		expect(
			placePoint(order("QWEQ"), { slot: "Q", pointLevel: 2, level: 4, rules }),
		).toBeUndefined()
		expect(
			placePoint(order("QWE"), { slot: "R", pointLevel: 3, level: 3, rules }),
		).toBeUndefined()
		expect(
			placePoint(order("QWE"), { slot: "Q", pointLevel: 4, level: 3, rules }),
		).toBeUndefined()
	})

	describe("like browser history", () => {
		// Picked up to level 11, then the level went down to 9: W (10) and R (11) are kept.
		const picks = order("EQWEERE" + "QE" + "WR")

		test("picking the same ability keeps the points above the level", () => {
			expect(
				placePoint(picks, { slot: "E", pointLevel: 9, level: 9, rules }),
			).toBe(picks)
		})

		test("picking a different ability drops them", () => {
			expect(
				placePoint(picks, { slot: "W", pointLevel: 9, level: 9, rules }),
			).toEqual(order("EQWEERE" + "QW"))
		})
	})
})

describe("withKeptPicks", () => {
	const remembered = order("EQWEERE" + "QE" + "WR")

	test("keeps the remembered points above the level while the link agrees", () => {
		expect(withKeptPicks(remembered, remembered.slice(0, 9), 9)).toBe(
			remembered,
		)
		expect(withKeptPicks(remembered, remembered, 11)).toBe(remembered)
	})

	test("follows the link once it says something else", () => {
		const otherBuild = order("QWE")
		expect(withKeptPicks(remembered, otherBuild, 9)).toBe(otherBuild)
		// Same start, but fewer picks below the level: a new link, not a level change.
		expect(withKeptPicks(remembered, remembered.slice(0, 3), 9)).toEqual(
			remembered.slice(0, 3),
		)
		expect(withKeptPicks(undefined, otherBuild, 9)).toBe(otherBuild)
	})
})
