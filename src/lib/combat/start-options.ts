import type { BuildEffect } from "../effects/effect"
import { isInForm } from "../effects/evaluate"

/**
 * The starting situations the build supports: its effects that declare a `start` (Harrier's mark,
 * Short Fuse ready) and hold in the champion's form. Their ids are what `CombatInput.start` takes.
 */
export function combatStartOptions(
	effects: readonly BuildEffect[],
	form: string | undefined,
): BuildEffect[] {
	return effects.filter(
		(effect) => effect.effect.start !== undefined && isInForm(effect, form),
	)
}
