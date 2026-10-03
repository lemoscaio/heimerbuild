import { FULL_HEALTH, readsCurrentHealth } from "@/lib/effects/current-health"
import { isOnByDefault, isSwitchable } from "@/lib/effects/defaults"
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
	/** An always-on effect informs, with no switch. */
	isSwitchable: boolean
	/** Its value follows the current health, so its row carries the health input. */
	readsCurrentHealth: boolean
	grants: readonly ResolvedGrant[]
	/** Seconds it lasts, when it says. */
	duration?: number
	/** The effect of its stacking group that applies instead, while this one is on. */
	stackedOutBy?: BuildEffect
}

/** The build's conditions: the effects turned on or off, and the current health effects read. */
export type ConditionsValue = {
	effects: EffectOverrides
	/** Percent of maximum health, 1 to 99; absent means full health. */
	currentHealth?: number
}

/**
 * The choices checked against the build's effects: a choice for an effect the build lacks, has no
 * switch for, or equal to its default, drops out. Until the effects load, the choices stay as given.
 */
export function readConditions(
	value: EffectOverrides,
	effects: readonly BuildEffect[] | undefined,
): EffectOverrides {
	if (!effects) return value
	return Object.fromEntries(
		effects.flatMap(({ id, effect }) => {
			const on = value[id]
			const isChoice =
				on !== undefined && isSwitchable(effect) && on !== isOnByDefault(effect)
			return isChoice ? [[id, on]] : []
		}),
	)
}

/** The current health checked like a choice: dropped at full health or when no effect reads it. */
export function readCurrentHealth(
	currentHealth: number | undefined,
	effects: readonly BuildEffect[] | undefined,
): number | undefined {
	if (currentHealth === FULL_HEALTH) return undefined
	if (!effects) return currentHealth
	return effects.some(({ effect }) => readsCurrentHealth(effect))
		? currentHealth
		: undefined
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
		isSwitchable: isSwitchable(effect.effect),
		readsCurrentHealth: readsCurrentHealth(effect.effect),
		grants: resolveGrants(effect, context),
		duration: effectDuration(effect, context),
		stackedOutBy: stackedOut.get(effect.id),
	}))
}
