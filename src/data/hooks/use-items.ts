import { fetchItems } from "../services/game-data"
import { usePatchQuery } from "./use-patch-query"

export function useItems() {
	return usePatchQuery(["items"], fetchItems)
}
