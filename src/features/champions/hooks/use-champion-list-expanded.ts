import { useState } from "react"
import {
	readChampionListExpanded,
	saveChampionListExpanded,
} from "../services/champion-list-storage"

/** Whether the home page shows the full champion list, remembered between visits. */
export function useChampionListExpanded() {
	const [expanded, setExpandedState] = useState(() =>
		readChampionListExpanded(),
	)

	function setExpanded(next: boolean) {
		setExpandedState(next)
		saveChampionListExpanded(next)
	}

	return [expanded, setExpanded] as const
}
