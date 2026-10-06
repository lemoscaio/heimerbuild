// Nocturne: Shroud of Darkness (W) grants bonus attack speed by rank; its doubling after a block is not applied.
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const NOCTURNE_ATTACK_SPEED_RANK_STAT = {
	championKey: "Nocturne",
	slot: "W",
	stat: "attackSpeedPercent",
	dataValue: "ActiveAS",
	scale: 0.01,
	reason:
		"Shroud of Darkness passively grants bonus attack speed (doubled for 5 s after blocking a spell, not applied)",
	source: `${WIKI_DATA}Nocturne/Shroud_of_Darkness`,
} satisfies RankStatRule
