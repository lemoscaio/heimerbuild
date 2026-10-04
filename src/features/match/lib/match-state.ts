import type { BuildEffect } from "@/lib/effects/effect"
import { GAME_START, usesGameTime } from "@/lib/effects/game-time"

/** The match's state, one per match and shared by every build in it: the game time. */
export type MatchStateValue = {
	/** Whole minutes into the game, 1 to 120; absent means its start. */
	gameTime?: number
}

/** The game time checked like an effect choice: dropped at the game's start or when no effect reads it. */
export function readGameTime(
	gameTime: number | undefined,
	effects: readonly BuildEffect[] | undefined,
): number | undefined {
	if (gameTime === GAME_START) return undefined
	if (!effects) return gameTime
	return effects.some(({ effect }) => usesGameTime(effect))
		? gameTime
		: undefined
}

/** The value a game time edit saves: the game's start is no value. */
export function gameTimeValue(gameTime: number): number | undefined {
	return gameTime === GAME_START ? undefined : gameTime
}
