import { describe, expect, test } from "bun:test"
import type { AbilitySlot } from "@schemas/champion"
import { CHAMPION_SKILL_RULES } from "../../../../scripts/sync-data/overrides/champion-skill-rules"
import { skillChampion, TEEMO_ORDER } from "./skill-champions.fixtures"
import {
	fillRecommended,
	levelPoints,
	nextSuggestion,
	placePoint,
	removeBlocker,
	removePoint,
	type SkillPicks,
	spendBlocker,
	spendLevel,
	spendPoint,
	withKeptPicks,
} from "./skill-history"
import { skillRulesOf } from "./skill-rules"

const rules = skillRulesOf(skillChampion({ recommendedOrder: TEEMO_ORDER }))

/** "Q_Q": Q at levels 1 and 3, level 2 unspent. */
function order(letters: string) {
	return [...letters].map((letter) =>
		letter === "_" ? null : (letter as AbilitySlot),
	)
}

function overrideRules(id: string) {
	const override = CHAMPION_SKILL_RULES.find((rule) => rule.id === id)
	if (!override) throw new Error(`no override ${id}`)
	return skillRulesOf(skillChampion({ skillRules: override.apply(undefined) }))
}

describe("levelPoints", () => {
	test("a build starts with no points: level 1 is unspent, only suggested", () => {
		const [first, second] = levelPoints([], { level: 1, rules })
		expect(first).toEqual({ level: 1, state: "free", suggestion: "E" })
		expect(second?.state).toBe("future")
	})

	test("lists spent points and gaps; only the first gap carries the suggestion", () => {
		const points = levelPoints(order("Q_Q"), { level: 5, rules })
		expect(points.slice(0, 6)).toEqual([
			{ level: 1, state: "spent", slot: "Q", rank: 1 },
			{ level: 2, state: "free", suggestion: "E" },
			{ level: 3, state: "spent", slot: "Q", rank: 2 },
			{ level: 4, state: "free", suggestion: undefined },
			{ level: 5, state: "free", suggestion: undefined },
			{ level: 6, state: "future" },
		])
		expect(points).toHaveLength(18)
	})

	test("lowering the level keeps only the points above it, gaps stay gaps", () => {
		const states = levelPoints(order("Q_E_W"), { level: 1, rules }).map(
			(point) => point.state,
		)
		expect(states.slice(0, 6)).toEqual([
			"spent",
			"future",
			"kept",
			"future",
			"kept",
			"future",
		])
	})
})

describe("nextSuggestion", () => {
	test("suggests the recommended ability for the first unspent level", () => {
		expect(nextSuggestion([], { level: 3, rules })).toEqual({
			level: 1,
			slot: "E",
		})
		expect(nextSuggestion(order("E"), { level: 3, rules })).toEqual({
			level: 2,
			slot: "Q",
		})
		// Riot's level 2 Q cannot reach rank 2: the max priority goes on (R cannot rank yet, so E).
		expect(nextSuggestion(order("Q"), { level: 3, rules })?.slot).toBe("E")
	})

	test("suggests nothing once every point is spent", () => {
		expect(nextSuggestion(order("QWE"), { level: 3, rules })).toBeUndefined()
	})
})

