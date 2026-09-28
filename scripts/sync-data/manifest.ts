import { readdir, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { type DataManifest, dataManifestSchema } from "./schemas/manifest"
import { compareVersions } from "./version"

export function buildManifest(
	patches: readonly string[],
	generatedAt: Date,
): DataManifest {
	const newestFirst = [...patches].sort(compareVersions).reverse()
	return dataManifestSchema.parse({
		currentPatch: newestFirst[0],
		patches: newestFirst,
		generatedAt: generatedAt.toISOString(),
	})
}

/** Lists every `<outputRoot>/<x.y.z>` directory and writes `<outputRoot>/manifest.json`. */
export async function writeManifest(outputRoot: string): Promise<DataManifest> {
	const entries = await readdir(outputRoot, { withFileTypes: true })
	const patches = entries
		.filter(
			(entry) => entry.isDirectory() && /^\d+\.\d+\.\d+$/.test(entry.name),
		)
		.map((entry) => entry.name)
	const manifest = buildManifest(patches, new Date())
	await writeFile(
		join(outputRoot, "manifest.json"),
		`${JSON.stringify(manifest, null, "\t")}\n`,
	)
	return manifest
}
