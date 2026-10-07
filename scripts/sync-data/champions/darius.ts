// Darius: Apprehend (E) grants armor penetration by rank.
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
