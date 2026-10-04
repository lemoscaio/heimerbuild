import type { Champion } from "@schemas/champion"
import { track } from "@/lib/analytics/analytics"
import { formChanges, isFormUnlocked } from "@/lib/stats/champion-forms"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import {
	type ChampionStateValue,
	readChampionState,
} from "../lib/champion-state"

type UseChampionStateOptions = {
	champion: Pick<Champion, "key" | "forms"> | undefined
	/** The abilities' ranks, which unlock the forms that need a point; undefined while they load. */
	ranks: AbilityRanks | undefined
	value: ChampionStateValue
	onChange: (change: Partial<ChampionStateValue>) => void
}

export type ChampionState = ReturnType<typeof useChampionState>

/** The champion's level, form and current health in a build, controlled by `value`. */
export function useChampionState({
	champion,
	ranks,
	value,
	onChange,
}: UseChampionStateOptions) {
	const { level, form, formValue, currentHealth } = readChampionState(
		champion,
		value,
		{ ranks },
	)

	function setForm(formId: string) {
		const next = champion?.forms?.find(({ id }) => id === formId)
		if (!champion || !next || next === form || !isFormUnlocked(next, ranks)) {
			return
		}
		onChange({ form: formChanges(champion.forms, formId, { ranks })?.id })
		track("champion_form_changed", { champion: champion.key, form: formId })
	}

	return {
		level,
		setLevel: (nextLevel: number) => onChange({ level: nextLevel }),
		/** The selected form, the default one unless the value names another it unlocks; undefined without forms. */
		form,
		/** The checked `form` value: a form other than the default; the given one while loading. */
		formValue,
		setForm,
		/** Percent of maximum health the effects read, 1 to 100. */
		currentHealth,
		setCurrentHealth: (nextHealth: number) =>
			onChange({ currentHealth: nextHealth }),
	}
}
