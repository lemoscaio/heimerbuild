// Zilean: Rewind (W) needs Time Bomb (Q) or Time Warp (E) first.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const ZILEAN_SKILL_RULES = defineSkillRules({
	id: "zilean-skill-rules",
	championKey: "Zilean",
	since: "16.19",
	reason: "Rewind needs Time Bomb or Time Warp to be learned first",
	source: `${WIKI}Champion_ability`,
	skillRules: { requires: { W: ["Q", "E"] } },
})
