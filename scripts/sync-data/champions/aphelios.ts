// Aphelios: he can't rank abilities; his points raise attack damage, attack speed or lethality.
import { defineSkillRules } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const APHELIOS_SKILL_RULES = defineSkillRules({
	id: "aphelios-skill-rules",
	championKey: "Aphelios",
	since: "16.19",
	reason:
		"Aphelios cannot rank abilities: his points raise attack damage, attack speed or lethality, and his abilities rank up by themselves",
	source: `${WIKI_DATA}Aphelios/The_Hitman_and_the_Seer`,
	skillRules: { statPoints: true },
})
