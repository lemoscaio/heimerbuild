import { fetchChampion } from "../../services/game-data"
import { usePatchQuery } from "./use-patch-query"

export function useGetChampionDetails(championKey: string | undefined) {
	return usePatchQuery(
		["champion", championKey ?? ""],
		(patch) => fetchChampion(patch, championKey ?? ""),
		{ enabled: championKey !== undefined },
	)
}
