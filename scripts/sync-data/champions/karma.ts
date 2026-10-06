// Karma: she starts with a rank in Mantra (R), which ranks at 6, 11 and 16.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { R_FROM_LEVEL_1, STARTS_WITH_ONE_RANK, WIKI_DATA } from "./rule-helpers"

export const KARMA_SKILL_RULES = defineSkillRules({
	id: "karma-skill-rules",
	championKey: "Karma",
	since: "16.19",
	reason:
		"Karma begins with one rank in Mantra and can increase it at levels 6, 11 and 16",
	source: `${WIKI_DATA}Karma/Mantra`,
	skillRules: {
		innateRanks: STARTS_WITH_ONE_RANK,
		rankLevels: R_FROM_LEVEL_1,
	},
})
