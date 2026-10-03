import { CurrentHealthInput } from "@/features/conditions/components/current-health-input"
import { EffectsList } from "@/features/conditions/components/effects-list"
import { GameTimeInput } from "@/features/conditions/components/game-time-input"
import type { Conditions } from "@/features/conditions/hooks/use-conditions"

type BuildEffectsListProps = {
	conditions: Conditions
}

/** The build's Effects list with its condition inputs, each bound to the one build value. */
export function BuildEffectsList({ conditions }: BuildEffectsListProps) {
	return (
		<EffectsList
			conditions={conditions.list}
			onToggle={conditions.setOn}
			healthInput={
				<CurrentHealthInput
					value={conditions.currentHealth}
					onValueChange={conditions.setCurrentHealth}
				/>
			}
			gameTimeInput={
				<GameTimeInput
					value={conditions.gameTime}
					onValueChange={conditions.setGameTime}
				/>
			}
		/>
	)
}
