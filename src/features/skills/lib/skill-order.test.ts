import { describe, expect, test } from "bun:test"
import type { AbilitySlot } from "@schemas/champion"
import { CHAMPION_SKILL_RULES } from "../../../../scripts/sync-data/overrides/champion-skill-rules"
import { skillChampion, TEEMO_ORDER } from "./skill-champions.fixtures"
import {
	canRankUp,
	isValidOrder,
	parseOrder,
	ranksOf,
	serializeOrder,
	suggestedPoint,
	validPrefix,
	withRecommended,
} from "./skill-order"
import { skillRulesOf } from "./skill-rules"

const standard = skillRulesOf(skillChampion())

/** "Q_Q": Q at levels 1 and 3, level 2 unspent. */
function order(letters: string) {
	return [...letters].map((letter) =>
		letter === "_" ? null : (letter as AbilitySlot),
	)
}

function overrideRules(id: string) {
	const override = CHAMPION_SKILL_RULES.find((rule) => rule.id === id)
	if (!override) throw new Error(`no override ${id}`)
	return override.apply(undefined)
}

describe("skill point rules", () => {
	test("a basic ability's rank n needs level 2n - 1", () => {
		expect(isValidOrder(order("QWQ"), standard)).toBe(true)
		expect(isValidOrder(order("QQ"), standard)).toBe(false)
		expect(validPrefix(order("QWEQQQ"), standard)).toEqual(order("QWEQQ"))
	})

	test("R needs level 6, then 11 and 16", () => {
		expect(isValidOrder(order("QWEQQR"), standard)).toBe(true)
		expect(isValidOrder(order("QWEQR"), standard)).toBe(false)
		expect(isValidOrder(order("QWEQQRQWER"), standard)).toBe(false)
		expect(isValidOrder(order("QWEQQRQWEWR"), standard)).toBe(true)
	})

	test("each point is checked at its own level, gaps included", () => {
		expect(isValidOrder(order("Q_Q"), standard)).toBe(true)
		expect(isValidOrder(order("_____R"), standard)).toBe(true)
		expect(isValidOrder(order("____R"), standard)).toBe(false)
		expect(validPrefix(order("Q_Q_QQ"), standard)).toEqual(order("Q_Q_Q"))
	})

	test("a basic ability stops at rank 5", () => {
		const maxedQ = order("QWQEQRQWQ")
		expect(isValidOrder(maxedQ, standard)).toBe(true)
		expect(
			canRankUp(standard, ranksOf(maxedQ, standard), { slot: "Q", level: 10 }),
		).toBe(false)
	})

	test("Elise starts with one R rank and ranks it at 6, 11 and 16", () => {
		const rules = skillRulesOf(
			skillChampion({
				maxRanks: [5, 5, 5, 4],
				skillRules: overrideRules("elise-skill-rules"),
			}),
		)
		expect(ranksOf([], rules).R).toBe(1)
		expect(isValidOrder(order("R"), rules)).toBe(false)
		expect(isValidOrder(order("QWEQQR"), rules)).toBe(true)
		expect(ranksOf(order("QWEQQR"), rules).R).toBe(2)
	})

	test("Jayce never ranks R and puts 6 ranks in each basic ability", () => {
		const rules = skillRulesOf(
			skillChampion({
				maxRanks: [6, 6, 6, 1],
				skillRules: overrideRules("jayce-skill-rules"),
			}),
		)
		const full = withRecommended([], { level: 18, rules })
		expect(full).toHaveLength(18)
		expect(ranksOf(full, rules)).toEqual({ Q: 6, W: 6, E: 6, R: 1 })
	})

	test("Udyr ranks R like a basic ability", () => {
		const rules = skillRulesOf(
			skillChampion({
				maxRanks: [6, 6, 6, 6],
				skillRules: overrideRules("udyr-skill-rules"),
			}),
		)
		expect(isValidOrder(order("RQR"), rules)).toBe(true)
	})

	test("Azir's first point always goes to W", () => {
		const rules = skillRulesOf(
			skillChampion({ skillRules: overrideRules("azir-skill-rules") }),
		)
		expect(isValidOrder(order("Q"), rules)).toBe(false)
		expect(withRecommended([], { level: 1, rules })).toEqual(order("W"))
	})

	test("Shen's W needs a point in Q first", () => {
		const rules = skillRulesOf(
			skillChampion({ skillRules: overrideRules("shen-skill-rules") }),
		)
		expect(isValidOrder(order("W"), rules)).toBe(false)
		expect(isValidOrder(order("EW"), rules)).toBe(false)
		expect(isValidOrder(order("QW"), rules)).toBe(true)
	})

	test("Aphelios has no skill order", () => {
		const rules = skillRulesOf(
			skillChampion({ skillRules: overrideRules("aphelios-skill-rules") }),
		)
		expect(rules.hasSkillOrder).toBe(false)
		expect(withRecommended([], { level: 9, rules })).toEqual([])
	})

	test.each(
		CHAMPION_SKILL_RULES.map((override) => [override.id, override] as const),
	)("%s: the suggested order fills every level within the rules", (id) => {
		const maxRanks: Record<string, [number, number, number, number]> = {
			"udyr-skill-rules": [6, 6, 6, 6],
			"jayce-skill-rules": [6, 6, 6, 1],
			"elise-skill-rules": [5, 5, 5, 4],
			"nidalee-skill-rules": [5, 5, 5, 4],
			"karma-skill-rules": [5, 5, 5, 4],
			"yuumi-skill-rules": [6, 5, 5, 3],
		}
		const rules = skillRulesOf(
			skillChampion({
				maxRanks: maxRanks[id] ?? [5, 5, 5, 3],
				skillRules: overrideRules(id),
				recommendedOrder: TEEMO_ORDER,
			}),
		)
		if (!rules.hasSkillOrder) return
		const full = withRecommended([], { level: 18, rules })
		expect(full).toHaveLength(18)
		expect(isValidOrder(full, rules)).toBe(true)
	})
})

