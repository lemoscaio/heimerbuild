import { existsSync } from "node:fs"
import {
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	writeFile,
} from "node:fs/promises"
import { join, resolve } from "node:path"
import { parseArgs } from "node:util"
import * as z from "zod/mini"
import {
	CACHE_LAYOUT,
	downloadRawData,
	MANIFEST_FILE,
	type RawDataManifest,
} from "./download"
import { writeManifest } from "./manifest"
import { writeChampions } from "./normalize-champions"
import { syncItems } from "./normalize-items"
import { writeRunes } from "./normalize-runes"
import {
	type OverrideReport,
	staleOverrideLines,
} from "./overrides/apply-overrides"
import {
	assertValidVersion,
	compareVersions,
	resolveLatestVersion,
} from "./version"

// The shared schemas use zod/mini, which loads no locale: keep validation failures readable.
z.config(z.locales.en())

const CACHE_ROOT = resolve(import.meta.dir, "../../.cache")
const OUTPUT_ROOT = resolve(import.meta.dir, "../../public/data")

const USAGE = `Usage: bun run sync-data [--version <x.y.z>] [--offline] [--override-report <file>]

  --version <x.y.z>          Use this Data Dragon version instead of the latest one
  --offline                  Use the newest fully cached version; never touch the network
  --override-report <file>   Write the overrides this patch no longer needs as Markdown
                             (only when there are any; the sync workflow adds it to its PR)`

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

/** Logs every applied override and warns about the stale ones, which it returns as Markdown lines. */
function reportOverrides(reports: readonly OverrideReport[]): string[] {
	for (const { id, entity } of reports.flatMap((report) => report.applied)) {
		console.log(`Applied override ${id} to ${entity}`)
	}
	const stale = staleOverrideLines(reports)
	for (const line of stale) console.warn(`  Override no longer needed: ${line}`)
	return stale
}

function staleOverridesMarkdown(lines: readonly string[]): string {
	return [
		"### Overrides no longer needed",
		"",
		...lines.map((line) => `- ${line}`),
		"",
		"Set `until` to the last patch that needed each one, or delete it (`scripts/sync-data/overrides/`).",
		"",
	].join("\n")
}

/** Returns the Markdown lines of the overrides this patch no longer needs. */
async function writeOutputs(version: string): Promise<string[]> {
	const cacheDir = join(CACHE_ROOT, version)
	const outDir = join(OUTPUT_ROOT, version)

	const startedAt = performance.now()
	const champions = await writeChampions(cacheDir, outDir, version)
	console.log(
		`Wrote public/data/${version}: ${champions.champions} champions, index ${(champions.indexBytes / 1024).toFixed(1)} KB, ${formatBytes(champions.totalBytes)} total in ${Math.round(performance.now() - startedAt)}ms`,
	)

	const items = await syncItems({ cacheDir, outDir })
	const removed = Object.entries(items.removed)
		.map(([rule, count]) => `  ${rule}: ${count}`)
		.join("\n")
	console.log(
		`Items removed from the Summoner's Rift shop, per rule:\n${removed}`,
	)
	for (const entry of items.staleAllowlist) {
		console.warn(
			`  Stale ITEM_STAT_ALLOWLIST entry (no difference found): ${entry.itemId} ${entry.stat}`,
		)
	}
	console.log(
		`Wrote public/data/${version}/items.json (${items.count} items, ${formatBytes(items.bytes)}, stats match Data Dragon)`,
	)

	const runes = await writeRunes(cacheDir, outDir, version)
	console.log(
		`Wrote public/data/${version}/runes.json (${runes.trees} trees, ${runes.runes} runes, ${runes.shards} stat shards, ${(runes.bytes / 1024).toFixed(1)} KB)`,
	)

	const staleOverrides = reportOverrides([champions.overrides, items.overrides])

	const manifest = await writeManifest(OUTPUT_ROOT)
	console.log(
		`Wrote public/data/manifest.json (current ${manifest.currentPatch}, ${manifest.patches.length} patches)`,
	)
	return staleOverrides
}

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			version: { type: "string" },
			offline: { type: "boolean", default: false },
			"override-report": { type: "string" },
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
	const staleOverrides = await writeOutputs(version)
	const reportPath = values["override-report"]
	if (reportPath && staleOverrides.length > 0) {
		await writeFile(reportPath, staleOverridesMarkdown(staleOverrides))
	}
}

main().catch((error: unknown) => {
	console.error(
		`sync-data failed: ${error instanceof Error ? error.message : String(error)}`,
	)
	process.exit(1)
})
