import { type QueryClient, queryOptions } from "@tanstack/react-query"
import {
	fetchChampion,
	fetchChampionIndex,
	fetchItems,
	fetchManifest,
	fetchRunes,
	fetchSummonerSpells,
	GameDataUnavailableError,
} from "../services/game-data"

// A missing file will not appear on retry; other failures (network) may.
function retryUnlessUnavailable(failureCount: number, error: Error) {
	return !(error instanceof GameDataUnavailableError) && failureCount < 3
}

// Patch files are versioned by content hash; the manifest is read once per session.
const gameDataDefaults = {
	staleTime: Number.POSITIVE_INFINITY,
	retry: retryUnlessUnavailable,
}

async function dataFileHashes(client: QueryClient) {
	const { files } = await client.ensureQueryData(gameDataQueries.manifest())
	return files
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
			queryFn: async ({ client }) =>
				fetchChampionIndex(patch, await dataFileHashes(client)),
			...gameDataDefaults,
		}),
	champion: (patch: string, key: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "champions", key],
			queryFn: async ({ client }) =>
				fetchChampion(patch, key, await dataFileHashes(client)),
			...gameDataDefaults,
		}),
	items: (patch: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "items"],
			queryFn: async ({ client }) =>
				fetchItems(patch, await dataFileHashes(client)),
			...gameDataDefaults,
		}),
	runes: (patch: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "runes"],
			queryFn: async ({ client }) =>
				fetchRunes(patch, await dataFileHashes(client)),
			...gameDataDefaults,
		}),
	summonerSpells: (patch: string) =>
		queryOptions({
			queryKey: [...gameDataQueries.patch(patch), "summoner-spells"],
			queryFn: async ({ client }) =>
				fetchSummonerSpells(patch, await dataFileHashes(client)),
			...gameDataDefaults,
		}),
}
