import { useLocation, useRouter } from "@tanstack/react-router"
import { useState } from "react"
import type { BuildValues } from "@/features/build-calculator/types/build-source"
import {
	type ChampionSwitchSummary,
	switchChampionValues,
} from "../lib/champion-switch"
import type { UrlBuildSource } from "./use-url-build-source"

declare module "@tanstack/history" {
	interface HistoryState {
		/** On the history entry a champion switch opened: what it kept and reset. */
		championSwitch?: ChampionSwitchSummary
	}
}

type UseChampionSwitchOptions = {
	/** The build's checked values, which the switch carries to the new champion. */
	values: BuildValues
	source: Pick<UrlBuildSource, "switchChampion">
}

/**
 * Switches the build to another champion (a new history entry, so Back returns) and gives the
 * notice of the switch that opened the current entry: any later edit makes a new entry without it.
 */
export function useChampionSwitch({
	values,
	source,
}: UseChampionSwitchOptions) {
	const router = useRouter()
	const { state } = useLocation()
	const entryKey = state.__TSR_key ?? state.key
	const [dismissedEntry, setDismissedEntry] = useState<string>()

	return {
		switchTo(championKey: string) {
			const next = switchChampionValues(values)
			source.switchChampion(championKey, next.values, next.summary)
		},
		/** What the switch that opened this page kept and reset, until dismissed. */
		notice:
			entryKey !== undefined && entryKey === dismissedEntry
				? undefined
				: state.championSwitch,
		/** Returns to the previous champion's link, the entry before the switch. */
		undo: () => router.history.back(),
		dismiss: () => setDismissedEntry(entryKey),
	}
}

export type ChampionSwitch = ReturnType<typeof useChampionSwitch>
