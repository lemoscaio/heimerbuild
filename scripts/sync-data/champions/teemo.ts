// Teemo: Move Quick (W) grants bonus movement speed by rank while he was not hit for 5 s;
// the app applies it as the teemo-w-passive effect (src/lib/champions/teemo.ts).
import type { RankStatRule } from "../rank-stats"
import { WIKI_DATA } from "./rule-helpers"

export const TEEMO_MOVEMENT_SPEED_RANK_STAT = {
	championKey: "Teemo",
	slot: "W",
	stat: "movementSpeedPercent",
	dataValue: "PassiveMoveSpeedBonus",
	reason:
		"Move Quick passively grants bonus movement speed while Teemo was not hit by a champion or turret for 5 s; the app applies it as the teemo-w-passive effect, on by default",
	source: `${WIKI_DATA}Teemo/Move_Quick`,
} satisfies RankStatRule
