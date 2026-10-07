import { useCombat } from "@/features/combat/hooks/use-combat"
import { useCombatLink } from "@/features/combat/hooks/use-combat-link"
import { useTarget } from "@/features/target/hooks/use-target"
import { readTargetParam, toTargetParam } from "@/features/target/lib/target"
import type { ChampionBuild } from "./use-champion-build"

export type BuildCombat = ReturnType<typeof useBuildCombat>

/**
 * The combo on the build: the target and the combo (its steps, situation markers, free mode and its
 * choices), kept in the build source like the other domains, wired to the build's combat input.
 */
export function useBuildCombat({
	combat: input,
	championState,
	combo,
	target: targetLink,
}: Pick<ChampionBuild, "combat" | "championState" | "combo" | "target">) {
	const combatLink = useCombatLink(combo)
	const target = useTarget({
		value: readTargetParam(targetLink.value),
		onChange: (value) => targetLink.onChange(toTargetParam(value)),
		level: championState.level,
	})
	const combat = useCombat({
		input: input && { ...input, target: target.target },
		value: combatLink.value,
		onChange: combatLink.onChange,
	})
	return {
		target,
		combat,
		/** The build's effects the combo reads, to name what its steps report. */
		effects: input?.effects ?? [],
	}
}
