// Braum: Unbreakable (E) is instant; the game files give 0.01 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const BRAUM_CAST_TIMES = defineCastTimes({
	id: "braum-cast-times",
	championKey: "Braum",
	since: "16.19",
	reason: "Unbreakable has no cast time; the game files give 0.01 s",
	source: `${WIKI_DATA}Braum/Unbreakable`,
	castTimes: { E: 0 },
})
