// Jayce: he starts with Transform (R) and can't rank it; his points go to Q, W and E.
// Cannon Jayce is ranged with 500 range and swaps in all four abilities; Hammer's resistances
// are an app effect (src/lib/champions/jayce.ts). His passive's icon follows the stance.
import type { FormAbilityRule } from "../form-abilities"
import {
	defineForms,
	defineSkillRules,
} from "../overrides/define-champion-overrides"
import { STARTS_WITH_ONE_RANK, WIKI, WIKI_DATA } from "./rule-helpers"

export const JAYCE_FORMS = defineForms({
	id: "jayce-forms",
	championKey: "Jayce",
	since: "16.19",
	reason:
		"Cannon Jayce is ranged with 500 range; Hammer's bonus armor and magic resist come from the champion level and bonus AD (the jayce-hammer-stance effect)",
	source: `${WIKI_DATA}Jayce/Transform_Mercury_Cannon`,
	forms: [
		{ id: "hammer", name: "Hammer" },
		{
			id: "cannon",
			name: "Cannon",
			attackType: "ranged",
			stats: { attackRange: { base: 500, perLevel: 0 } },
		},
	],
})

export const JAYCE_FORM_ABILITIES = {
	championKey: "Jayce",
	form: "cannon",
	since: "16.19",
	reason:
		"Mercury Cannon swaps in Shock Blast, Hyper Charge, Acceleration Gate and Transform Mercury Hammer; a slot's rank raises both stances' ability. Hextech Capacitor shows the hammer or the cannon (JaycePassive icons; Data Dragon's is an older one)",
	source: `${WIKI}Jayce`,
	passive: { spell: "JaycePassive", icon: 1, default: { icon: 0 } },
	spells: {
		Q: { spell: "JayceShockBlast", splitDescription: true },
		W: { spell: "JayceHyperCharge", splitDescription: true },
		E: { spell: "JayceAccelerationGate", splitDescription: true },
		R: { spell: "JayceStanceGtH", splitDescription: true },
	},
} satisfies FormAbilityRule

export const JAYCE_SKILL_RULES = defineSkillRules({
	id: "jayce-skill-rules",
	championKey: "Jayce",
	since: "16.19",
	reason:
		"Jayce begins with Transform and cannot rank it; his points go to Q, W and E (6 ranks each)",
	source: `${WIKI_DATA}Jayce/Transform_Mercury_Hammer`,
	skillRules: { innateRanks: STARTS_WITH_ONE_RANK },
})
