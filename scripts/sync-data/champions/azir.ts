// Azir: his first skill point always goes to Arise! (W).
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const AZIR_SKILL_RULES = defineSkillRules({
	id: "azir-skill-rules",
	championKey: "Azir",
	since: "16.19",
	reason:
		"Arise! is learned at the start of the game with the first skill point",
	source: `${WIKI}Champion_ability`,
	skillRules: { firstPoint: "W" },
})
