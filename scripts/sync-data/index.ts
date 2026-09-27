import { existsSync } from "node:fs"
import { mkdir, readdir, readFile, rename, rm } from "node:fs/promises"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import {
	downloadRawData,
	MANIFEST_FILE,
	type RawDataManifest,
} from "./download"
import {
	assertValidVersion,
	compareVersions,
	resolveLatestVersion,
} from "./version"

const CACHE_ROOT = resolve(import.meta.dir, "../../.cache")

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
	return JSON.parse(await readFile(path, "utf8")) as RawDataManifest
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

	const startedAt = performance.now()
	const version = await resolveVersion(values)
	console.log(`Data Dragon version: ${version}`)

	const cached = await readCachedManifest(version)
	if (cached) {
		console.log(
			`Cache hit: .cache/${version} (${summarize(cached)}), no download needed`,
		)
		return
	}
	if (values.offline) {
		throw new Error(`--offline: version ${version} is not cached`)
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
		await rename(tmp, target)
		const seconds = ((performance.now() - startedAt) / 1000).toFixed(1)
		console.log(
			`Downloaded .cache/${version} (${summarize(manifest)}) in ${seconds}s`,
		)
	} finally {
		await rm(tmp, { recursive: true, force: true })
	}
}

main().catch((error: unknown) => {
	console.error(
		`sync-data failed: ${error instanceof Error ? error.message : String(error)}`,
	)
	process.exit(1)
})
