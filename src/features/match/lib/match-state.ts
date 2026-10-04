import { GAME_START } from "@/lib/effects/game-time"

/** The match's state, one per match and shared by every build in it: the game time. */
export type MatchStateValue = {
	/** Whole minutes into the game, 0 to 120; absent means its start. */
	gameTime?: number
}

/** The match's values with their defaults: the game time is its start when absent. */
export function readMatchState({ gameTime = GAME_START }: MatchStateValue) {
	return { gameTime }
}
