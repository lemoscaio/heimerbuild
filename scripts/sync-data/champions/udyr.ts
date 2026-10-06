// Udyr: he has no ultimate; Wingborne Storm (R) ranks like a basic ability, at odd levels up to 11.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const UDYR_SKILL_RULES = defineSkillRules({
	id: "udyr-skill-rules",
	championKey: "Udyr",
	since: "16.19",
	reason:
		"Udyr has no ultimate: Wingborne Storm ranks like a basic ability, one rank every odd level up to 6",
	source: `${WIKI}Udyr`,
	skillRules: { rankLevels: { R: [1, 3, 5, 7, 9, 11] } },
})
