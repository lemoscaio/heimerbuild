// Jax: Leap Strike (Q) and Empower (W) are instant; the game files give 0.25 s and 0.52 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const JAX_CAST_TIMES = defineCastTimes({
	id: "jax-cast-times",
	championKey: "Jax",
	since: "16.19",
	reason:
		"Leap Strike and Empower have no cast time; the game files give 0.25 s and 0.52 s",
	source: `${WIKI_DATA}Jax/Empower`,
	castTimes: { Q: 0, W: 0 },
})
