import { useQuery } from "@tanstack/react-query"
import { gameDataQueries } from "../queries/game-data-queries"

export function useChampions(patch: string | undefined) {
	return useQuery({
		...gameDataQueries.champions(patch ?? ""),
		enabled: patch !== undefined,
	})
}
