import { useFetch } from "../../../lib/reactQuery/useFetch"
import { Champion } from "../../../types/champion"

export function useGetChampionDetails(championKey: string | undefined) {
	return useFetch<Champion>(championKey ? "/champions/" + championKey : null)
}
