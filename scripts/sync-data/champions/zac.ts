// Zac: Unstable Matter (W) is instant; the game files give 0.25 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const ZAC_CAST_TIMES = defineCastTimes({
	id: "zac-cast-times",
	championKey: "Zac",
	since: "16.19",
	reason: "Unstable Matter has no cast time; the game files give 0.25 s",
	source: `${WIKI_DATA}Zac/Unstable_Matter`,
	castTimes: { W: 0 },
})
