// Kayle: she turns ranged at level 6 (525 range), and reaches 625 range at level 16.
import { defineLevelStates } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const KAYLE_LEVEL_STATES = defineLevelStates({
	id: "kayle-level-states",
	championKey: "Kayle",
	since: "16.19",
	reason:
		"Divine Ascent makes Kayle ranged with 525 attack range at level 6, and 625 at level 16",
	source: `${WIKI_DATA}Kayle/Divine_Ascent`,
	levelStates: [
		{
			fromLevel: 6,
			attackType: "ranged",
			attackRange: { base: 525, perLevel: 0 },
		},
		{ fromLevel: 16, attackRange: { base: 625, perLevel: 0 } },
	],
})
