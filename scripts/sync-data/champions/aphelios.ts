// Aphelios: he can't rank abilities; his points raise attack damage, attack speed or lethality.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

const PASSIVE = `${WIKI_DATA}Aphelios/The_Hitman_and_the_Seer`
const STAT_POINT_RANK_LEVELS = [1, 2, 3, 5, 7, 9]

export const APHELIOS_SKILL_RULES = defineSkillRules({
	id: "aphelios-skill-rules",
	championKey: "Aphelios",
	since: "16.19",
	reason:
		"Aphelios cannot rank abilities: Q, W and E take his points for attack damage, attack speed and lethality (a stat reaches rank 6 at level 9 at the earliest, points at 1, 2, 3, 5, 7 and 9), R takes none; he has Phase from level 1, his weapon abilities from level 2, and Moonlight Vigil at 6, 11 and 16",
	source: PASSIVE,
	skillRules: {
		rankLevels: {
			Q: STAT_POINT_RANK_LEVELS,
			W: STAT_POINT_RANK_LEVELS,
			E: STAT_POINT_RANK_LEVELS,
		},
		statPoints: {
			abilityRankLevels: { Q: [2], W: [1], R: [6, 11, 16] },
		},
	},
})

/** The stats his points buy: the passive gives one value per point (`APPerRank` is the lethality). */
export const APHELIOS_STAT_POINTS = [
	{
		championKey: "Aphelios",
		slot: "Q",
		stat: "attackDamage",
		dataValue: "ADPerRank",
		passivePerRank: true,
		reason: "Each point in Q grants bonus attack damage",
		source: PASSIVE,
	},
	{
		championKey: "Aphelios",
		slot: "W",
		stat: "attackSpeedPercent",
		dataValue: "ASPerRank",
		passivePerRank: true,
		reason: "Each point in W grants bonus attack speed",
		source: PASSIVE,
	},
	{
		championKey: "Aphelios",
		slot: "E",
		stat: "lethality",
		dataValue: "APPerRank",
		passivePerRank: true,
		reason:
			"Each point in E grants lethality (the game file names it APPerRank)",
		source: PASSIVE,
	},
] as const satisfies readonly RankStatRule[]
