// Nautilus: Titan's Wrath (W) is instant; the game files give 0.25 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import { WIKI_DATA } from "./rule-helpers"

export const NAUTILUS_CAST_TIMES = defineCastTimes({
	id: "nautilus-cast-times",
	championKey: "Nautilus",
	since: "16.19",
	reason: "Titan's Wrath has no cast time; the game files give 0.25 s",
	source: `${WIKI_DATA}Nautilus/Titan's_Wrath`,
	castTimes: { W: 0 },
})
