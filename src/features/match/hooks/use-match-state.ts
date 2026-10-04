import { type MatchStateValue, readMatchState } from "../lib/match-state"

type UseMatchStateOptions = {
	value: MatchStateValue
	onChange: (change: Partial<MatchStateValue>) => void
}

export type MatchState = ReturnType<typeof useMatchState>

/** The match's game time, controlled by `value`. */
export function useMatchState({ value, onChange }: UseMatchStateOptions) {
	const { gameTime } = readMatchState(value)

	return {
		/** Whole minutes into the game the effects read, 0 to 120. */
		gameTime,
		setGameTime: (nextTime: number) => onChange({ gameTime: nextTime }),
	}
}
