import { useFetch } from "../../../lib/reactQuery/useFetch"
import { Items } from "../../../types/items"

export function useGetItems() {
	return useFetch<Items>("/items")
}
