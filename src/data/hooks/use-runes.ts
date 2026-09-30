import { useQuery } from "@tanstack/react-query"
import { gameDataQueries } from "../queries/game-data-queries"

export function useRunes(patch: string | undefined) {
	return useQuery({
		...gameDataQueries.runes(patch ?? ""),
		enabled: patch !== undefined,
	})
}
