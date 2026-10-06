// Lux: Final Spark (R) takes 1 s; the game files give 1.375 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const LUX_CAST_TIMES = defineCastTimes({
	id: "lux-cast-times",
	championKey: "Lux",
	since: "16.19",
	reason: "Final Spark takes 1 s; the game files give 1.375 s",
	source: `${WIKI_DATA}Lux/Final_Spark`,
	castTimes: { R: 1 },
})
