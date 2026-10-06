// Xayah: Bladecaller (E) needs Double Daggers (Q) or Deadly Plumage (W) first.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const XAYAH_SKILL_RULES = defineSkillRules({
	id: "xayah-skill-rules",
	championKey: "Xayah",
	since: "16.19",
	reason:
		"Bladecaller needs Double Daggers or Deadly Plumage to be learned first",
	source: `${WIKI}Champion_ability`,
	skillRules: { requires: { E: ["Q", "W"] } },
})
