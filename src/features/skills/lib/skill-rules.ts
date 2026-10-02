import {
	type AbilitySlot,
	type Champion,
	rankLevelsOf,
} from "@schemas/champion"

export type AbilityRule = {
	maxRank: number
	/** Ranks the champion starts with, without a point. */
	innateRanks: number
	/** The champion level each rank needs, rank 1 first (innate ranks included). */
	rankLevels: readonly number[]
	/** Abilities one of which needs a point first. */
	requires?: readonly AbilitySlot[]
}

export type SkillRules = {
	abilities: Readonly<Record<AbilitySlot, AbilityRule>>
	/** The level 1 point the game spends by itself (Azir's W). */
	firstPoint?: AbilitySlot
	/** False when the points raise stats instead (Aphelios): no skill order at all. */
	hasSkillOrder: boolean
	/** The game's suggestion for the automatic points: the first points, then which ability to max. */
	recommended: {
		firstPoints: readonly AbilitySlot[]
		priority: readonly AbilitySlot[]
	}
}

/** R first whenever it can rank, then Q, W and E in order: when Riot gives no priority. */
const DEFAULT_PRIORITY = ["R", "Q", "W", "E"] as const

/** The champion's skill point rules: the game's defaults plus its synced exceptions. */
export function skillRulesOf(
	champion: Pick<Champion, "abilities" | "skillRules">,
): SkillRules {
	const { abilities, skillRules } = champion
	const rules = Object.fromEntries(
		abilities.spells.map(({ slot, maxRank }) => [
			slot,
			{
				maxRank,
				innateRanks: skillRules?.innateRanks?.[slot] ?? 0,
				rankLevels: rankLevelsOf(skillRules, slot),
				...(skillRules?.requires?.[slot]
					? { requires: skillRules.requires[slot] }
					: {}),
			},
		]),
	) as Record<AbilitySlot, AbilityRule>
	return {
		abilities: rules,
		...(skillRules?.firstPoint ? { firstPoint: skillRules.firstPoint } : {}),
		hasSkillOrder: !skillRules?.statPoints,
		recommended: {
			firstPoints: abilities.recommendedOrder?.firstPoints ?? [],
			priority: abilities.recommendedOrder?.priority ?? DEFAULT_PRIORITY,
		},
	}
}
