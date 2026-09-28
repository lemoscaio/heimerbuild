import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, rename, rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import {
	CACHE_LAYOUT,
	downloadRawData,
	MANIFEST_FILE,
	type RawDataManifest,
} from "./download"
import { writeChampions } from "./normalize-champions"
import { syncItems } from "./normalize-items"
import {
	assertValidVersion,
	compareVersions,
	resolveLatestVersion,
} from "./version"

const CACHE_ROOT = resolve(import.meta.dir, "../../.cache")
const OUTPUT_ROOT = resolve(import.meta.dir, "../../public/data")

const USAGE = `Usage: bun run sync-data [--version <x.y.z>] [--offline]

  --version <x.y.z>  Use this Data Dragon version instead of the latest one
  --offline          Use the newest fully cached version; never touch the network`

function formatBytes(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function summarize(manifest: RawDataManifest): string {
	const files = Object.values(manifest.files)
	const bytes = files.reduce((sum, file) => sum + file.bytes, 0)
	return `${files.length} files, ${formatBytes(bytes)}, CommunityDragon ${manifest.communityDragonPatch}`
}

/** A version directory only exists once its download fully succeeded (tmp dir + rename). */
async function readCachedManifest(
	version: string,
): Promise<RawDataManifest | undefined> {
	const path = join(CACHE_ROOT, version, MANIFEST_FILE)
	if (!existsSync(path)) return undefined
	const manifest = JSON.parse(await readFile(path, "utf8")) as RawDataManifest
	return manifest.layout === CACHE_LAYOUT ? manifest : undefined
}

async function newestCachedVersion(): Promise<string | undefined> {
	if (!existsSync(CACHE_ROOT)) return undefined
	const entries = await readdir(CACHE_ROOT)
	const versions = entries.filter(
		(entry) =>
			/^\d+\.\d+\.\d+$/.test(entry) &&
			existsSync(join(CACHE_ROOT, entry, MANIFEST_FILE)),
	)
	return versions.sort(compareVersions).at(-1)
}

async function resolveVersion(options: {
	version?: string
	offline?: boolean
}): Promise<string> {
	if (options.version) {
		assertValidVersion(options.version)
		return options.version
	}
	if (options.offline) {
		const cached = await newestCachedVersion()
		if (!cached)
			throw new Error(`--offline: no cached version in ${CACHE_ROOT}`)
		return cached
	}
	return resolveLatestVersion()
}

/** Ensures `.cache/<version>` holds every raw input, downloading it when missing or stale. */
async function ensureRawData(
	version: string,
	{ offline = false }: { offline?: boolean } = {},
): Promise<void> {
	const startedAt = performance.now()
	const cached = await readCachedManifest(version)
	if (cached) {
		console.log(
			`Cache hit: .cache/${version} (${summarize(cached)}), no download needed`,
		)
		return
	}
	if (offline) {
		throw new Error(
			`--offline: version ${version} is not cached (or cached in an older layout)`,
		)
	}

	const target = join(CACHE_ROOT, version)
	const tmp = join(CACHE_ROOT, `.tmp-${version}-${process.pid}`)
	await rm(tmp, { recursive: true, force: true })
	await mkdir(tmp, { recursive: true })

	try {
		let count = 0
		const manifest = await downloadRawData(version, tmp, {
			onFile: () => {
				count++
				if (count % 25 === 0) console.log(`  downloaded ${count} files`)
			},
		})
		// A cache from an older layout is replaced whole.
		await rm(target, { recursive: true, force: true })
		await rename(tmp, target)
		const seconds = ((performance.now() - startedAt) / 1000).toFixed(1)
		console.log(
			`Downloaded .cache/${version} (${summarize(manifest)}) in ${seconds}s`,
		)
	} finally {
		await rm(tmp, { recursive: true, force: true })
	}
}

async function writeOutputs(version: string): Promise<void> {
	const cacheDir = join(CACHE_ROOT, version)
	const outDir = join(OUTPUT_ROOT, version)

	const startedAt = performance.now()
	const champions = await writeChampions(cacheDir, outDir, version)
	console.log(
		`Wrote public/data/${version}: ${champions.champions} champions, index ${(champions.indexBytes / 1024).toFixed(1)} KB, ${formatBytes(champions.totalBytes)} total in ${Math.round(performance.now() - startedAt)}ms`,
	)

	const items = await syncItems({ cacheDir, outDir })
	console.log(
		`Wrote public/data/${version}/items.json (${items.count} items, ${formatBytes(items.bytes)})`,
	)
}

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			version: { type: "string" },
			offline: { type: "boolean", default: false },
			help: { type: "boolean", default: false },
		},
	})
	if (values.help) {
		console.log(USAGE)
		return
	}

	const version = await resolveVersion(values)
	console.log(`Data Dragon version: ${version}`)
	await ensureRawData(version, { offline: values.offline })
	await writeOutputs(version)
}

main().catch((error: unknown) => {
	console.error(
		`sync-data failed: ${error instanceof Error ? error.message : String(error)}`,
	)
	process.exit(1)
})
