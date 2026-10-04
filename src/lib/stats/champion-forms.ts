import type { Champion, ChampionForm } from "@schemas/champion"
import type { AbilityRanks } from "./rank-stats"

export type FormOptions = {
	/** The selected form's id; absent or unknown means the default form. */
	form?: string
	/** The abilities' ranks a form may require; absent means the requirements are not checked. */
	ranks?: AbilityRanks
}

/** Whether the ranks give the point the form needs (Shyvana's Dragon form needs R); unknown ranks never lock it. */
export function isFormUnlocked(
	{ requires }: ChampionForm,
	ranks: AbilityRanks | undefined,
): boolean {
	return !requires || !ranks || ranks[requires.slot] >= requires.minRank
}

/**
 * The form `formId` names, else the default (first) one; undefined for a champion without forms.
 * A form whose required rank is missing falls back to the default too.
 */
export function selectedForm(
	forms: Champion["forms"],
	formId: string | undefined,
	{ ranks }: Pick<FormOptions, "ranks"> = {},
): ChampionForm | undefined {
	const form = forms?.find(({ id }) => id === formId)
	return form && isFormUnlocked(form, ranks) ? form : forms?.[0]
}

/** The selected form when it is not the default: the only case that changes the champion's data. */
export function formChanges(
	forms: Champion["forms"],
	formId: string | undefined,
	options: Pick<FormOptions, "ranks"> = {},
): ChampionForm | undefined {
	const form = selectedForm(forms, formId, options)
	return form === forms?.[0] ? undefined : form
}

/** What the selected form is compared with: the default form, or the next one while on the default. */
export function comparedForm(
	forms: Champion["forms"],
	formId: string | undefined,
	options: Pick<FormOptions, "ranks"> = {},
): ChampionForm | undefined {
	return formChanges(forms, formId, options) ? forms?.[0] : forms?.[1]
}

/** The champion's stats and level states in the selected form, before the level applies. */
export function formStats(
	champion: Pick<Champion, "stats" | "levelStates" | "forms">,
	{ form, ranks }: FormOptions = {},
): Pick<Champion, "stats" | "levelStates"> {
	const changes = formChanges(champion.forms, form, { ranks })
	if (!changes) return champion
	return {
		stats: { ...champion.stats, ...changes.stats },
		levelStates: changes.levelStates,
	}
}
