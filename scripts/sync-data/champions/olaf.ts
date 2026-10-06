// Olaf: Ragnarok (R) grants bonus armor and magic resistance by rank while it is not active.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const OLAF_ARMOR_RANK_STAT = {
	championKey: "Olaf",
	slot: "R",
	stat: "armor",
	dataValue: "Resists",
	reason: "Ragnarok passively grants bonus armor while it is not active",
	source: `${WIKI_DATA}Olaf/Ragnarok`,
} satisfies RankStatRule

export const OLAF_MAGIC_RESIST_RANK_STAT = {
	championKey: "Olaf",
	slot: "R",
	stat: "magicResist",
	dataValue: "Resists",
	reason:
		"Ragnarok passively grants bonus magic resistance while it is not active",
	source: `${WIKI_DATA}Olaf/Ragnarok`,
} satisfies RankStatRule
