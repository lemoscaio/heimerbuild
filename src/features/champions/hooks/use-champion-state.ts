import type { Champion } from "@schemas/champion"
import { track } from "@/lib/analytics/analytics"
import { FULL_HEALTH } from "@/lib/effects/current-health"
import type { BuildEffect } from "@/lib/effects/effect"
import { formChanges } from "@/lib/stats/champion-forms"
import {
	type ChampionStateValue,
	currentHealthValue,
	readChampionState,
	readCurrentHealth,
} from "../lib/champion-state"

type UseChampionStateOptions = {
	champion: Pick<Champion, "key" | "forms"> | undefined
	/** The effects that may read the current health (`availableEffects`); undefined while they load. */
	effects: readonly BuildEffect[] | undefined
	value: ChampionStateValue
	onChange: (change: Partial<ChampionStateValue>) => void
}

export type ChampionState = ReturnType<typeof useChampionState>

/** The champion's level, form and current health in a build, controlled by `value`. */
export function useChampionState({
	champion,
	effects,
	value,
	onChange,
}: UseChampionStateOptions) {
	const { level, form, formValue } = readChampionState(champion, value)
	const checkedHealth = readCurrentHealth(value.currentHealth, effects)

	function setForm(formId: string) {
		if (!champion || formId === form?.id) return
		onChange({ form: formChanges(champion.forms, formId)?.id })
		track("champion_form_changed", { champion: champion.key, form: formId })
	}

	return {
		level,
		setLevel: (nextLevel: number) => onChange({ level: nextLevel }),
		/** The selected form, the default one unless the value names another; undefined without forms. */
		form,
		/** The checked `form` value: a form other than the default; the given one while loading. */
		formValue,
		setForm,
		/** Percent of maximum health the effects read, 1 to 100. */
		currentHealth: checkedHealth ?? FULL_HEALTH,
		/** The checked `currentHealth` value; the given one while the effects load. */
		currentHealthValue: checkedHealth,
		setCurrentHealth: (currentHealth: number) =>
			onChange({ currentHealth: currentHealthValue(currentHealth) }),
	}
}
