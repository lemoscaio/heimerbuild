import { describe, expect, test } from "bun:test"
import { dataManifestSchema } from "../../scripts/sync-data/schemas/manifest"
import {
	fetchGameData,
	GameDataUnavailableError,
	toItemsById,
} from "./game-data"

const MANIFEST = {
	currentPatch: "16.19.1",
	patches: ["16.19.1"],
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

describe("toItemsById", () => {
	test("keys items by id with a Data Dragon icon URL for the file version", () => {
		const item = { id: "1036", icon: "1036.png" } as Parameters<
			typeof toItemsById
		>[0]["items"][number]
		expect(toItemsById({ version: "16.19.1", items: [item] })).toEqual({
			"1036": {
				id: "1036",
				icon: "https://ddragon.leagueoflegends.com/cdn/16.19.1/img/item/1036.png",
			},
		})
	})
})
