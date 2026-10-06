import { useState } from "react"
import { useCombat } from "@/features/combat/hooks/use-combat"
import type { CombatEntry } from "@/features/combat/lib/combat-sequence"
import { useTarget } from "@/features/target/hooks/use-target"
import type { TargetValue } from "@/features/target/lib/target"
import type { ChampionBuild } from "./use-champion-build"

export type BuildCombat = ReturnType<typeof useBuildCombat>

/**
 * The combo on the build: the target and the steps, held in memory (an experimental domain stays
 * out of the link until its format is stable, issue 317), wired to the build's combat input.
 */
export function useBuildCombat({
	combat: input,
	championState,
}: Pick<ChampionBuild, "combat" | "championState">) {
	const [targetValue, setTargetValue] = useState<TargetValue>({})
	const [steps, setSteps] = useState<CombatEntry[]>([])
	const target = useTarget({
		value: targetValue,
		onChange: setTargetValue,
		level: championState.level,
	})
	const combat = useCombat({
		input: input && { ...input, target: target.target },
		value: steps,
		onChange: setSteps,
	})
	return {
		target,
		combat,
		/** The build's effects the combo reads, to name what its steps report. */
		effects: input?.effects ?? [],
	}
}
