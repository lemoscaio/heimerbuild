import { fetchItems } from "../../../services/gameData"
import { usePatchQuery } from "../usePatchQuery"

export function useGetItems() {
	return usePatchQuery(["items"], fetchItems)
}
