import { useState } from "react"
import {
	type FormComparison,
	statDeltas,
} from "@/features/build-calculator/lib/diff-stats"
import { formLocks } from "@/features/build-calculator/lib/form-locks"
import { comparedForm } from "@/lib/stats/champion-forms"
import type { ChampionBuild } from "./use-champion-build"

type FormSwitchBuild = Pick<
	ChampionBuild,
	"champion" | "championState" | "skills" | "stats" | "whatIf"
>

/**
 * The form selector on the build page: the selected form's stats against the compared form
 * (the delta chips), the forms the skill points do not unlock yet with why, and a screen-reader
 * message after each switch saying how many stats changed.
 */
export function useFormSwitch({
	champion,
	championState,
	skills,
	stats,
	whatIf,
}: FormSwitchBuild) {
	const [announcement, setAnnouncement] = useState("")
	const forms = champion?.forms
	const locks = formLocks(forms, skills.ranks)
	const { form } = championState
	// A form the points do not unlock has nothing to compare: its stats are the default's.
	const comparable = comparedForm(forms, form?.id)
	const compared = comparable && !locks[comparable.id] ? comparable : undefined
	const comparedStats = compared && whatIf({ form: compared.id })
	const comparison: FormComparison | undefined =
		form && compared && stats && comparedStats
			? {
					formName: form.name,
					comparedName: compared.name,
					comparedFirst: compared.id === forms?.[0]?.id,
					deltas: statDeltas(stats, comparedStats),
				}
			: undefined

	function setForm(formId: string) {
		const next = forms?.find(({ id }) => id === formId)
		const nextStats = whatIf({ form: formId })
		if (
			!next ||
			!stats ||
			!nextStats ||
			next.id === form?.id ||
			locks[formId]
		) {
			return
		}
		const changed = Object.keys(statDeltas(nextStats, stats)).length
		setAnnouncement(
			`Switched to ${next.name}: ${changed} ${changed === 1 ? "stat" : "stats"} changed`,
		)
		championState.setForm(formId)
	}

	return {
		/** The selected form against the compared one; undefined for a champion without forms. */
		comparison,
		/** The last switch for screen readers: the new form and how many stats changed. */
		announcement,
		/** Why each form the skill points do not unlock yet cannot be picked, by form id. */
		locks,
		setForm,
	}
}
