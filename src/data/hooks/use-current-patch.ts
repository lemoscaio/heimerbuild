import { useQuery } from "@tanstack/react-query"
import { gameDataQueries } from "../queries/game-data-queries"

export function useCurrentPatch() {
	return useQuery({
		...gameDataQueries.manifest(),
		select: (manifest) => manifest.currentPatch,
	})
}
