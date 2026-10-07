// Ambessa: Public Execution (R) grants armor penetration by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const AMBESSA_ARMOR_PENETRATION_RANK_STAT = {
	championKey: "Ambessa",
	slot: "R",
	stat: "armorPenetrationPercent",
	dataValue: "Armor_Penetration",
	reason: "Public Execution passively grants armor penetration",
	source: `${WIKI_DATA}Ambessa/Public_Execution`,
} satisfies RankStatRule
