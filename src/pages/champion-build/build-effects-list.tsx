import { CurrentHealthInput } from "@/features/champions/components/current-health-input"
import type { ChampionState } from "@/features/champions/hooks/use-champion-state"
import { EffectsList } from "@/features/conditions/components/effects-list"
import type { Conditions } from "@/features/conditions/hooks/use-conditions"
import { GameTimeInput } from "@/features/match/components/game-time-input"
import type { MatchState } from "@/features/match/hooks/use-match-state"

type BuildEffectsListProps = {
	conditions: Pick<Conditions, "list" | "setOn">
	championState: Pick<ChampionState, "currentHealth" | "setCurrentHealth">
	matchState: Pick<MatchState, "gameTime" | "setGameTime">
}

/** The build's Effects list with the condition value inputs, each bound to the one build value. */
export function BuildEffectsList({
	conditions,
	championState,
	matchState,
}: BuildEffectsListProps) {
	return (
		<EffectsList
			conditions={conditions.list}
			onToggle={conditions.setOn}
			healthInput={
				<CurrentHealthInput
					value={championState.currentHealth}
					onValueChange={championState.setCurrentHealth}
				/>
			}
			gameTimeInput={
				<GameTimeInput
					value={matchState.gameTime}
					onValueChange={matchState.setGameTime}
				/>
			}
		/>
	)
}
