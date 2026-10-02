import { useState } from "react"
import type { Build } from "@/features/build-calculator/hooks/use-build"
import {
	type FormComparison,
	statDeltas,
} from "@/features/build-calculator/lib/diff-stats"
import type { ChampionState } from "@/features/champions/hooks/use-champion-state"
import { comparedForm } from "@/lib/stats/champion-forms"

/**
 * The form selector on the build page: the selected form's stats against the compared form
 * (the delta chips), and a screen-reader message after each switch saying how many stats changed.
 */
type FormSwitchBuild = Pick<Build, "champion" | "stats" | "statsInForm"> &
	Pick<ChampionState, "form" | "setForm">

export function useFormSwitch(build: FormSwitchBuild) {
	const [announcement, setAnnouncement] = useState("")
	const forms = build.champion?.forms
	const compared = comparedForm(forms, build.form?.id)
	const comparedStats = compared && build.statsInForm(compared.id)
	const comparison: FormComparison | undefined =
		build.form && compared && build.stats && comparedStats
			? {
					formName: build.form.name,
					comparedName: compared.name,
					deltas: statDeltas(build.stats, comparedStats),
				}
			: undefined

	function setForm(formId: string) {
		const next = forms?.find(({ id }) => id === formId)
		const nextStats = build.statsInForm(formId)
		if (!next || !build.stats || !nextStats || next.id === build.form?.id) {
			return
		}
		const changed = Object.keys(statDeltas(nextStats, build.stats)).length
		setAnnouncement(
			`Switched to ${next.name}: ${changed} ${changed === 1 ? "stat" : "stats"} changed`,
		)
		build.setForm(formId)
	}

	return {
		/** The selected form against the compared one; undefined for a champion without forms. */
		comparison,
		/** The last switch for screen readers: the new form and how many stats changed. */
		announcement,
		setForm,
	}
}
