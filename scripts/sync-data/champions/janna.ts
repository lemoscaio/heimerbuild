// Janna: Eye of the Storm (E) and Monsoon (R) are instant.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const JANNA_CAST_TIMES = defineCastTimes({
	id: "janna-cast-times",
	championKey: "Janna",
	since: "16.19",
	reason:
		"Eye of the Storm and Monsoon have no cast time; the game files give 0.25 and 0.001 s",
	source: `${WIKI_DATA}Janna/Eye_of_the_Storm`,
	castTimes: { E: 0, R: 0 },
})
