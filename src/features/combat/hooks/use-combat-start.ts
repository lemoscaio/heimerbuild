import { combatStartOptions } from "@/lib/combat/start-options"
import { combatFormId } from "../lib/combat-form"
import {
	type CombatStartOption,
	readCombatStart,
	startOptionLabel,
	toggleCombatStart,
} from "../lib/combat-start"
import type { CombatInput } from "./use-combat"

type UseCombatStartOptions = {
	/** The build the combo runs on; undefined while its data loads. */
	input: Omit<CombatInput, "start" | "target"> | undefined
	/** The chosen situations, by effect id. */
	value: readonly string[]
	onChange: (value: string[]) => void
}

export type CombatStart = ReturnType<typeof useCombatStart>

/**
 * The combo's starting situation, controlled by `value`: the situations the build's effects
 * support (Harrier's mark, Short Fuse ready), each on or off. Nothing is chosen by default.
 */
export function useCombatStart({
	input,
	value,
	onChange,
}: UseCombatStartOptions) {
	const available =
		input && combatStartOptions(input.effects, combatFormId(input.build))
	const chosen = readCombatStart(value, available)

	return {
		/** The chosen situations the build supports, for the simulator (`CombatInput.start`). */
		chosen,
		options: (available ?? []).map(
			(effect): CombatStartOption => ({
				id: effect.id,
				label: startOptionLabel(effect),
				on: chosen.includes(effect.id),
			}),
		),
		toggle: (id: string, on: boolean) =>
			onChange(toggleCombatStart(chosen, id, on)),
	}
}
