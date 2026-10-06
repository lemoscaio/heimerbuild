// Morgana: Black Shield (E) is instant; the game files give 0.52 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const MORGANA_CAST_TIMES = defineCastTimes({
	id: "morgana-cast-times",
	championKey: "Morgana",
	since: "16.19",
	reason: "Black Shield has no cast time; the game files give 0.52 s",
	source: `${WIKI_DATA}Morgana/Black_Shield`,
	castTimes: { E: 0 },
})
