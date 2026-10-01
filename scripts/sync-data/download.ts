import { mkdir, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fetchWithRetry, HttpError, mapWithConcurrency } from "./http"
import { toCommunityDragonPatch } from "./version"

export const DDRAGON_BASE = "https://ddragon.leagueoflegends.com/cdn"
const CDRAGON_BASE = "https://raw.communitydragon.org"
const CDRAGON_ITEMS_PATH = "game/items.cdtb.bin.json"
// Client data (stat shards): plain JSON, unlike the game bins.
const CDRAGON_CLIENT_DATA_PATH =
	"plugins/rcp-be-lol-game-data/global/default/v1"

export const MANIFEST_FILE = "manifest.json"
/** Bump when the set of cached files changes, so older caches are re-downloaded. */
export const CACHE_LAYOUT = 4

export type DownloadOptions = {
	fetchFn?: typeof fetch
	concurrency?: number
	onFile?: (relativePath: string, bytes: number) => void
}

export type RawDataManifest = {
	layout: number
	version: string
	communityDragonPatch: string
	communityDragonFallback: boolean
	downloadedAt: string
	files: Record<string, { url: string; bytes: number }>
}

type FetchedJson = { text: string; json: unknown }

/** Parses before returning so a truncated body or an HTML error page fails the sync. */
async function fetchJson(
	url: string,
	fetchFn: typeof fetch,
): Promise<FetchedJson> {
	const response = await fetchWithRetry(url, { fetchFn })
	const text = await response.text()
	try {
		return { text, json: JSON.parse(text) }
	} catch {
		throw new Error(`Invalid JSON from ${url}`)
	}
}

export async function fetchCommunityDragonItems(
	version: string,
	fetchFn: typeof fetch = fetch,
): Promise<FetchedJson & { url: string; patch: string; fallback: boolean }> {
	const patch = toCommunityDragonPatch(version)
	const url = `${CDRAGON_BASE}/${patch}/${CDRAGON_ITEMS_PATH}`
	try {
		return { ...(await fetchJson(url, fetchFn)), url, patch, fallback: false }
	} catch (error) {
		if (!(error instanceof HttpError && error.status === 404)) throw error
	}

	const latestUrl = `${CDRAGON_BASE}/latest/${CDRAGON_ITEMS_PATH}`
	console.warn(
		`  CommunityDragon has no ${patch} folder yet, falling back to ${latestUrl}`,
	)
	return {
		...(await fetchJson(latestUrl, fetchFn)),
		url: latestUrl,
		patch: "latest",
		fallback: true,
	}
}

function championIds(championList: unknown): string[] {
	const data = (championList as { data?: Record<string, { id?: unknown }> })
		?.data
	if (!data || typeof data !== "object") {
		throw new Error("champion.json has no `data` object")
	}
	const ids = Object.values(data).map((champion) => champion.id)
	if (
		ids.length === 0 ||
		ids.some((id) => typeof id !== "string" || !/^\w+$/.test(id))
	) {
		throw new Error("champion.json has missing or malformed champion ids")
	}
	return ids as string[]
}

/** Downloads every raw input for `version` into `dir` and writes the manifest last. */
export async function downloadRawData(
	version: string,
	dir: string,
	{ fetchFn = fetch, concurrency = 8, onFile }: DownloadOptions = {},
): Promise<RawDataManifest> {
	const ddragon = `${DDRAGON_BASE}/${version}/data/en_US`
	const files: RawDataManifest["files"] = {}

	const save = async (relativePath: string, url: string, text: string) => {
		const path = join(dir, relativePath)
		await mkdir(dirname(path), { recursive: true })
		await writeFile(path, text)
		const bytes = Buffer.byteLength(text)
		files[relativePath] = { url, bytes }
		onFile?.(relativePath, bytes)
	}

	const download = async (relativePath: string, url: string) => {
		const { text, json } = await fetchJson(url, fetchFn)
		await save(relativePath, url, text)
		return json
	}

	const [championList, , , communityDragonItems] = await Promise.all([
		download("ddragon/champion.json", `${ddragon}/champion.json`),
		download("ddragon/item.json", `${ddragon}/item.json`),
		download("ddragon/runesReforged.json", `${ddragon}/runesReforged.json`),
		fetchCommunityDragonItems(version, fetchFn),
	])
	await save(
		"cdragon/items.cdtb.bin.json",
		communityDragonItems.url,
		communityDragonItems.text,
	)

	const cdragonGame = `${CDRAGON_BASE}/${communityDragonItems.patch}/game`
	const perChampion = championIds(championList).flatMap((id) => {
		const name = id.toLowerCase()
		return [
			[`ddragon/champion/${id}.json`, `${ddragon}/champion/${id}.json`],
			[
				`cdragon/characters/${id}.bin.json`,
				`${cdragonGame}/data/characters/${name}/${name}.bin.json`,
			],
		] as const
	})
	const cdragonClientData = `${CDRAGON_BASE}/${communityDragonItems.patch}/${CDRAGON_CLIENT_DATA_PATH}`
	const cdragonFiles = [
		...perChampion,
		[
			"cdragon/map11.bin.json",
			`${cdragonGame}/data/maps/shipping/map11/map11.bin.json`,
		],
		["cdragon/perks.json", `${cdragonClientData}/perks.json`],
		["cdragon/perkstyles.json", `${cdragonClientData}/perkstyles.json`],
	] as const
	await mapWithConcurrency(cdragonFiles, concurrency, ([path, url]) =>
		download(path, url),
	)

	const manifest: RawDataManifest = {
		layout: CACHE_LAYOUT,
		version,
		communityDragonPatch: communityDragonItems.patch,
		communityDragonFallback: communityDragonItems.fallback,
		downloadedAt: new Date().toISOString(),
		files: Object.fromEntries(
			Object.entries(files).sort(([a], [b]) => a.localeCompare(b)),
		),
	}
	await writeFile(
		join(dir, MANIFEST_FILE),
		`${JSON.stringify(manifest, null, "\t")}\n`,
	)
	return manifest
}