describe("spendPoint", () => {
	test("puts the point at the earliest unspent level that can take it, leaving gaps", () => {
		expect(spendPoint([], { slot: "Q", level: 9, rules })).toEqual(order("Q"))
		// Rank 2 needs level 3: level 2 stays unspent.
		expect(spendLevel(order("Q"), { slot: "Q", level: 9, rules })).toBe(3)
		expect(spendPoint(order("Q"), { slot: "Q", level: 9, rules })).toEqual(
			order("Q_Q"),
		)
		expect(spendPoint(order("Q_Q"), { slot: "W", level: 9, rules })).toEqual(
			order("QWQ"),
		)
	})

	test("an earlier point keeps the later ones valid", () => {
		expect(spendPoint(order("____Q"), { slot: "Q", level: 9, rules })).toEqual(
			order("Q___Q"),
		)
	})

	test("stops at the max rank", () => {
		let picks: SkillPicks = []
		for (let point = 0; point < 5; point++) {
			picks = spendPoint(picks, { slot: "Q", level: 9, rules }) ?? []
		}
		expect(picks).toEqual(order("Q_Q_Q_Q_Q"))
		expect(spendPoint(picks, { slot: "Q", level: 18, rules })).toBeUndefined()
	})

	test("R takes its points at 6, 11 and 16 only", () => {
		expect(spendPoint([], { slot: "R", level: 5, rules })).toBeUndefined()
		expect(spendPoint([], { slot: "R", level: 9, rules })).toEqual(
			order("_____R"),
		)
		expect(
			spendPoint(order("_____R"), { slot: "R", level: 10, rules }),
		).toBeUndefined()
	})

	test("refuses with no point left to spend", () => {
		expect(
			spendPoint(order("QWE"), { slot: "Q", level: 3, rules }),
		).toBeUndefined()
	})
})

