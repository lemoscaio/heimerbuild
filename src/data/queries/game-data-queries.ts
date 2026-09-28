import { queryOptions } from "@tanstack/react-query"
import {
	fetchChampion,
	fetchChampionIndex,
	fetchItems,
	fetchManifest,
	GameDataUnavailableError,
} from "../services/game-data"

// A missing file will not appear on retry; other failures (network) may.
function retryUnlessUnavailable(failureCount: number, error: Error) {
	return !(error instanceof GameDataUnavailableError) && failureCount < 3
}

// Patch files are immutable; the manifest is read once per session.
const gameDataDefaults = {
	staleTime: Number.POSITIVE_INFINITY,
	retry: retryUnlessUnavailable,
}

export const gameDataQueries = {
	all: () => ["game-data"] as const,
	manifest: () =>
		queryOptions({
			queryKey: [...gameDataQueries.all(), "manifest"],
			queryFn: fetchManifest,
			...gameDataDefaults,
		}),
	patch: (patch: string) => [...gameDataQueries.all(), patch] as const,
	champions: (patch: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "champions"],
			queryFn: () => fetchChampionIndex(patch),
			...gameDataDefaults,
		}),
	champion: (patch: string, key: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "champions", key],
			queryFn: () => fetchChampion(patch, key),
			...gameDataDefaults,
		}),
	items: (patch: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "items"],
			queryFn: () => fetchItems(patch),
			...gameDataDefaults,
		}),
}
