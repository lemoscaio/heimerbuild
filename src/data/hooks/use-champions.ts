import { fetchChampionIndex } from "../services/game-data"
import { usePatchQuery } from "./use-patch-query"

export function useChampions() {
	return usePatchQuery(["champions"], fetchChampionIndex)
}
