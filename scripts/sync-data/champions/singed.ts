// Singed: Poison Trail (Q) and Insanity Potion (R) are instant.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const SINGED_CAST_TIMES = defineCastTimes({
	id: "singed-cast-times",
	championKey: "Singed",
	since: "16.19",
	reason:
		"Poison Trail and Insanity Potion have no cast time; the game files give 0.38 and 0.25 s",
	source: `${WIKI_DATA}Singed/Poison_Trail`,
	castTimes: { Q: 0, R: 0 },
})
