// Bel'Veth: she has no resource; Riot's 45 mana is a placeholder.
// True Form needs a point in R; its bonuses are an app effect (src/lib/champions/belveth.ts).
import {
	defineChampionOverride,
	defineForms,
} from "../overrides/define-champion-overrides"
import { WIKI, WIKI_DATA } from "./rule-helpers"

export const BELVETH_NO_MANA = defineChampionOverride({
	id: "belveth-no-mana",
	championKey: "Belveth",
	field: "stats",
	since: "16.19",
	reason:
		"Bel'Veth has no resource (NONE); her 45 mana is a placeholder in Riot's data",
	source: `${WIKI}Bel%27Veth`,
	apply: (stats) => ({ ...stats, mana: { base: 0, perLevel: 0 } }),
})

export const BELVETH_FORMS = defineForms({
	id: "belveth-forms",
	championKey: "Belveth",
	since: "16.19",
	reason:
		"True Form comes with Endless Banquet (R); its bonus health, range and attack speed are the belveth-r-true-form effect",
	source: `${WIKI_DATA}Bel%27Veth/Endless_Banquet`,
	forms: [
		{ id: "base", name: "Base" },
		{
			id: "true-form",
			name: "True Form",
			requires: { slot: "R", minRank: 1 },
		},
	],
})
