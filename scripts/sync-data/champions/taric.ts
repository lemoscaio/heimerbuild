// Taric: Dazzle (E) is instant; the game files give 0.25 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const TARIC_CAST_TIMES = defineCastTimes({
	id: "taric-cast-times",
	championKey: "Taric",
	since: "16.19",
	reason: "Dazzle has no cast time; the game files give 0.25 s",
	source: `${WIKI_DATA}Taric/Dazzle`,
	castTimes: { E: 0 },
})
