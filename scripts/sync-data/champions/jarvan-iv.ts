// Jarvan IV: Demacian Standard (E) grants bonus attack speed by rank.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const JARVAN_IV_ATTACK_SPEED_RANK_STAT = {
	championKey: "JarvanIV",
	slot: "E",
	stat: "attackSpeedPercent",
	dataValue: "PermanentAttackSpeed",
	reason: "Demacian Standard passively grants bonus attack speed",
	source: `${WIKI_DATA}Jarvan_IV/Demacian_Standard`,
} satisfies RankStatRule
