import type { Champion } from "@schemas/champion"
import { FULL_HEALTH } from "@/lib/effects/current-health"
import { formChanges, selectedForm } from "@/lib/stats/champion-forms"
import type { AbilityRanks } from "@/lib/stats/rank-stats"

/**
 * The champion's state in a build: the level, the form as the `form` value (absent: default) and
 * the current health in percent of maximum health (absent: full).
 */
export type ChampionStateValue = {
	level: number
	form: string | undefined
	currentHealth?: number
}

export type ChampionStateOptions = {
	/** The abilities' ranks a form may require; undefined while they load, so no form is locked yet. */
	ranks?: AbilityRanks
}

/**
 * The level, the selected form with the checked `form` value (only a form other than the default,
 * unlocked by the ranks) and the current health. Until the champion loads, the form value stays as
 * given so an edit elsewhere in the build does not drop it.
 */
export function readChampionState(
	champion: Pick<Champion, "forms"> | undefined,
	{ level, form, currentHealth = FULL_HEALTH }: ChampionStateValue,
	{ ranks }: ChampionStateOptions = {},
) {
	if (!champion)
		return { level, form: undefined, formValue: form, currentHealth }
	return {
		level,
		form: selectedForm(champion.forms, form, { ranks }),
		formValue: formChanges(champion.forms, form, { ranks })?.id,
		currentHealth,
	}
}
