// Annie: Summon: Tibbers (R) grants magic penetration by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const ANNIE_MAGIC_PENETRATION_RANK_STAT = {
	championKey: "Annie",
	slot: "R",
	stat: "magicPenetrationPercent",
	dataValue: "RPercentPenBuff",
	reason: "Summon: Tibbers passively grants magic penetration",
	source: `${WIKI_DATA}Annie/Summon:_Tibbers`,
} satisfies RankStatRule
