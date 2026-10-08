import { withMatchStacks } from "@/lib/effects/match-stacks"
import { type MatchStateValue, readMatchState } from "../lib/match-state"

type UseMatchStateOptions = {
	value: MatchStateValue
	onChange: (change: Partial<MatchStateValue>) => void
}

export type MatchState = ReturnType<typeof useMatchState>

/** The match's game time and the build's match stacks, controlled by `value`. */
export function useMatchState({ value, onChange }: UseMatchStateOptions) {
	const { gameTime, matchStacks } = readMatchState(value)

	return {
		/** Whole minutes into the game the effects read, 0 to 120. */
		gameTime,
		setGameTime: (nextTime: number) => onChange({ gameTime: nextTime }),
		/** Stacks by source id; a source without an entry has none. */
		matchStacks,
		setMatchStacks: (sourceId: string, count: number) =>
			onChange({
				matchStacks: withMatchStacks(value.matchStacks, sourceId, count),
			}),
	}
}
