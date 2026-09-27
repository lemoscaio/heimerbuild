import { describe, expect, test } from "bun:test"
import {
	compareVersions,
	resolveLatestVersion,
	toCommunityDragonPatch,
	VERSIONS_URL,
} from "./version"

function mockFetch(body: unknown, status = 200) {
	const calls: string[] = []
	const fetchFn = (async (input: string | URL | Request) => {
		calls.push(String(input))
		return new Response(JSON.stringify(body), { status })
	}) as typeof fetch
	return { fetchFn, calls }
}

describe("resolveLatestVersion", () => {
	test("returns the first entry of versions.json", async () => {
		const { fetchFn, calls } = mockFetch(["16.19.1", "16.18.1", "lolpatch_3.7"])
		expect(await resolveLatestVersion(fetchFn)).toBe("16.19.1")
		expect(calls).toEqual([VERSIONS_URL])
	})

	test("rejects an empty list", async () => {
		const { fetchFn } = mockFetch([])
		await expect(resolveLatestVersion(fetchFn)).rejects.toThrow(
			"non-empty array",
		)
	})

	test("rejects a non-array payload", async () => {
		const { fetchFn } = mockFetch({ latest: "16.19.1" })
		await expect(resolveLatestVersion(fetchFn)).rejects.toThrow(
			"non-empty array",
		)
	})

	test("rejects a malformed first entry", async () => {
		const { fetchFn } = mockFetch(["lolpatch_3.7"])
		await expect(resolveLatestVersion(fetchFn)).rejects.toThrow(
			'Invalid Data Dragon version "lolpatch_3.7"',
		)
	})

	test("fails on an HTTP error without retrying a 4xx", async () => {
		const { fetchFn, calls } = mockFetch("not found", 404)
		await expect(resolveLatestVersion(fetchFn)).rejects.toThrow(
			`HTTP 404 for ${VERSIONS_URL}`,
		)
		expect(calls).toHaveLength(1)
	})
})

describe("toCommunityDragonPatch", () => {
	test.each([
		["16.19.1", "16.19"],
		["16.2.1", "16.2"],
		["9.24.2", "9.24"],
	])("%s -> %s", (version, patch) => {
		expect(toCommunityDragonPatch(version)).toBe(patch)
	})

	test("rejects a non-semver version", () => {
		expect(() => toCommunityDragonPatch("16.19")).toThrow(
			"Invalid Data Dragon version",
		)
	})
})

describe("compareVersions", () => {
	test("compares numerically, not lexically", () => {
		expect(["16.9.1", "16.19.1", "16.10.1"].sort(compareVersions)).toEqual([
			"16.9.1",
			"16.10.1",
			"16.19.1",
		])
	})
})
