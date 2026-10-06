// Shen: Spirit's Refuge (W) needs Twilight Assault (Q) first.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const SHEN_SKILL_RULES = defineSkillRules({
	id: "shen-skill-rules",
	championKey: "Shen",
	since: "16.19",
	reason: "Spirit's Refuge needs Twilight Assault to be learned first",
	source: `${WIKI}Champion_ability`,
	skillRules: { requires: { W: ["Q"] } },
})