describe("spendBlocker", () => {
	test("says why an ability cannot take one more point", () => {
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
		expect(
			spendBlocker(order("QWQEQRQWQ"), { slot: "Q", level: 10, rules }),
		).toEqual({ reason: "max-rank" })
		// Only level 1 is unspent, and Q there would push the level 2 Q to rank 2.
		expect(
			spendBlocker(order("_QWQE"), { slot: "Q", level: 5, rules }),
		).toEqual({ reason: "no-free-level", rankLevel: 5 })
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
	test("spends every unspent level with the recommended order", () => {
		expect(fillRecommended([], { level: 9, rules })).toEqual(
			order("EQWEERE" + "QE"),
		)
		// After Q, level 2 cannot take Q to rank 2: the max priority goes on with E.
		expect(fillRecommended(order("Q"), { level: 4, rules })).toEqual(
			order("QEWE"),
		)
	})

	test("fills the gaps too, within the rules", () => {
		expect(fillRecommended(order("Q_Q"), { level: 5, rules })).toEqual(
			order("QEQEE"),
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

	test("spends any unspent level directly", () => {
		expect(
			placePoint(order("Q"), { slot: "W", pointLevel: 5, level: 9, rules }),
		).toEqual(order("Q___W"))
		expect(
			placePoint(order("Q"), { slot: "W", pointLevel: 10, level: 9, rules }),
		).toBeUndefined()
	})

	test("refuses a point the rules forbid for the whole order", () => {
		expect(
			placePoint(order("QWEQ"), { slot: "Q", pointLevel: 2, level: 4, rules }),
		).toBeUndefined()
		expect(
			placePoint(order("QWE"), { slot: "R", pointLevel: 3, level: 3, rules }),
		).toBeUndefined()
		// Q at level 2 would push the level 3 Q to rank 3 at level 3.
		expect(
			placePoint(order("Q_Q"), { slot: "Q", pointLevel: 2, level: 9, rules }),
		).toBeUndefined()
	})

	describe("like browser history", () => {
		// Spent up to level 11, then the level went down to 9: W (10) and R (11) are kept.
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

		test("with gaps, any change at or below the level drops the kept points, spending a gap too", () => {
			// Q at 1 and 3, then W (10) and R (11) kept above level 9.
			const withGaps = order("Q_Q" + "______" + "WR")
			expect(spendPoint(withGaps, { slot: "W", level: 9, rules })).toEqual(
				order("QWQ"),
			)
			expect(
				placePoint(withGaps, { slot: "E", pointLevel: 5, level: 9, rules }),
			).toEqual(order("Q_Q_E"))
			expect(
				placePoint(withGaps, { slot: "Q", pointLevel: 3, level: 9, rules }),
			).toBe(withGaps)
		})
	})
})

describe("removePoint", () => {
	test("leaves the level unspent and never moves another point", () => {
		expect(
			removePoint(order("QWQEQ"), { pointLevel: 2, level: 5, rules }),
		).toEqual(order("Q_QEQ"))
		expect(
			removePoint(order("Q_Q_W"), { pointLevel: 3, level: 9, rules }),
		).toEqual(order("Q___W"))
	})

	test("drops the trailing unspent levels it leaves", () => {
		expect(
			removePoint(order("Q_W"), { pointLevel: 3, level: 3, rules }),
		).toEqual(order("Q"))
		expect(removePoint(order("Q"), { pointLevel: 1, level: 1, rules })).toEqual(
			[],
		)
	})

	test("the later points of the same ability lose a rank and stay valid", () => {
		const next = removePoint(order("Q_Q_Q"), { pointLevel: 1, level: 5, rules })
		expect(next).toEqual(order("__Q_Q"))
		expect(levelPoints(next ?? [], { level: 5, rules }).slice(2, 5)).toEqual([
			{ level: 3, state: "spent", slot: "Q", rank: 1 },
			{ level: 4, state: "free", suggestion: undefined },
			{ level: 5, state: "spent", slot: "Q", rank: 2 },
		])
	})

	test("refuses a level that is unspent, above the current level or out of range", () => {
		const picks = order("Q_Q")
		expect(
			removePoint(picks, { pointLevel: 2, level: 9, rules }),
		).toBeUndefined()
		expect(
			removePoint(picks, { pointLevel: 3, level: 2, rules }),
		).toBeUndefined()
		expect(
			removePoint(picks, { pointLevel: 0, level: 9, rules }),
		).toBeUndefined()
		expect(
			removePoint(picks, { pointLevel: 10, level: 9, rules }),
		).toBeUndefined()
	})

	test("lets the game's first point go too, leaving level 1 unspent", () => {
		const azir = overrideRules("azir-skill-rules")
		expect(
			removePoint(order("WQ"), { pointLevel: 1, level: 2, rules: azir }),
		).toEqual(order("_Q"))
	})

	test("is a change at or below the level: it drops the points kept above it", () => {
		// Q at 1 and 3, then W (10) and R (11) kept above level 9.
		const withGaps = order("Q_Q" + "______" + "WR")
		expect(removePoint(withGaps, { pointLevel: 3, level: 9, rules })).toEqual(
			order("Q"),
		)
	})

	describe("a later point that needs the removed one", () => {
		const shen = overrideRules("shen-skill-rules")

		test("refuses the removal and names the level that needs it", () => {
			// Shen's W needs a Q first: without the level 1 Q, the level 2 W breaks.
			const picks = order("QWQ")
			expect(
				removePoint(picks, { pointLevel: 1, level: 3, rules: shen }),
			).toBeUndefined()
			expect(
				removeBlocker(picks, { pointLevel: 1, level: 3, rules: shen }),
			).toEqual({ level: 2, slot: "W" })
		})

		test("allows it once another point still covers the later one", () => {
			// The level 1 Q still comes before the W.
			expect(
				removePoint(order("Q_QW"), { pointLevel: 3, level: 4, rules: shen }),
			).toEqual(order("Q__W"))
			// Zilean's W needs Q or E: the E still covers it.
			expect(
				removePoint(order("QEW"), {
					pointLevel: 1,
					level: 3,
					rules: overrideRules("zilean-skill-rules"),
				}),
			).toEqual(order("_EW"))
		})

		test("only spent points up to the level count: kept points never block", () => {
			// Level 2 holds the W, but the level is 1: the W is kept above it and dropped.
			expect(
				removeBlocker(order("QW"), { pointLevel: 1, level: 1, rules: shen }),
			).toBeUndefined()
			expect(
				removePoint(order("QW"), { pointLevel: 1, level: 1, rules: shen }),
			).toEqual([])
		})

		test("says nothing when the removal is allowed", () => {
			expect(
				removeBlocker(order("QWQ"), { pointLevel: 3, level: 3, rules: shen }),
			).toBeUndefined()
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

	test("keeps gaps: the link must match the remembered points up to the level", () => {
		const withGaps = order("Q_Q" + "______" + "WR")
		expect(withKeptPicks(withGaps, order("Q_Q"), 9)).toBe(withGaps)
		expect(withKeptPicks(withGaps, order("QWQ"), 9)).toEqual(order("QWQ"))
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
