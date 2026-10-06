// Elise: she starts with a rank in Spider Form (R), which ranks at 6, 11 and 16.
// Spider Elise is melee with 125 range and 355 movement speed; some of her spider abilities'
// numbers live in the human abilities' tooltips, and Human Form's own tooltip is stale.
import type { FormAbilityRule } from "../form-abilities"
import {
	defineForms,
	defineSkillRules,
} from "../overrides/define-champion-overrides"
import { R_FROM_LEVEL_1, STARTS_WITH_ONE_RANK, WIKI_DATA } from "./rule-helpers"

export const ELISE_FORMS = defineForms({
	id: "elise-forms",
	championKey: "Elise",
	since: "16.19",
	reason:
		"Spider Elise is melee with 125 range and 355 movement speed; the EliseSpider record matches the wiki's Spider Form",
	source:
		"https://raw.communitydragon.org/16.19/game/data/characters/elisespider/elisespider.bin.json",
	forms: [
		{ id: "human", name: "Human" },
		{
			id: "spider",
			name: "Spider",
			attackType: "melee",
			stats: {
				movementSpeed: { base: 355, perLevel: 0 },
				attackRange: { base: 125, perLevel: 0 },
			},
		},
	],
})

export const ELISE_FORM_ABILITIES = {
	championKey: "Elise",
	form: "spider",
	since: "16.19",
	reason:
		"Spider Elise has Venomous Bite, Skittering Frenzy, Rappel and Human Form; Venomous Bite and Rappel keep their numbers in the human ability's tooltip, and Human Form's own tooltip is stale (12-42 bite damage, the wiki's Spider Queen has 14-44)",
	source: `${WIKI_DATA}Elise/Spider_Form_/_Human_Form`,
	spells: {
		Q: {
			spell: "EliseSpiderQ",
			lines: ["Venomous Bite Damage"],
			splitDescription: true,
		},
		W: { spell: "EliseSpiderW", splitDescription: true },
		E: {
			spell: "EliseSpiderE",
			lines: ["Cooldown (Rappel)", "Damage and Healing Increase"],
			splitDescription: true,
		},
		R: {
			spell: "EliseRSpider",
			lines: [
				"Spider Form Bite Damage",
				"Spiderling Bonus Damage",
				"Maximum Number of Spiderlings",
				"Spiderling Armor",
				"Spiderling Magic Resist",
			],
		},
	},
} satisfies FormAbilityRule

export const ELISE_SKILL_RULES = defineSkillRules({
	id: "elise-skill-rules",
	championKey: "Elise",
	since: "16.19",
	reason:
		"Elise begins with one rank in Spider Form and can increase it at levels 6, 11 and 16",
	source: `${WIKI_DATA}Elise/Spider_Form_/_Human_Form`,
	skillRules: {
		innateRanks: STARTS_WITH_ONE_RANK,
		rankLevels: R_FROM_LEVEL_1,
	},
})
