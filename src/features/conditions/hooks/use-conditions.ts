import type { BuildEffect, EffectOverrides } from "@/lib/effects/effect"
import type { EffectContext } from "@/lib/effects/evaluate"
import { conditionList, readConditions, setCondition } from "../lib/conditions"

type UseConditionsOptions = {
	/** The effects the build has (`availableEffects`); undefined while the build's data loads. */
	available: readonly BuildEffect[] | undefined
	/** The level, current health, game time, ranks, adaptive type and totals the rows' values are read at. */
	context: EffectContext
	/** The effects turned on or off against their defaults. */
	value: EffectOverrides
	onChange: (value: EffectOverrides) => void
}

export type Conditions = ReturnType<typeof useConditions>

/** The build's effects turned on or off, controlled by `value`: the checked choices and their edits. */
export function useConditions({
	available,
	context,
	value,
	onChange,
}: UseConditionsOptions) {
	const checked = readConditions(value, available)

	return {
		/** The checked choices; the given ones while the effects load. */
		value: checked,
		/** The build's effects with their switch and values; empty while they load. */
		list: conditionList(available ?? [], checked, context),
		setOn(id: string, on: boolean) {
			const effect = available?.find((entry) => entry.id === id)
			if (effect) onChange(setCondition(checked, effect, on))
		},
	}
}
