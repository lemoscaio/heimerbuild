import { fetchItems } from "../../services/game-data"
import { usePatchQuery } from "./use-patch-query"

export function useGetItems() {
	return usePatchQuery(["items"], fetchItems)
}
