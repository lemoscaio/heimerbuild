import type { BuildEffect, Effect } from "../effects/effect"
import { isInForm } from "../effects/evaluate"
import { readComboStart, serializeComboStart } from "./combo-link"

/**
 * An effect whose cooldown the combo's start sets: one with a `cooldown` that isn't periodic (a
 * periodic one, Valor or Short Fuse, keeps its start marker). Kraken Slayer's third hit has none.
 */
export function hasStartCooldown(effect: Effect): boolean {
	return effect.cooldown !== undefined && effect.trigger.kind !== "periodic"
}

/** The build's effects with a start cooldown in the champion's form, once each: the "Combo start" chips. */
export function startCooldownEffects(
	effects: readonly BuildEffect[],
	form: string | undefined,
): BuildEffect[] {
	const seen = new Set<string>()
	return effects.filter((effect) => {
		if (seen.has(effect.id)) return false
		seen.add(effect.id)
		return hasStartCooldown(effect.effect) && isInForm(effect, form)
	})
}

/**
 * The `start` value without the effects the build no longer has (Electrocute swapped for
 * Conqueror); as given while the effects load.
 */
export function dropUnusedComboStart(
	value: string | undefined,
	effects: readonly BuildEffect[] | undefined,
): string | undefined {
	if (!effects) return value
	const used = new Set(
		effects
			.filter(({ effect }) => hasStartCooldown(effect))
			.map(({ id }) => id),
	)
	return serializeComboStart(readComboStart(value).filter((id) => used.has(id)))
}
