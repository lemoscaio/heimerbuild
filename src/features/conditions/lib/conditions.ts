import { isOnByDefault } from "@/lib/effects/defaults"
import type { BuildEffect, EffectOverrides } from "@/lib/effects/effect"
import {
	type EffectContext,
	effectDuration,
	isEffectOn,
	type ResolvedGrant,
	resolveGrants,
	stackEffects,
} from "@/lib/effects/evaluate"

/** One effect of the build with its switch and what it gives at the build's level and ranks. */
export type Condition = {
	effect: BuildEffect
	isOn: boolean
	grants: readonly ResolvedGrant[]
	/** Seconds it lasts, when it says. */
	duration?: number
	/** The effect of its stacking group that applies instead, while this one is on. */
	stackedOutBy?: BuildEffect
}

/**
 * The choices checked against the build's effects: a choice for an effect the build lacks, or
 * equal to its default, drops out. Until the effects load, the choices stay as given.
 */
export function readConditions(
	value: EffectOverrides,
	effects: readonly BuildEffect[] | undefined,
): EffectOverrides {
	if (!effects) return value
	return Object.fromEntries(
		effects.flatMap(({ id, effect }) => {
			const on = value[id]
			return on === undefined || on === isOnByDefault(effect) ? [] : [[id, on]]
		}),
	)
}

/** The choices with `effect` turned on or off; back to its default, it leaves the choices. */
export function setCondition(
	value: EffectOverrides,
	effect: BuildEffect,
	on: boolean,
): EffectOverrides {
	const { [effect.id]: _previous, ...others } = value
	return on === isOnByDefault(effect.effect)
		? others
		: { ...others, [effect.id]: on }
}

/** The build's effects in list order, each with its switch and values. */
export function conditionList(
	effects: readonly BuildEffect[],
	value: EffectOverrides,
	context: EffectContext,
): Condition[] {
	const { stackedOut } = stackEffects(effects, value, context)
	return effects.map((effect) => ({
		effect,
		isOn: isEffectOn(effect, value),
		grants: resolveGrants(effect, context),
		duration: effectDuration(effect, context),
		stackedOutBy: stackedOut.get(effect.id),
	}))
}
