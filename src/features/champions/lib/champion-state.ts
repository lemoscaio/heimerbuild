import type { Champion } from "@schemas/champion"
import { FULL_HEALTH, readsCurrentHealth } from "@/lib/effects/current-health"
import type { BuildEffect } from "@/lib/effects/effect"
import { formChanges, selectedForm } from "@/lib/stats/champion-forms"

/**
 * The champion's state in a build: the level, the form as the `form` value (absent: default) and
 * the current health in percent of maximum health (absent: full).
 */
export type ChampionStateValue = {
	level: number
	form: string | undefined
	currentHealth?: number
}

/**
 * The selected form and the checked `form` value: only a form other than the default. Until the
 * champion loads, the value stays as given so an edit elsewhere in the build does not drop it.
 */
export function readChampionState(
	champion: Pick<Champion, "forms"> | undefined,
	{ level, form }: ChampionStateValue,
) {
	if (!champion) return { level, form: undefined, formValue: form }
	return {
		level,
		form: selectedForm(champion.forms, form),
		formValue: formChanges(champion.forms, form)?.id,
	}
}

/** The current health checked like an effect choice: dropped at full health or when no effect reads it. */
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

/** The value a current health edit saves: full health is no value. */
export function currentHealthValue(currentHealth: number): number | undefined {
	return currentHealth === FULL_HEALTH ? undefined : currentHealth
}
