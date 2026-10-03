import type { BuildEffect } from "@/lib/effects/effect"
import { GAME_START } from "@/lib/effects/game-time"
import {
	gameTimeValue,
	type MatchStateValue,
	readGameTime,
} from "../lib/match-state"

type UseMatchStateOptions = {
	/** The effects that may read the match state (`availableEffects`); undefined while they load. */
	effects: readonly BuildEffect[] | undefined
	value: MatchStateValue
	onChange: (value: MatchStateValue) => void
}

export type MatchState = ReturnType<typeof useMatchState>

/** The match's game time, controlled by `value`. */
export function useMatchState({
	effects,
	value,
	onChange,
}: UseMatchStateOptions) {
	const checked: MatchStateValue = {
		gameTime: readGameTime(value.gameTime, effects),
	}

	return {
		/** The checked value; the given one while the effects load. */
		value: checked,
		/** Whole minutes into the game the effects read, 0 to 120. */
		gameTime: checked.gameTime ?? GAME_START,
		setGameTime(gameTime: number) {
			onChange({ ...checked, gameTime: gameTimeValue(gameTime) })
		},
	}
}
