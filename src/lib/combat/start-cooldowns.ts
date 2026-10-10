import type { BuildEffect } from "../effects/effect"
import { isInForm, resolveAmount } from "../effects/evaluate"

// Shorter is back before a fight's first trade (owner, PR 442): Aery's 2.45 s goes, Grasp's 4 s stays.
export const MIN_START_COOLDOWN_SECONDS = 3

/**
 * An effect whose cooldown the combo's start sets: one with a `cooldown` of at least
 * `MIN_START_COOLDOWN_SECONDS` at the champion's level that isn't periodic (a periodic one, Valor or
 * Short Fuse, keeps its start marker). Kraken Slayer's third hit has none; a spellblade's is too short.
 */
export function hasStartCooldown(effect: BuildEffect, level: number): boolean {
	const { cooldown, trigger } = effect.effect
	if (cooldown === undefined || trigger.kind === "periodic") return false
	const seconds = resolveAmount(cooldown, effect, { level })
	return seconds === undefined || seconds >= MIN_START_COOLDOWN_SECONDS
}

/** The build's effects with a start cooldown in the champion's form, once each: the "Combo start" chips. */
export function startCooldownEffects(
	effects: readonly BuildEffect[],
	form: string | undefined,
	level: number,
): BuildEffect[] {
	const seen = new Set<string>()
	return effects.filter((effect) => {
		if (seen.has(effect.id)) return false
		seen.add(effect.id)
		return hasStartCooldown(effect, level) && isInForm(effect, form)
	})
}
