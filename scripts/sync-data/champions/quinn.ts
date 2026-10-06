// Quinn: Heightened Senses (W) and Vault (E) are instant; the game files give 0.25 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const QUINN_CAST_TIMES = defineCastTimes({
	id: "quinn-cast-times",
	championKey: "Quinn",
	since: "16.19",
	reason:
		"Heightened Senses and Vault have no cast time; the game files give 0.25 s",
	source: `${WIKI_DATA}Quinn/Vault`,
	castTimes: { W: 0, E: 0 },
})
