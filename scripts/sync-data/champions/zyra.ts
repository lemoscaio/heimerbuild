// Zyra: Rampant Growth (W) needs Deadly Spines (Q) or Grasping Roots (E) first.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const ZYRA_SKILL_RULES = defineSkillRules({
	id: "zyra-skill-rules",
	championKey: "Zyra",
	since: "16.19",
	reason:
		"Rampant Growth needs Deadly Spines or Grasping Roots to be learned first",
	source: `${WIKI}Champion_ability`,
	skillRules: { requires: { W: ["Q", "E"] } },
})
