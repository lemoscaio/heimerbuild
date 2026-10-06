// Zeri: her first skill point always goes to Burst Fire (Q).
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const ZERI_SKILL_RULES = defineSkillRules({
	id: "zeri-skill-rules",
	championKey: "Zeri",
	since: "16.19",
	reason:
		"Burst Fire is learned at the start of the game with the first skill point",
	source: `${WIKI}Champion_ability`,
	skillRules: { firstPoint: "Q" },
})
