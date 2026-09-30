import { describe, expect, test } from "bun:test"
import { dataManifestSchema } from "@schemas/manifest"
import {
	dataFileUrl,
	fetchGameData,
	GameDataUnavailableError,
	toItemsById,
	withRuneIconUrls,
} from "./game-data"

const MANIFEST = {
	currentPatch: "16.19.1",
	patches: ["16.19.1"],
	files: {},
	generatedAt: "2026-09-28T00:00:00.000Z",
}

function respondWith(body: string, init: ResponseInit) {
	return (async () => new Response(body, init)) as unknown as typeof fetch
}

const JSON_HEADERS = { "content-type": "application/json" }

describe("fetchGameData", () => {
	test("returns the validated JSON", async () => {
		const fetchFn = respondWith(JSON.stringify(MANIFEST), {
			headers: JSON_HEADERS,
		})
		await expect(
			fetchGameData("/data/manifest.json", dataManifestSchema, { fetchFn }),
		).resolves.toEqual(MANIFEST)
	})

	test("reports a missing file as unavailable", async () => {
		const fetchFn = respondWith("Not Found", {
			status: 404,
			headers: { "content-type": "text/plain" },
		})
		const load = fetchGameData("/data/16.1.1/items.json", dataManifestSchema, {
			fetchFn,
		})
		await expect(load).rejects.toBeInstanceOf(GameDataUnavailableError)
		await expect(load).rejects.toThrow("HTTP 404")
	})

	test("reports the SPA fallback page as unavailable instead of parsing it", async () => {
		const fetchFn = respondWith("<!doctype html><html></html>", {
			headers: { "content-type": "text/html; charset=utf-8" },
		})
		await expect(
			fetchGameData("/data/16.1.1/items.json", dataManifestSchema, {
				fetchFn,
			}),
		).rejects.toThrow("response is not JSON")
	})

	test("rejects JSON that does not match the schema", async () => {
		const fetchFn = respondWith(JSON.stringify({ currentPatch: "latest" }), {
			headers: JSON_HEADERS,
		})
		await expect(
			fetchGameData("/data/manifest.json", dataManifestSchema, { fetchFn }),
		).rejects.toThrow()
	})
})

describe("dataFileUrl", () => {
	const files = {
		"16.19.1/items.json": "a1b2c3d4e5",
		"16.19.1/champions/Ahri.json": "0f1e2d3c4b",
	}

	test("versions a file with its content hash, so a data fix changes the URL", () => {
		expect(dataFileUrl(["16.19.1", "items.json"], files)).toBe(
			"/data/16.19.1/items.json?v=a1b2c3d4e5",
		)
		expect(
			dataFileUrl(["16.19.1", "items.json"], {
				...files,
				"16.19.1/items.json": "ffffffffff",
			}),
		).toBe("/data/16.19.1/items.json?v=ffffffffff")
		expect(dataFileUrl(["16.19.1", "champions", "Ahri.json"], files)).toBe(
			"/data/16.19.1/champions/Ahri.json?v=0f1e2d3c4b",
		)
	})

	test("keeps a plain URL for a file the manifest does not list", () => {
		expect(dataFileUrl(["16.10.1", "items.json"], files)).toBe(
			"/data/16.10.1/items.json",
		)
	})

	test("encodes a champion key from the URL so it cannot leave its folder", () => {
		expect(
			dataFileUrl(["16.19.1", "champions", "../../manifest.json"], files),
		).toBe("/data/16.19.1/champions/..%2F..%2Fmanifest.json")
	})
})

describe("toItemsById", () => {
	test("keys items by id with a Data Dragon icon URL for the file version", () => {
		const item = { id: "1036", icon: "1036.png" } as Parameters<
			typeof toItemsById
		>[0]["items"][number]
		expect(toItemsById({ version: "16.19.1", items: [item] })).toEqual({
			"1036": {
				...item,
				icon: "https://ddragon.leagueoflegends.com/cdn/16.19.1/img/item/1036.png",
			},
		})
	})
})

describe("withRuneIconUrls", () => {
	test("points tree, rune and shard icons at the Data Dragon image folder", () => {
		const rune = {
			id: 8229,
			key: "ArcaneComet",
			name: "Arcane Comet",
			icon: "perk-images/Styles/Sorcery/ArcaneComet/ArcaneComet.png",
			description: "",
			longDescription: [[[{ text: "Hurls a comet." }]]],
		}
		const file = withRuneIconUrls({
			version: "16.19.1",
			trees: [
				{
					id: 8200,
					key: "Sorcery",
					name: "Sorcery",
					icon: "perk-images/Styles/7202_Sorcery.png",
					keystones: [rune],
					rows: [[rune], [rune], [rune]],
				},
			],
			shards: [
				{
					id: 5008,
					name: "Adaptive Force",
					icon: "perk-images/StatMods/StatModsAdaptiveForceIcon.png",
					description: "+9 Adaptive Force",
					stats: [{ stat: "adaptiveForce", min: 9, max: 9 }],
				},
			],
			shardRows: [],
		})
		const base = "https://ddragon.leagueoflegends.com/cdn/img"
		expect(file.trees[0]?.icon).toBe(
			`${base}/perk-images/Styles/7202_Sorcery.png`,
		)
		expect(file.trees[0]?.rows[2]?.[0]?.icon).toBe(`${base}/${rune.icon}`)
		expect(file.shards[0]?.icon).toBe(
			`${base}/perk-images/StatMods/StatModsAdaptiveForceIcon.png`,
		)
	})
})
