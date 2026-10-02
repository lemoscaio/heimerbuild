import type { Champion } from "@schemas/champion"
import { track } from "@/lib/analytics/analytics"
import { formChanges } from "@/lib/stats/champion-forms"
import {
	type ChampionStateValue,
	readChampionState,
} from "../lib/champion-state"

type UseChampionStateOptions = {
	champion: Pick<Champion, "key" | "forms"> | undefined
	value: ChampionStateValue
	onChange: (change: Partial<ChampionStateValue>) => void
}

export type ChampionState = ReturnType<typeof useChampionState>

/** The champion's level and form in a build, controlled by `value`. */
export function useChampionState({
	champion,
	value,
	onChange,
}: UseChampionStateOptions) {
	const { level, form, formValue } = readChampionState(champion, value)

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
	}
}
