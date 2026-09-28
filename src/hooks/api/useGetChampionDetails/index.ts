import { fetchChampion } from "../../../services/gameData"
import { usePatchQuery } from "../usePatchQuery"

export function useGetChampionDetails(championKey: string | undefined) {
	return usePatchQuery(
		["champion", championKey ?? ""],
		(patch) => fetchChampion(patch, championKey ?? ""),
		{ enabled: championKey !== undefined },
	)
}
