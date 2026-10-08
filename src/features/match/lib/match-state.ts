import { GAME_START } from "@/lib/effects/game-time"
import type { MatchStacks } from "@/lib/effects/match-stacks"

/** The match's state, one per match: the game time, shared by every build in it, and the stacks this build gathered. */
export type MatchStateValue = {
	/** Whole minutes into the game, 0 to 120; absent means its start. */
	gameTime?: number
	/** Stacks by source id (Siphoning Strike's); absent means none. */
	matchStacks?: MatchStacks
}

/** The match's values with their defaults: the game time is its start and there are no stacks when absent. */
export function readMatchState({
	gameTime = GAME_START,
	matchStacks = {},
}: MatchStateValue) {
	return { gameTime, matchStacks }
}
