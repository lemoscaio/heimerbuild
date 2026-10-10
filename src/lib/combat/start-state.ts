import type { BuildEffect, Effect, Grant } from "../effects/effect"
import { isInForm } from "../effects/evaluate"
import {
	type ComboStart,
	readComboStart,
	serializeComboStart,
} from "./combo-link"
import { hasStartCooldown } from "./start-cooldowns"

/** Stats a basic attack, an ability or a proc in the combo never reads. */
const NO_DAMAGE_STATS: ReadonlySet<string> = new Set([
	"movementSpeedFlat",
	"movementSpeedPercent",
	"lifeStealPercent",
	"omnivampPercent",
	"tenacityPercent",
	"slowResistPercent",
	"healAndShieldPowerPercent",
	"healthRegen",
	"manaRegen",
	"baseHealthRegenPercent",
	"baseManaRegenPercent",
	"attackRange",
	"armor",
	"magicResist",
])

/** Whether a grant can change the combo's damage: not a shield, a heal or a stat no hit reads (movement speed). */
function changesComboDamage(grant: Grant): boolean {
	if (grant.kind === "shield" || grant.kind === "heal") return false
	return grant.kind !== "stat" || !NO_DAMAGE_STATS.has(grant.stat)
}

/**
 * An in-fight stacking effect the combo can start with (owner decisions, issue 317): its grants
 * scale with the count and change the damage. Left out: damage over time (Blaze), grants only at
 * the cap (Judgment's spins, Vi's W) and counters that only trigger a proc (Kraken Slayer).
 */
export function isStartStackEffect(effect: Effect): boolean {
	const { stacks, grants } = effect
	return (
		!!stacks &&
		!stacks.onlyAtMax &&
		!grants.some(({ kind }) => kind === "damageOverTime") &&
		grants.some(changesComboDamage)
	)
}

const AFTER_USE_TRIGGERS: ReadonlySet<string> = new Set([
	"after-use",
	"after-ability",
	"after-summoner",
])

/**
 * A buff the combo can start with already running: one a cast or a summoner spell starts on the
 * attacker for a while, that changes the damage (Highlander's attack speed, not Ghost's speed).
 */
export function isStartRunningEffect(effect: Effect): boolean {
	return (
		AFTER_USE_TRIGGERS.has(effect.trigger.kind) &&
		effect.holder !== "target" &&
		effect.duration !== undefined &&
		effect.stacks === undefined &&
		effect.cooldown === undefined &&
		effect.listed !== false &&
		effect.grants.some(changesComboDamage)
	)
}

/** The build's effects in the champion's form that `is` accepts, once each. */
function startEffects(
	effects: readonly BuildEffect[],
	form: string | undefined,
	is: (effect: Effect) => boolean,
): BuildEffect[] {
	const seen = new Set<string>()
	return effects.filter((effect) => {
		if (seen.has(effect.id)) return false
		seen.add(effect.id)
		return is(effect.effect) && isInForm(effect, form)
	})
}

/** The stacking effects the build can start the combo with ("+", Stacks at the start). */
export function startStackEffects(
	effects: readonly BuildEffect[],
	form: string | undefined,
): BuildEffect[] {
	return startEffects(effects, form, isStartStackEffect)
}

/** The buffs the build can start the combo with running ("+", Running at the start). */
export function startRunningEffects(
	effects: readonly BuildEffect[],
	form: string | undefined,
): BuildEffect[] {
	return startEffects(effects, form, isStartRunningEffect)
}

/** The start without what the build's effects can't set; a count past an effect's cap is its cap. */
export function keepUsableStart(
	start: ComboStart,
	effects: readonly BuildEffect[],
): ComboStart {
	const byId = new Map(effects.map((effect) => [effect.id, effect.effect]))
	const usable = (id: string, is: (effect: Effect) => boolean) => {
		const effect = byId.get(id)
		return !!effect && is(effect)
	}
	return {
		onCooldown: start.onCooldown.filter((id) => usable(id, hasStartCooldown)),
		stacks: start.stacks.flatMap(({ id, count }) => {
			const max = byId.get(id)?.stacks?.max
			return usable(id, isStartStackEffect) && max
				? [{ id, count: Math.min(count, max) }]
				: []
		}),
		running: start.running.filter((id) => usable(id, isStartRunningEffect)),
	}
}

/**
 * The `start` value without the effects the build no longer has (Conqueror swapped for
 * Electrocute), each count at most its cap; as given while the effects load.
 */
export function dropUnusedComboStart(
	value: string | undefined,
	effects: readonly BuildEffect[] | undefined,
): string | undefined {
	if (!effects) return value
	return serializeComboStart(keepUsableStart(readComboStart(value), effects))
}
