import { useState } from "react"
import { type StatsRowsInput, statsRows } from "../lib/stats-rows"
import { useShowSources } from "./use-show-sources"

/**
 * The Stats panel: its rows, plus the view around them: the "Show sources" switch (kept per
 * browser) and the form comparison switch (off on each visit).
 */
export function useStatsPanel(input: StatsRowsInput) {
	const [showSources, setShowSources] = useShowSources()
	const [compare, setCompare] = useState(false)
	const { formComparison } = input

	return {
		groups: statsRows(input),
		showSources,
		setShowSources,
		compare,
		setCompare,
		/** The form the rows are compared with while the switch is on. */
		comparedName: compare ? formComparison?.comparedName : undefined,
	}
}
