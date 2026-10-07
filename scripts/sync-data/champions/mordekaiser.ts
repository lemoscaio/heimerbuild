// Mordekaiser: Death's Grasp (E) grants magic penetration by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const MORDEKAISER_MAGIC_PENETRATION_RANK_STAT = {
	championKey: "Mordekaiser",
	slot: "E",
	stat: "magicPenetrationPercent",
	dataValue: "MagicPen",
	reason: "Death's Grasp passively grants magic penetration",
	source: `${WIKI_DATA}Mordekaiser/Death%27s_Grasp`,
} satisfies RankStatRule
