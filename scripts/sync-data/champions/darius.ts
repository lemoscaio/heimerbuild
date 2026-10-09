// Darius: Apprehend (E) grants armor penetration by rank. Decimate (Q) swings after a 0.75 s
// windup, during which he can't attack, and Crippling Strike (W) is instant; the game files give
// 0.2344 s and 0.3667 s.
import { defineCastTimes } from "../overrides/define-champion-overrides"
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const DARIUS_ARMOR_PENETRATION_RANK_STAT = {
	championKey: "Darius",
	slot: "E",
	stat: "armorPenetrationPercent",
	dataValue: "PassivePercentArmorPen",
	scale: 0.01,
	reason: "Apprehend passively grants armor penetration",
	source: `${WIKI_DATA}Darius/Apprehend`,
} satisfies RankStatRule

export const DARIUS_CAST_TIMES = defineCastTimes({
	id: "darius-cast-times",
	championKey: "Darius",
	since: "16.19",
	reason:
		"Decimate hefts the axe for 0.75 s before the swing, unable to attack, and Crippling Strike has no cast time; the game files give 0.2344 s and 0.3667 s",
	source: `${WIKI_DATA}Darius/Decimate`,
	castTimes: { Q: 0.75, W: 0 },
})
