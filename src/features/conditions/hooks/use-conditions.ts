import type { BuildEffect, EffectOverrides } from "@/lib/effects/effect"
import type { EffectContext } from "@/lib/effects/evaluate"
import { conditionList, readConditions, setCondition } from "../lib/conditions"

type UseConditionsOptions = {
	/** The effects the build has (`availableEffects`); undefined while the build's data loads. */
	effects: readonly BuildEffect[] | undefined
	/** The level and ranks the effects' values are read at. */
	context: EffectContext
	/** The effects turned on or off against their defaults. */
	value: EffectOverrides
	onChange: (value: EffectOverrides) => void
}

export type Conditions = ReturnType<typeof useConditions>

/** Which of the build's conditional effects are on, controlled by `value`: the checked choices and their edits. */
export function useConditions({
	effects,
	context,
	value,
	onChange,
}: UseConditionsOptions) {
	const checked = readConditions(value, effects)

	return {
		/** The checked choices; the given ones while the effects load. */
		value: checked,
		/** The build's effects with their switch and values; empty while they load. */
		list: conditionList(effects ?? [], checked, context),
		setOn(id: string, on: boolean) {
			const effect = effects?.find((entry) => entry.id === id)
			if (effect) onChange(setCondition(checked, effect, on))
		},
	}
}
