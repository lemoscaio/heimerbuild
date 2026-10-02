import { useQuery } from "@tanstack/react-query"
import { gameDataQueries } from "../queries/game-data-queries"

export function useSummonerSpells(patch: string | undefined) {
	return useQuery({
		...gameDataQueries.summonerSpells(patch ?? ""),
		enabled: patch !== undefined,
	})
}
