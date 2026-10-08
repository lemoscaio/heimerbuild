import { type Boost, effectBoosts } from "@/lib/effects/boosts"
import { usesCurrentHealth } from "@/lib/effects/current-health"
import { isOnByDefault, isSwitchable } from "@/lib/effects/defaults"
import type {
	BuildEffect,
	EffectOverrides,
	MatchStackSource,
} from "@/lib/effects/effect"
import {
	type EffectContext,
	effectDuration,
	isEffectOn,
	isInForm,
	type LockedGrants,
	lockedGrants,
	type ResolvedGrant,
	resolveGrants,
	stackEffects,
} from "@/lib/effects/evaluate"
import {
	GAME_START,
	nextGameTimeStep,
	usesGameTime,
} from "@/lib/effects/game-time"
import {
	matchStackSources,
	nextMatchStacksStep,
	withMatchStacks,
} from "@/lib/effects/match-stacks"

/** One effect of the build with its switch and what it gives at the build's level and ranks. */
export type Condition = {
	effect: BuildEffect
	isOn: boolean
	/** An always-on effect informs, with no switch. */
	isSwitchable: boolean
	/** Its value follows the current health, so its row carries the health input. */
	usesCurrentHealth: boolean
	/** Its value follows the game time, so its row carries the game time input. */
	usesGameTime: boolean
	/** The match stacks its value follows, so its row carries each one's input. */
	stackSources: readonly MatchStackSource[]
	grants: readonly ResolvedGrant[]
	/** What it grants once the match stacks reach a threshold they haven't yet (Mejai's move speed at 10). */
	locked: readonly LockedGrants[]
	/** What it grants from the next stack count that changes it, for one that grows in steps (Kindred's range). */
	nextStacks?: { stacks: number; grants: readonly ResolvedGrant[] }
	/** What it grants from the next game time step on, for an effect that grows with the game time. */
	next?: { gameTime: number; grants: readonly ResolvedGrant[] }
	/** Seconds it lasts, when it says. */
	duration?: number
	/** The effect of its stacking group that applies instead, while this one is on. */
	stackedOutBy?: BuildEffect
	/** The other abilities with a point that raise its value (GNAR! for Hyper). */
	boostedBy?: readonly Boost[]
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

/** The effect's grants at the next count of its sources that changes a stepped amount. */
function nextStacksStep(
	effect: BuildEffect,
	context: EffectContext,
): Condition["nextStacks"] {
	for (const source of matchStackSources(effect.effect)) {
		const stacks = nextMatchStacksStep(
			effect.effect,
			source,
			context.matchStacks,
		)
		if (stacks === undefined) continue
		const matchStacks = withMatchStacks(context.matchStacks, source.id, stacks)
		return {
			stacks,
			grants: resolveGrants(effect, { ...context, matchStacks }),
		}
	}
	return undefined
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

/** The build's effects in list order, each with its switch and values; a form's effects only in that form. */
export function conditionList(
	effects: readonly BuildEffect[],
	value: EffectOverrides,
	context: EffectContext,
): Condition[] {
	const { stackedOut } = stackEffects(effects, value, context)
	const inForm = effects.filter((effect) => isInForm(effect, context.form))
	return inForm.map((effect) => {
		const boostedBy = effectBoosts(effect, context.ranks)
		return {
			effect,
			isOn: isEffectOn(effect, value),
			isSwitchable: isSwitchable(effect.effect),
			usesCurrentHealth: usesCurrentHealth(effect.effect),
			usesGameTime: usesGameTime(effect.effect),
			stackSources: matchStackSources(effect.effect),
			grants: resolveGrants(effect, context),
			locked: lockedGrants(effect, context),
			next: nextStep(effect, context),
			nextStacks: nextStacksStep(effect, context),
			duration: effectDuration(effect, context),
			stackedOutBy: stackedOut.get(effect.id),
			...(boostedBy.length > 0 && { boostedBy }),
		}
	})
}
