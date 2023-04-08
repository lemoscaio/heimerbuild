import { useFetch } from "../../../lib/reactQuery/useFetch"
import { Build } from "../../../types/builds"

export function useGetSavedBuilds() {
	return useFetch<Build[]>("/builds", undefined, { refetchOnMount: true })
}
