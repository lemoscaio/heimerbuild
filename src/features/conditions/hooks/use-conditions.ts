import { FULL_HEALTH } from "@/lib/effects/current-health"
import type { BuildEffect } from "@/lib/effects/effect"
import type { EffectContext } from "@/lib/effects/evaluate"
import {
	type ConditionsValue,
	conditionList,
	readConditions,
	readCurrentHealth,
	setCondition,
} from "../lib/conditions"

type UseConditionsOptions = {
	/** The effects the build has (`availableEffects`); undefined while the build's data loads. */
	effects: readonly BuildEffect[] | undefined
	/** The level, ranks and totals the effects' values are read at. */
	context: EffectContext
	/** The effects turned on or off against their defaults, and the current health. */
	value: ConditionsValue
	onChange: (value: ConditionsValue) => void
}

export type Conditions = ReturnType<typeof useConditions>

/** The build's conditions, controlled by `value`: the checked choices, the current health and their edits. */
export function useConditions({
	effects,
	context,
	value,
	onChange,
}: UseConditionsOptions) {
	const checked: ConditionsValue = {
		effects: readConditions(value.effects, effects),
		currentHealth: readCurrentHealth(value.currentHealth, effects),
	}

	return {
		/** The checked conditions; the given ones while the effects load. */
		value: checked,
		/** Percent of maximum health the effects read, 1 to 100. */
		currentHealth: checked.currentHealth ?? FULL_HEALTH,
		/** The build's effects with their switch and values; empty while they load. */
		list: conditionList(effects ?? [], checked.effects, {
			...context,
			currentHealth: checked.currentHealth,
		}),
		setOn(id: string, on: boolean) {
			const effect = effects?.find((entry) => entry.id === id)
			if (effect) {
				onChange({
					...checked,
					effects: setCondition(checked.effects, effect, on),
				})
			}
		},
		setCurrentHealth(currentHealth: number) {
			onChange({
				...checked,
				currentHealth:
					currentHealth === FULL_HEALTH ? undefined : currentHealth,
			})
		},
	}
}
