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
import {
	GAME_START,
	nextGameTimeStep,
	readsGameTime,
} from "@/lib/effects/game-time"

/** One effect of the build with its switch and what it gives at the build's level and ranks. */
export type Condition = {
	effect: BuildEffect
	isOn: boolean
	/** An always-on effect informs, with no switch. */
	isSwitchable: boolean
	/** Its value follows the current health, so its row carries the health input. */
	readsCurrentHealth: boolean
	/** Its value follows the game time, so its row carries the game time input. */
	readsGameTime: boolean
	grants: readonly ResolvedGrant[]
	/** What it grants from the next game time step on, for an effect that grows with the game time. */
	next?: { gameTime: number; grants: readonly ResolvedGrant[] }
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
	/** Whole minutes into the game, 1 to 120; absent means its start. */
	gameTime?: number
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

/** The game time checked like the current health: dropped at the game's start or when no effect reads it. */
export function readGameTime(
	gameTime: number | undefined,
	effects: readonly BuildEffect[] | undefined,
): number | undefined {
	if (gameTime === GAME_START) return undefined
	if (!effects) return gameTime
	return effects.some(({ effect }) => readsGameTime(effect))
		? gameTime
		: undefined
}

/** The effect's grants at its next game time step, when its value follows the game time. */
function nextStep(
	effect: BuildEffect,
	context: EffectContext,
): Condition["next"] {
	const gameTime = nextGameTimeStep(
		effect.effect,
		context.gameTime ?? GAME_START,
	)
	return gameTime === undefined
		? undefined
		: { gameTime, grants: resolveGrants(effect, { ...context, gameTime }) }
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
		readsGameTime: readsGameTime(effect.effect),
		grants: resolveGrants(effect, context),
		next: nextStep(effect, context),
		duration: effectDuration(effect, context),
		stackedOutBy: stackedOut.get(effect.id),
	}))
}
