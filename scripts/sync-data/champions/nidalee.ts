// Nidalee: she starts with a rank in Aspect of the Cougar (R), which ranks at 6, 11 and 16.
// Cougar Nidalee is melee with 125 range; Takedown, Pounce and Swipe scale with R's rank.
import type { FormAbilityRule } from "../form-abilities"
import {
	defineForms,
	defineSkillRules,
} from "../overrides/define-champion-overrides"
import { R_FROM_LEVEL_1, STARTS_WITH_ONE_RANK, WIKI_DATA } from "./rule-helpers"

export const NIDALEE_FORMS = defineForms({
	id: "nidalee-forms",
	championKey: "Nidalee",
	since: "16.19",
	reason:
		"Cougar Nidalee is melee with 125 range; the NidaleeCougar record matches the wiki's Aspect of the Cougar",
	source:
		"https://raw.communitydragon.org/16.19/game/data/characters/nidaleecougar/nidaleecougar.bin.json",
	forms: [
		{ id: "human", name: "Human" },
		{
			id: "cougar",
			name: "Cougar",
			attackType: "melee",
			stats: { attackRange: { base: 125, perLevel: 0 } },
		},
	],
})

export const NIDALEE_FORM_ABILITIES = {
	championKey: "Nidalee",
	form: "cougar",
	since: "16.19",
	reason:
		"Cougar Nidalee has Takedown, Pounce and Swipe; they scale with Aspect of the Cougar's rank, so their numbers are R's rank-up lines. Her R keeps the ability with the human-face icon (AspectOfTheCougar's second icon)",
	source: `${WIKI_DATA}Nidalee/Aspect_of_the_Cougar`,
	spells: {
		Q: { spell: "Takedown" },
		W: { spell: "Pounce" },
		E: { spell: "Swipe" },
		R: { spell: "AspectOfTheCougar", icon: 1 },
	},
} satisfies FormAbilityRule

export const NIDALEE_SKILL_RULES = defineSkillRules({
	id: "nidalee-skill-rules",
	championKey: "Nidalee",
	since: "16.19",
	reason:
		"Nidalee begins with one rank in Aspect of the Cougar and can increase it at levels 6, 11 and 16",
	source: `${WIKI_DATA}Nidalee/Aspect_of_the_Cougar`,
	skillRules: {
		innateRanks: STARTS_WITH_ONE_RANK,
		rankLevels: R_FROM_LEVEL_1,
	},
})
