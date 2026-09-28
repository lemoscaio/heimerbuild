import type { z } from "zod"
import {
	championIndexSchema,
	championSchema,
} from "../../../scripts/sync-data/schemas/champion"
import {
	type Item,
	type ItemsFile,
	ItemsFileSchema,
} from "../../../scripts/sync-data/schemas/item"
import { dataManifestSchema } from "../../../scripts/sync-data/schemas/manifest"

const DDRAGON_CDN = "https://ddragon.leagueoflegends.com/cdn"

export class GameDataUnavailableError extends Error {
	constructor(
		readonly path: string,
		reason: string,
	) {
		super(`Game data ${path} is not available (${reason})`)
		this.name = "GameDataUnavailableError"
	}
}

export type FetchGameDataOptions = { fetchFn?: typeof fetch }

export async function fetchGameData<T>(
	path: string,
	schema: z.ZodType<T>,
	{ fetchFn = fetch }: FetchGameDataOptions = {},
): Promise<T> {
	const response = await fetchFn(path)
	if (!response.ok) {
		throw new GameDataUnavailableError(path, `HTTP ${response.status}`)
	}
	// Without a data file, the SPA fallback answers with index.html and a 200.
	if (!response.headers.get("content-type")?.includes("application/json")) {
		throw new GameDataUnavailableError(path, "response is not JSON")
	}
	return schema.parse(await response.json())
}

export function fetchManifest() {
	return fetchGameData("/data/manifest.json", dataManifestSchema)
}

export function fetchChampionIndex(patch: string) {
	return fetchGameData(`/data/${patch}/champions.json`, championIndexSchema)
}

export function fetchChampion(patch: string, key: string) {
	return fetchGameData(
		`/data/${patch}/champions/${encodeURIComponent(key)}.json`,
		championSchema,
	)
}

export type ItemsById = Record<string, Item>

/** Keys items by id and turns `icon` into a full Data Dragon URL, like champion icons. */
export function toItemsById({ version, items }: ItemsFile): ItemsById {
	return Object.fromEntries(
		items.map((item) => [
			item.id,
			{ ...item, icon: `${DDRAGON_CDN}/${version}/img/item/${item.icon}` },
		]),
	)
}

export async function fetchItems(patch: string): Promise<ItemsById> {
	return toItemsById(
		await fetchGameData(`/data/${patch}/items.json`, ItemsFileSchema),
	)
}
