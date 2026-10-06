import type { BuildEffect, MarkConsumer, Trigger } from "../effects/effect"
import { isInForm } from "../effects/evaluate"
import type {
	CombatItem,
	CombatResult,
	OutcomeChoices,
	OutcomeKey,
} from "./combat"

/** An outcome's key in `OutcomeChoices`: "empowered:hail-of-blades", "mark-consumed:quinn-harrier". */
export function outcomeId(key: OutcomeKey): string {
	return "mark" in key
		? `${key.kind}:${key.mark}`
		: `${key.kind}:${key.effectId}`
}

/** Whether the effect deals damage over time (Ignite, Toxic Shot). */
export function dealsDamageOverTime({ effect }: BuildEffect): boolean {
	return effect.grants.some(({ kind }) => kind === "damageOverTime")
}

/** An ability's effect that deals damage on a basic attack (Toxic Shot), which is ability damage. */
function isAttackAbilityDamage({ effect }: BuildEffect): boolean {
	const onAttack =
		effect.trigger.kind === "on-hit" ||
		effect.trigger.kind === "on-attack" ||
		[effect.endsOn].flat().includes("on-hit")
	return (
		onAttack &&
		effect.source.kind === "ability" &&
		effect.grants.some(({ kind }) =>
			["damage", "abilityDamage", "damageOverTime"].includes(kind),
		)
	)
}

/**
 * Whether a trigger fires on the item: an attack's `on-attack` and `on-hit`, a cast's own
 * triggers; ability damage on any cast, and on attacks while an ability's effect deals some on them.
 */
function firesOn(
	trigger: Trigger,
	effect: BuildEffect,
	item: CombatItem,
	effects: readonly BuildEffect[],
): boolean {
	if (trigger.kind === "on-ability-damage") {
		return (
			item.kind === "ability" ||
			(item.kind === "attack" && effects.some(isAttackAbilityDamage))
		)
	}
	if (item.kind === "attack") {
		return trigger.kind === "on-attack" || trigger.kind === "on-hit"
	}
	if (item.kind !== "ability") return false
	const { source } = effect.effect
	return (
		trigger.kind === "after-ability" ||
		(trigger.kind === "on-cast" &&
			(trigger.slots?.includes(item.slot) ?? true)) ||
		(trigger.kind === "after-use" &&
			source.kind === "ability" &&
			source.slot === item.slot)
	)
}

/**
 * The outcomes the build's effects can have at an item, from their triggers alone: an `on-attack`
 * effect empowers attacks, a mark is applied by the actions that trigger its applier and consumed by
 * the actions its `consumedBy` names, a damage over time is applied by the actions that trigger it.
 * Markers, summoner spells and waits have none.
 */
export function outcomeKeys(
	item: CombatItem,
	effects: readonly BuildEffect[],
	form: string | undefined,
): OutcomeKey[] {
	if (item.kind !== "attack" && item.kind !== "ability") return []
	const own = effects.filter((effect) => isInForm(effect, form))
	const consumer: MarkConsumer = item.kind === "attack" ? "attack" : "ability"
	const keys: OutcomeKey[] = [
		...own.flatMap((effect): OutcomeKey[] =>
			item.kind === "attack" && effect.effect.trigger.kind === "on-attack"
				? [{ kind: "empowered", effectId: effect.id }]
				: [],
		),
		...own.flatMap((effect): OutcomeKey[] => {
			const { applies, trigger } = effect.effect
			return applies && firesOn(trigger, effect, item, own)
				? [{ kind: "mark-applied", mark: applies.mark }]
				: []
		}),
		...own.flatMap((effect): OutcomeKey[] =>
			dealsDamageOverTime(effect) &&
			firesOn(effect.effect.trigger, effect, item, own)
				? [{ kind: "damage-over-time", effectId: effect.id }]
				: [],
		),
		...own.flatMap((effect): OutcomeKey[] =>
			effect.effect.applies?.consumedBy.includes(consumer)
				? [{ kind: "mark-consumed", mark: effect.effect.applies.mark }]
				: [],
		),
	]
	const ids = keys.map(outcomeId)
	return keys.filter((key, index) => ids.indexOf(outcomeId(key)) === index)
}

/** A run's outcomes by item, as choices: what free mode starts from before the user changes any. */
export function outcomeChoices(result: CombatResult): OutcomeChoices[] {
	return result.steps.map(({ outcomes }) =>
		Object.fromEntries(
			outcomes.map((outcome) => [outcomeId(outcome), outcome.happened]),
		),
	)
}
