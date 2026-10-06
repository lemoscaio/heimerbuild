// Maokai: Bramble Smash (Q) takes 0.3 s, Twisted Advance (W) is instant and Nature's Grasp (R) takes 0.5 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const MAOKAI_CAST_TIMES = defineCastTimes({
	id: "maokai-cast-times",
	championKey: "Maokai",
	since: "16.19",
	reason:
		"Bramble Smash takes 0.3 s, Twisted Advance has no cast time and Nature's Grasp takes 0.5 s; the game files give 0.375, 0.25 and none",
	source: `${WIKI_DATA}Maokai/Bramble_Smash`,
	castTimes: { Q: 0.3, W: 0, R: 0.5 },
})
