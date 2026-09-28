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
import {
	type DataManifest,
	dataManifestSchema,
} from "../../../scripts/sync-data/schemas/manifest"

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

export type DataFileHashes = DataManifest["files"]

/**
 * `/data/<segments>?v=<content hash>`: a fixed file gets a new URL, so the one-year
 * immutable cache never serves the old one. Files missing from the manifest keep a plain URL.
 */
export function dataFileUrl(
	segments: readonly string[],
	files: DataFileHashes,
): string {
	const url = `/data/${segments.map(encodeURIComponent).join("/")}`
	const hash = files[segments.join("/")]
	return hash ? `${url}?v=${hash}` : url
}

export function fetchChampionIndex(patch: string, files: DataFileHashes) {
	return fetchGameData(
		dataFileUrl([patch, "champions.json"], files),
		championIndexSchema,
	)
}

export function fetchChampion(
	patch: string,
	key: string,
	files: DataFileHashes,
) {
	return fetchGameData(
		dataFileUrl([patch, "champions", `${key}.json`], files),
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

export async function fetchItems(
	patch: string,
	files: DataFileHashes,
): Promise<ItemsById> {
	return toItemsById(
		await fetchGameData(
			dataFileUrl([patch, "items.json"], files),
			ItemsFileSchema,
		),
	)
}
