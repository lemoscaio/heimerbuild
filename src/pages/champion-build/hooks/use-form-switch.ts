import { useState } from "react"
import {
	type FormComparison,
	statDeltas,
} from "@/features/build-calculator/lib/diff-stats"
import { comparedForm } from "@/lib/stats/champion-forms"
import type { ChampionBuild } from "./use-champion-build"

type FormSwitchBuild = Pick<
	ChampionBuild,
	"champion" | "championState" | "stats" | "whatIf"
>

/**
 * The form selector on the build page: the selected form's stats against the compared form
 * (the delta chips), and a screen-reader message after each switch saying how many stats changed.
 */
export function useFormSwitch({
	champion,
	championState,
	stats,
	whatIf,
}: FormSwitchBuild) {
	const [announcement, setAnnouncement] = useState("")
	const forms = champion?.forms
	const { form } = championState
	const compared = comparedForm(forms, form?.id)
	const comparedStats = compared && whatIf({ form: compared.id })
	const comparison: FormComparison | undefined =
		form && compared && stats && comparedStats
			? {
					formName: form.name,
					comparedName: compared.name,
					deltas: statDeltas(stats, comparedStats),
				}
			: undefined

	function setForm(formId: string) {
		const next = forms?.find(({ id }) => id === formId)
		const nextStats = whatIf({ form: formId })
		if (!next || !stats || !nextStats || next.id === form?.id) {
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
		setForm,
	}
}
