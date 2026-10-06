// Tristana: Draw a Bead grows her attack range by level, 550 at level 1 to 700 at 18.
import { defineLevelStates } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const TRISTANA_LEVEL_STATES = defineLevelStates({
	id: "tristana-level-states",
	championKey: "Tristana",
	since: "16.19",
	reason:
		"Draw a Bead adds 0 to 150 bonus attack range, linear by level: 550 at level 1, 700 at 18",
	source: `${WIKI_DATA}Tristana/Draw_a_Bead`,
	levelStates: [
		{
			fromLevel: 1,
			attackRange: { base: 550, perLevel: 150 / 17, growth: "linear" },
		},
	],
})
