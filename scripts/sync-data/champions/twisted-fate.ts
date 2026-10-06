// Twisted Fate: Stacked Deck (E) grants bonus attack speed by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const TWISTED_FATE_ATTACK_SPEED_RANK_STAT = {
	championKey: "TwistedFate",
	slot: "E",
	stat: "attackSpeedPercent",
	dataValue: "AttackSpeedBonus",
	scale: 0.01,
	reason: "Stacked Deck passively grants bonus attack speed",
	source: `${WIKI_DATA}Twisted_Fate/Stacked_Deck`,
} satisfies RankStatRule
