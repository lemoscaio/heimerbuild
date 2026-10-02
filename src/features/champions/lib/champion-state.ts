import type { Champion } from "@schemas/champion"
import { formChanges, selectedForm } from "@/lib/stats/champion-forms"

/** The champion's state in a build: the level, and the form as the `form` value (absent: default). */
export type ChampionStateValue = { level: number; form: string | undefined }

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
