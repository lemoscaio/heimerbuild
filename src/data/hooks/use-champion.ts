import { fetchChampion } from "../services/game-data"
import { usePatchQuery } from "./use-patch-query"

export function useChampion(championKey: string | undefined) {
	return usePatchQuery(
		["champion", championKey ?? ""],
		(patch) => fetchChampion(patch, championKey ?? ""),
		{ enabled: championKey !== undefined },
	)
}
