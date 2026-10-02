import { describe, expect, test } from "bun:test"
import {
	type ChampionAbilities,
	skillRulesFitAbilities,
	skillRulesSchema,
} from "../schemas/champion"
import { CHAMPION_SKILL_RULES } from "./champion-skill-rules"

function abilitiesWithMaxRanks(maxRanks: [number, number, number, number]) {
	const slots = ["Q", "W", "E", "R"] as const
	return {
		spells: slots.map((slot, index) => ({ slot, maxRank: maxRanks[index] })),
	} as unknown as ChampionAbilities
}

describe("CHAMPION_SKILL_RULES", () => {
	test.each(
		CHAMPION_SKILL_RULES.map((override) => [override.id, override] as const),
	)("%s matches the schema", (_, override) => {
		expect(skillRulesSchema.safeParse(override.apply(undefined)).success).toBe(
			true,
		)
	})

	test("Elise's 4 R ranks need her rule: the default R has 3 levels", () => {
		const abilities = abilitiesWithMaxRanks([5, 5, 5, 4])
		const elise = CHAMPION_SKILL_RULES.find(
			({ id }) => id === "elise-skill-rules",
		)

		expect(skillRulesFitAbilities({ abilities })).toBe(false)
		expect(
			skillRulesFitAbilities({
				abilities,
				skillRules: elise?.apply(undefined),
			}),
		).toBe(true)
	})

	test("innate ranks cannot exceed the max rank", () => {
		expect(
			skillRulesFitAbilities({
				abilities: abilitiesWithMaxRanks([6, 6, 6, 1]),
				skillRules: { innateRanks: { R: 2 } },
			}),
		).toBe(false)
	})
})
