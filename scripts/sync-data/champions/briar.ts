// Briar: her bar is Frenzy, not the FURY Riot's data names.
import { defineChampionOverride } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const BRIAR_FRENZY_RESOURCE = defineChampionOverride({
	id: "briar-frenzy-resource",
	championKey: "Briar",
	field: "resource",
	since: "16.19",
	reason:
		"Riot's data names Briar's resource FURY; her bar is Frenzy, the remaining duration of her frenzy",
	source: `${WIKI}Briar`,
	apply: () => "FRENZY",
})
