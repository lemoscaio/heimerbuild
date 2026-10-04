import type { Champion } from "@schemas/champion"
import { FULL_HEALTH } from "@/lib/effects/current-health"
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
 * The level, the selected form with the checked `form` value (only a form other than the default)
 * and the current health. Until the champion loads, the form value stays as given so an edit
 * elsewhere in the build does not drop it.
 */
export function readChampionState(
	champion: Pick<Champion, "forms"> | undefined,
	{ level, form, currentHealth = FULL_HEALTH }: ChampionStateValue,
) {
	if (!champion)
		return { level, form: undefined, formValue: form, currentHealth }
	return {
		level,
		form: selectedForm(champion.forms, form),
		formValue: formChanges(champion.forms, form)?.id,
		currentHealth,
	}
}
