import type { Champion, ChampionForm } from "@schemas/champion"

export type FormOptions = {
	/** The selected form's id; absent or unknown means the default form. */
	form?: string
}

/** The form `formId` names, else the default (first) one; undefined for a champion without forms. */
export function selectedForm(
	forms: Champion["forms"],
	formId: string | undefined,
): ChampionForm | undefined {
	return forms?.find(({ id }) => id === formId) ?? forms?.[0]
}

/** The selected form when it is not the default: the only case that changes the champion's data. */
export function formChanges(
	forms: Champion["forms"],
	formId: string | undefined,
): ChampionForm | undefined {
	const form = selectedForm(forms, formId)
	return form === forms?.[0] ? undefined : form
}

/** What the selected form is compared with: the default form, or the next one while on the default. */
export function comparedForm(
	forms: Champion["forms"],
	formId: string | undefined,
): ChampionForm | undefined {
	return formChanges(forms, formId) ? forms?.[0] : forms?.[1]
}

/** The champion's stats and level states in the selected form, before the level applies. */
export function formStats(
	champion: Pick<Champion, "stats" | "levelStates" | "forms">,
	{ form }: FormOptions = {},
): Pick<Champion, "stats" | "levelStates"> {
	const changes = formChanges(champion.forms, form)
	if (!changes) return champion
	return {
		stats: { ...champion.stats, ...changes.stats },
		levelStates: changes.levelStates,
	}
}
