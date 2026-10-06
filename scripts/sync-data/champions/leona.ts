// Leona: Shield of Daybreak (Q) and Eclipse (W) are instant; the game files give 0.25 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const LEONA_CAST_TIMES = defineCastTimes({
	id: "leona-cast-times",
	championKey: "Leona",
	since: "16.19",
	reason:
		"Shield of Daybreak and Eclipse have no cast time; the game files give 0.25 s",
	source: `${WIKI_DATA}Leona/Eclipse`,
	castTimes: { Q: 0, W: 0 },
})
