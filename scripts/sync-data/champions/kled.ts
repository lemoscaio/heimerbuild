// Kled: Riot's health is dismounted Kled alone; he starts mounted, with Skaarl's health added.
// Dismounted, Bear Trap on a Rope becomes Pocket Pistol and he can't cast W, E or R (shown grey).
import type { FormAbilityRule, FormUnavailable } from "../form-abilities"
import {
	defineChampionOverride,
	defineForms,
} from "../overrides/define-champion-overrides"
import { WIKI, WIKI_DATA } from "./rule-helpers"

export const KLED_MOUNTED_HEALTH = defineChampionOverride({
	id: "kled-mounted-health",
	championKey: "Kled",
	field: "stats",
	since: "16.19",
	reason:
		"Riot's health is dismounted Kled alone (410); he starts mounted, his default form, and the wiki gives Kled and Skaarl 810 health growing to 3238",
	source: `${WIKI}Module:ChampionData/data`,
	apply: (stats) => ({
		...stats,
		health: { base: 810, perLevel: 84 + 1000 / 17 },
	}),
})

export const KLED_FORMS = defineForms({
	id: "kled-forms",
	championKey: "Kled",
	since: "16.19",
	reason:
		"Dismounted Kled has 410 health growing by 84, 305 movement speed and 250 range (the wiki's Kled entry); the KledRider record disagrees with the wiki, so it is not used",
	source: `${WIKI}Module:ChampionData/data`,
	forms: [
		{ id: "mounted", name: "Mounted" },
		{
			id: "dismounted",
			name: "Dismounted",
			stats: {
				health: { base: 410, perLevel: 84 },
				movementSpeed: { base: 305, perLevel: 0 },
				attackRange: { base: 250, perLevel: 0 },
			},
		},
	],
})

/** Wiki, Kled: "Bear Trap on a Rope is replaced with Pocket Pistol, and Kled cannot cast his other abilities." */
const KLED_DISMOUNTED: FormUnavailable = {
	reason: "Kled can't cast this while dismounted",
	source: `${WIKI}Kled`,
}

export const KLED_FORM_ABILITIES = {
	championKey: "Kled",
	form: "dismounted",
	since: "16.19",
	reason:
		"Dismounted Kled's Bear Trap on a Rope becomes Pocket Pistol, ranked by Q. He cannot cast his other abilities: Jousting and Chaaaaaaaarge!!! show grey (their second icons; Violent Tendencies has none), and Skaarl the Cowardly Lizard shows Skaarl fleeing",
	source: `${WIKI_DATA}Kled/Skaarl_the_Cowardly_Lizard`,
	passive: { spell: "KledPassive", icon: 1 },
	spells: {
		Q: { spell: "KledRiderQ", splitDescription: true },
		W: { spell: "KledW", unavailable: KLED_DISMOUNTED },
		E: { spell: "KledE", icon: 1, unavailable: KLED_DISMOUNTED },
		R: { spell: "KledR", icon: 1, unavailable: KLED_DISMOUNTED },
	},
} satisfies FormAbilityRule
