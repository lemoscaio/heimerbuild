import { useQuery } from "@tanstack/react-query"
import { gameDataQueries } from "../queries/game-data-queries"

export function useChampion(
	patch: string | undefined,
	championKey: string | undefined,
) {
	return useQuery({
		...gameDataQueries.champion(patch ?? "", championKey ?? ""),
		enabled: patch !== undefined && championKey !== undefined,
	})
}
