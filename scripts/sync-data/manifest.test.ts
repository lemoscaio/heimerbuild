import { describe, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { buildManifest, contentHash, hashDataFiles } from "./manifest"
import { dataManifestSchema } from "./schemas/manifest"

const HASH = "0123456789"

describe("buildManifest", () => {
	const generatedAt = new Date("2026-09-28T12:00:00.000Z")

	test("lists patches newest first and points currentPatch at the newest", () => {
		expect(
			buildManifest(
				["16.9.1", "16.19.1", "16.10.1"],
				{ "16.19.1/items.json": HASH },
				generatedAt,
			),
		).toEqual({
			currentPatch: "16.19.1",
			patches: ["16.19.1", "16.10.1", "16.9.1"],
			files: { "16.19.1/items.json": HASH },
			generatedAt: "2026-09-28T12:00:00.000Z",
		})
	})

	test("fails when there is no patch to serve", () => {
		expect(() => buildManifest([], {}, generatedAt)).toThrow()
	})
})

describe("contentHash", () => {
	test("keeps the hash for unchanged content and changes it for any edit", () => {
		const items = JSON.stringify({ id: "1054", stats: { healthRegen: 0.8 } })
		const fixed = JSON.stringify({ id: "1054", stats: { healthRegen: 4 } })
		expect(contentHash(items)).toBe(contentHash(items))
		expect(contentHash(fixed)).not.toBe(contentHash(items))
		expect(contentHash(items)).toMatch(/^[0-9a-f]{10}$/)
	})
})

describe("hashDataFiles", () => {
	test("hashes every JSON file of each patch, keyed by its path under /data/", async () => {
		const outputRoot = await mkdtemp(join(tmpdir(), "heimerbuild-manifest-"))
		try {
			await mkdir(join(outputRoot, "16.19.1/champions"), { recursive: true })
			await writeFile(join(outputRoot, "16.19.1/items.json"), "[1]")
			await writeFile(join(outputRoot, "16.19.1/champions/Ahri.json"), "{}")
			await writeFile(join(outputRoot, "16.19.1/notes.txt"), "not data")

			expect(await hashDataFiles(outputRoot, ["16.19.1"])).toEqual({
				"16.19.1/champions/Ahri.json": contentHash("{}"),
				"16.19.1/items.json": contentHash("[1]"),
			})
		} finally {
			await rm(outputRoot, { recursive: true, force: true })
		}
	})
})

describe("public/data/manifest.json", () => {
	test("matches the committed data files, so no changed file keeps an old URL", async () => {
		const outputRoot = resolve(import.meta.dir, "../../public/data")
		const manifest = dataManifestSchema.parse(
			JSON.parse(await readFile(join(outputRoot, "manifest.json"), "utf8")),
		)
		expect(manifest.files).toEqual(
			await hashDataFiles(outputRoot, manifest.patches),
		)
	})
})
