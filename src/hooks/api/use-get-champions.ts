import { fetchChampionIndex } from "../../services/game-data"
import { usePatchQuery } from "./use-patch-query"

export function useGetChampions() {
	return usePatchQuery(["champions"], fetchChampionIndex)
}
