// Shyvana: Dragon Form needs a point in R; its bonuses are an app effect (src/lib/champions/shyvana.ts).
import { defineForms } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const SHYVANA_FORMS = defineForms({
	id: "shyvana-forms",
	championKey: "Shyvana",
	since: "16.19",
	reason:
		"Dragon Form comes with Dragon's Descent (R); its bonus health and range are the shyvana-r-dragon-form effect",
	source: `${WIKI_DATA}Shyvana/Dragon%27s_Descent`,
	forms: [
		{ id: "human", name: "Human" },
		{ id: "dragon", name: "Dragon", requires: { slot: "R", minRank: 1 } },
	],
})
