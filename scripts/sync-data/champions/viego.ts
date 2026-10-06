// Viego: he has no resource; Riot's 10000 mana is a placeholder.
import { defineChampionOverride } from "../overrides/define-champion-overrides"
import { WIKI } from "./rule-helpers"

export const VIEGO_NO_MANA = defineChampionOverride({
	id: "viego-no-mana",
	championKey: "Viego",
	field: "stats",
	since: "16.19",
	reason:
		"Viego has no resource (NONE); his 10000 mana is a placeholder in Riot's data",
	source: `${WIKI}Viego`,
	apply: (stats) => ({ ...stats, mana: { base: 0, perLevel: 0 } }),
})
