import { createHash } from "node:crypto"
import { readdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { type DataManifest, dataManifestSchema } from "./schemas/manifest"
import { compareVersions } from "./schemas/patch-range"

type DataFileHashes = DataManifest["files"]

/** Short content hash the app appends to data URLs (`?v=<hash>`), so changed files get new URLs. */
export function contentHash(content: string): string {
	return createHash("sha256").update(content).digest("hex").slice(0, 10)
}

/** Hashes every JSON file under each `<outputRoot>/<patch>/`, keyed by its path relative to `outputRoot`. */
export async function hashDataFiles(
	outputRoot: string,
	patches: readonly string[],
): Promise<DataFileHashes> {
	const entries: [string, string][] = []
	for (const patch of patches) {
		const glob = new Bun.Glob("**/*.json")
		for await (const file of glob.scan({ cwd: join(outputRoot, patch) })) {
			const content = await readFile(join(outputRoot, patch, file), "utf8")
			entries.push([`${patch}/${file}`, contentHash(content)])
		}
	}
	entries.sort(([a], [b]) => (a < b ? -1 : 1))
	return Object.fromEntries(entries)
}

export function buildManifest(
	patches: readonly string[],
	files: DataFileHashes,
	generatedAt: Date,
): DataManifest {
	const newestFirst = [...patches].sort(compareVersions).reverse()
	return dataManifestSchema.parse({
		currentPatch: newestFirst[0],
		patches: newestFirst,
		files,
		generatedAt: generatedAt.toISOString(),
	})
}

/** Lists every `<outputRoot>/<x.y.z>` directory, hashes its files and writes `<outputRoot>/manifest.json`. */
export async function writeManifest(outputRoot: string): Promise<DataManifest> {
	const entries = await readdir(outputRoot, { withFileTypes: true })
	const patches = entries
		.filter(
			(entry) => entry.isDirectory() && /^\d+\.\d+\.\d+$/.test(entry.name),
		)
		.map((entry) => entry.name)
	const files = await hashDataFiles(outputRoot, patches)
	const manifest = buildManifest(patches, files, new Date())
	await writeFile(
		join(outputRoot, "manifest.json"),
		`${JSON.stringify(manifest, null, "\t")}\n`,
	)
	return manifest
}