describe("withRecommended", () => {
	test("follows Riot's first points, then its max priority", () => {
		const rules = skillRulesOf(skillChampion({ recommendedOrder: TEEMO_ORDER }))
		// Level 8 cannot rank E to 5, so Q takes it.
		expect(withRecommended([], { level: 9, rules })).toEqual(
			order("EQWEERE" + "QE"),
		)
	})

	test("without a recommendation, takes R when it can, then maxes Q, W, E", () => {
		expect(withRecommended([], { level: 11, rules: standard })).toEqual(
			order("QWQWQRQWQWR"),
		)
	})

	test("continues after the picks", () => {
		const rules = skillRulesOf(skillChampion({ recommendedOrder: TEEMO_ORDER }))
		expect(withRecommended(order("QWQ"), { level: 6, rules })).toEqual(
			order("QWQEER"),
		)
	})
})

describe("suggestedPoint", () => {
	test("without a recommendation, suggests R as soon as it can rank, else Q, W, E", () => {
		expect(suggestedPoint([], { level: 1, rules: standard })).toBe("Q")
		expect(suggestedPoint(order("QWQWQ"), { level: 6, rules: standard })).toBe(
			"R",
		)
	})
})

describe("parseOrder and serializeOrder", () => {
	test("reads a link's order up to its first invalid point", () => {
		expect(parseOrder("QWEQ", standard)).toEqual(order("QWEQ"))
		expect(parseOrder("QQWE", standard)).toEqual(order("Q"))
		expect(parseOrder("QWXE", standard)).toEqual(order("QW"))
		expect(parseOrder(undefined, standard)).toEqual([])
	})

	test("reads unspent levels as gaps and drops trailing ones", () => {
		expect(parseOrder("Q_Q", standard)).toEqual(order("Q_Q"))
		expect(parseOrder("Q__", standard)).toEqual(order("Q"))
		expect(parseOrder("_", standard)).toEqual([])
	})

	test("writes unspent levels as _, never trailing, and nothing for an empty order", () => {
		expect(serializeOrder(order("EQW"))).toBe("EQW")
		expect(serializeOrder(order("Q_Q__"))).toBe("Q_Q")
		expect(serializeOrder(order("__"))).toBeUndefined()
		expect(serializeOrder([])).toBeUndefined()
	})
})
