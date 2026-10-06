// Pantheon: Grand Starfall (R) grants armor penetration by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const PANTHEON_ARMOR_PENETRATION_RANK_STAT = {
	championKey: "Pantheon",
	slot: "R",
	stat: "armorPenetrationPercent",
	dataValue: "ArmorPenetration",
	reason: "Grand Starfall passively grants armor penetration",
	source: `${WIKI_DATA}Pantheon/Grand_Starfall`,
} satisfies RankStatRule
