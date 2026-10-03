import { describe, expect, test } from "bun:test"
import type { AbilitySlot } from "@schemas/champion"
import { CHAMPION_SKILL_RULES } from "../../../../scripts/sync-data/overrides/champion-skill-rules"
import { skillChampion, TEEMO_ORDER } from "./skill-champions.fixtures"
import {
	fillRecommended,
	levelPoints,
	nextSuggestion,
	placePoint,
	spendBlocker,
	spendPoint,
	withKeptPicks,
} from "./skill-history"
import { skillRulesOf } from "./skill-rules"

const rules = skillRulesOf(skillChampion({ recommendedOrder: TEEMO_ORDER }))

function order(letters: string) {
	return [...letters] as AbilitySlot[]
}

function overrideRules(id: string) {
	const override = CHAMPION_SKILL_RULES.find((rule) => rule.id === id)
	if (!override) throw new Error(`no override ${id}`)
	return skillRulesOf(skillChampion({ skillRules: override.apply(undefined) }))
}

describe("levelPoints", () => {
	test("a build starts with no points: level 1 has one to spend, only suggested", () => {
		const [first, second] = levelPoints([], { level: 1, rules })
		expect(first).toEqual({ level: 1, state: "next", suggestion: "E" })
		expect(second?.state).toBe("future")
	})

	test("lists the spent points, the next one, the others to spend, then the future", () => {
		const points = levelPoints(order("QWE"), { level: 5, rules })
		expect(points.slice(0, 6)).toEqual([
			{ level: 1, state: "spent", slot: "Q", rank: 1 },
			{ level: 2, state: "spent", slot: "W", rank: 1 },
			{ level: 3, state: "spent", slot: "E", rank: 1 },
			{ level: 4, state: "next", suggestion: "E" },
			{ level: 5, state: "unspent" },
			{ level: 6, state: "future" },
		])
		expect(points).toHaveLength(18)
	})

	test("shows the points kept above the level", () => {
		const states = levelPoints(order("QWEQ"), { level: 2, rules }).map(
			(point) => point.state,
		)
		expect(states.slice(0, 5)).toEqual([
			"spent",
			"spent",
			"kept",
			"kept",
			"future",
		])
	})
})

describe("nextSuggestion", () => {
	test("follows the recommended order after the spent points", () => {
		expect(nextSuggestion([], { level: 3, rules })).toBe("E")
		expect(nextSuggestion(order("E"), { level: 3, rules })).toBe("Q")
		// Riot's level 2 Q cannot reach rank 2: the max priority goes on (R cannot rank yet, so E).
		expect(nextSuggestion(order("Q"), { level: 3, rules })).toBe("E")
	})

	test("suggests nothing once every point is spent", () => {
		expect(nextSuggestion(order("QWE"), { level: 3, rules })).toBeUndefined()
	})
})

describe("spendPoint", () => {
	test("spends the next point on any allowed ability, not only the suggested one", () => {
		expect(spendPoint([], { slot: "Q", level: 1, rules })).toEqual(order("Q"))
		expect(spendPoint(order("Q"), { slot: "W", level: 5, rules })).toEqual(
			order("QW"),
		)
	})

	test("refuses with no point left to spend", () => {
		expect(
			spendPoint(order("QWE"), { slot: "Q", level: 3, rules }),
		).toBeUndefined()
	})

	test("R takes its points at 6, 11 and 16 only", () => {
		expect(spendPoint([], { slot: "R", level: 5, rules })).toBeUndefined()
		expect(
			spendPoint(order("QWEQE"), { slot: "R", level: 6, rules }),
		).toHaveLength(6)
		expect(
			spendPoint(order("QWEQER"), { slot: "R", level: 10, rules }),
		).toBeUndefined()
	})

	test("never ranks an ability above what its point's level allows", () => {
		// The level 2 point cannot take Q to rank 2 (level 3), even at level 9.
		expect(spendPoint(order("Q"), { slot: "Q", level: 9, rules })).toBe(
			undefined,
		)
		expect(spendPoint(order("QW"), { slot: "Q", level: 9, rules })).toEqual(
			order("QWQ"),
		)
	})

	test("stops at the max rank", () => {
		expect(
			spendPoint(order("QWQEQRQWQ"), { slot: "Q", level: 10, rules }),
		).toBeUndefined()
	})
})

describe("spendBlocker", () => {
	test("says why an ability cannot take the next point", () => {
		expect(spendBlocker([], { slot: "Q", level: 5, rules })).toBeUndefined()
		expect(spendBlocker(order("QWE"), { slot: "Q", level: 3, rules })).toEqual({
			reason: "no-points",
		})
		expect(spendBlocker([], { slot: "R", level: 5, rules })).toEqual({
			reason: "needs-level",
			level: 6,
		})
		expect(
			spendBlocker(order("QWQEQR"), { slot: "R", level: 10, rules }),
		).toEqual({ reason: "needs-level", level: 11 })
		expect(spendBlocker(order("Q"), { slot: "Q", level: 9, rules })).toEqual({
			reason: "earlier-point",
			pointLevel: 2,
			rankLevel: 3,
		})
		expect(
			spendBlocker(order("QWQEQRQWQ"), { slot: "Q", level: 10, rules }),
		).toEqual({ reason: "max-rank" })
	})

	test("keeps the champion exceptions", () => {
		expect(
			spendBlocker([], {
				slot: "Q",
				level: 1,
				rules: overrideRules("azir-skill-rules"),
			}),
		).toEqual({ reason: "first-point", ability: "W" })
		expect(
			spendBlocker(order("E"), {
				slot: "W",
				level: 3,
				rules: overrideRules("shen-skill-rules"),
			}),
		).toEqual({ reason: "needs-ability", abilities: ["Q"] })
	})
})

describe("fillRecommended", () => {
	test("spends every point left with the recommended order", () => {
		expect(fillRecommended([], { level: 9, rules })).toEqual(
			order("EQWEERE" + "QE"),
		)
		// After Q, level 2 cannot take Q to rank 2: the max priority goes on with E.
		expect(fillRecommended(order("Q"), { level: 4, rules })).toEqual(
			order("QEWE"),
		)
	})

	test("leaves a build with every point spent as it is, kept points included", () => {
		const picks = order("QWEQ")
		expect(fillRecommended(picks, { level: 2, rules })).toBe(picks)
	})
})

describe("placePoint", () => {
	test("changes a spent level and keeps the later points", () => {
		expect(
			placePoint(order("QWEQ"), { slot: "E", pointLevel: 1, level: 4, rules }),
		).toEqual(order("EWEQ"))
	})

	test("spends the next point, and never a later one", () => {
		expect(
			placePoint(order("E"), { slot: "Q", pointLevel: 2, level: 6, rules }),
		).toEqual(order("EQ"))
		expect(
			placePoint(order("E"), { slot: "Q", pointLevel: 4, level: 6, rules }),
		).toBeUndefined()
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
