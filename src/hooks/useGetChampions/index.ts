import { useFetch } from "../../lib/reactQuery/useFetch"
import { Champions } from "../../types/champions"

export function useGetChampions() {
	return useFetch<Champions>("/champions")
}
