import {
	ABILITY_SLOTS,
	type AbilitySlot,
	type Champion,
	rankLevelsOf,
} from "@schemas/champion"

export type AbilityRule = {
	/** The most points it takes: 0 when it takes none (Aphelios's R). */
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
	/**
	 * When the points raise stats instead (Aphelios): the level each ability ranks up at by itself,
	 * rank 1 first; an ability left out never ranks.
	 */
	abilityRankLevels?: Partial<Record<AbilitySlot, readonly number[]>>
	/** The recommended order, only ever a suggestion: the first points, then which ability to max. */
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
	const statPoints = skillRules?.statPoints
	const rules = Object.fromEntries(
		abilities.spells.map(({ slot, maxRank }) => [
			slot,
			{
				maxRank: statPoints && slot === "R" ? 0 : maxRank,
				innateRanks: skillRules?.innateRanks?.[slot] ?? 0,
				rankLevels: rankLevelsOf(skillRules, slot),
				...(skillRules?.requires?.[slot]
					? { requires: skillRules.requires[slot] }
					: {}),
			},
		]),
	) as Record<AbilitySlot, AbilityRule>
	const priority = abilities.recommendedOrder?.priority ?? DEFAULT_PRIORITY
	return {
		abilities: rules,
		...(skillRules?.firstPoint ? { firstPoint: skillRules.firstPoint } : {}),
		...(statPoints && { abilityRankLevels: statPoints.abilityRankLevels }),
		recommended: {
			firstPoints: abilities.recommendedOrder?.firstPoints ?? [],
			priority: priority.filter((slot) => rules[slot].maxRank > 0),
		},
	}
}

/** The abilities that take points, in slot order: all four, or Q, W and E for Aphelios. */
export function pointSlots(rules: SkillRules): AbilitySlot[] {
	return ABILITY_SLOTS.filter((slot) => rules.abilities[slot].maxRank > 0)
}
