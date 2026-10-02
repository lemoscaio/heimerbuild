import { championIndexSchema, championSchema } from "@schemas/champion"
import { type Item, type ItemsFile, ItemsFileSchema } from "@schemas/item"
import { type DataManifest, dataManifestSchema } from "@schemas/manifest"
import { type RunesFile, runesFileSchema } from "@schemas/rune"
import { summonerSpellsFileSchema } from "@schemas/summoner-spell"
import type * as z from "zod/mini"

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

type FetchGameDataOptions = { fetchFn?: typeof fetch }

export async function fetchGameData<T>(
	path: string,
	schema: z.ZodMiniType<T>,
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

type ItemsById = Record<string, Item>

export function toItemsById({ items }: ItemsFile): ItemsById {
	return Object.fromEntries(items.map((item) => [item.id, item]))
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

/** Rune icons live outside the patch folders of Data Dragon. */
const DDRAGON_RUNE_IMAGES = `${DDRAGON_CDN}/img`

/** Turns every rune and shard `icon` path into a full Data Dragon URL. */
export function withRuneIconUrls(file: RunesFile): RunesFile {
	const url = (icon: string) => `${DDRAGON_RUNE_IMAGES}/${icon}`
	const withUrl = <T extends { icon: string }>(entry: T): T => ({
		...entry,
		icon: url(entry.icon),
	})
	return {
		...file,
		trees: file.trees.map((tree) => ({
			...withUrl(tree),
			keystones: tree.keystones.map(withUrl),
			rows: tree.rows.map((row) => row.map(withUrl)),
		})),
		shards: file.shards.map(withUrl),
	}
}

export async function fetchRunes(
	patch: string,
	files: DataFileHashes,
): Promise<RunesFile> {
	return withRuneIconUrls(
		await fetchGameData(
			dataFileUrl([patch, "runes.json"], files),
			runesFileSchema,
		),
	)
}

export function fetchSummonerSpells(patch: string, files: DataFileHashes) {
	return fetchGameData(
		dataFileUrl([patch, "summoner-spells.json"], files),
		summonerSpellsFileSchema,
	)
}
