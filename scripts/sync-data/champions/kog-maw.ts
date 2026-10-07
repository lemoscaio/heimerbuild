// Kog'Maw: Caustic Spittle (Q) grants bonus attack speed by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const KOG_MAW_ATTACK_SPEED_RANK_STAT = {
	championKey: "KogMaw",
	slot: "Q",
	stat: "attackSpeedPercent",
	dataValue: "AttackSpeed",
	reason: "Caustic Spittle passively grants bonus attack speed",
	source: `${WIKI_DATA}Kog%27Maw/Caustic_Spittle`,
} satisfies RankStatRule
