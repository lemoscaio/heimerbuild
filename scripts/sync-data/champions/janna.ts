// Janna: Eye of the Storm (E) and Monsoon (R) are instant.
// Zephyr (W) grants bonus movement speed by rank; the app applies it, with its +2% per 100 AP, as
// the janna-w-passive effect (src/lib/champions/janna.ts).
import { defineCastTimes } from "../overrides/define-champion-overrides"
import type { RankStatRule } from "../rank-stats"
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

export const JANNA_MOVEMENT_SPEED_RANK_STAT = {
	championKey: "Janna",
	slot: "W",
	stat: "movementSpeedPercent",
	dataValue: "MSPercent",
	reason:
		"Zephyr passively grants bonus movement speed; the app applies it, with its +2% per 100 AP, as the janna-w-passive effect",
	source: `${WIKI_DATA}Janna/Zephyr`,
} satisfies RankStatRule
