// Zaahen: Grim Deliverance (R) grants armor penetration by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const ZAAHEN_ARMOR_PENETRATION_RANK_STAT = {
	championKey: "Zaahen",
	slot: "R",
	stat: "armorPenetrationPercent",
	dataValue: "ArmorPen",
	reason: "Grim Deliverance passively grants armor penetration",
	source: `${WIKI_DATA}Zaahen/Grim_Deliverance`,
} satisfies RankStatRule
