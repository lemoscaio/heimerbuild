import { fetchChampionIndex } from "../../../services/gameData"
import { usePatchQuery } from "../usePatchQuery"

export function useGetChampions() {
	return usePatchQuery(["champions"], fetchChampionIndex)
}
