// Yuumi: she starts with a rank in You and Me! (W); Prowling Projectile has 6 ranks instead.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const YUUMI_SKILL_RULES = defineSkillRules({
	id: "yuumi-skill-rules",
	championKey: "Yuumi",
	since: "16.19",
	reason:
		"Yuumi starts with a rank in You and Me!, and Prowling Projectile has 6 ranks instead",
	source: `${WIKI_DATA}Yuumi/You_and_Me!`,
	skillRules: { innateRanks: { W: 1 } },
})
