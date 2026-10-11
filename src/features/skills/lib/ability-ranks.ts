import { ABILITY_SLOTS } from "@schemas/champion"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import type { SkillRules } from "./skill-rules"

/**
 * The abilities' ranks at `level`: the points' ranks, or for a champion whose points raise stats
 * (Aphelios) the ranks the level gives by itself.
 */
export function abilityRanksAt(
	rules: SkillRules,
	{ level, pointRanks }: { level: number; pointRanks: AbilityRanks },
): AbilityRanks {
	const { abilityRankLevels } = rules
	if (!abilityRankLevels) return pointRanks
	return Object.fromEntries(
		ABILITY_SLOTS.map((slot) => [
			slot,
			(abilityRankLevels[slot] ?? []).filter((rankLevel) => rankLevel <= level)
				.length,
		]),
	) as Record<keyof AbilityRanks, number>
}
