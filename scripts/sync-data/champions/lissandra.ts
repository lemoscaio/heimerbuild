// Lissandra: Ring of Frost (W) is instant and Frozen Tomb (R) on an enemy takes 0.375 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const LISSANDRA_CAST_TIMES = defineCastTimes({
	id: "lissandra-cast-times",
	championKey: "Lissandra",
	since: "16.19",
	reason:
		"Ring of Frost has no cast time and Frozen Tomb on an enemy takes 0.375 s; the game files give 0.25 s for both",
	source: `${WIKI_DATA}Lissandra/Frozen_Tomb`,
	castTimes: { W: 0, R: 0.375 },
})
