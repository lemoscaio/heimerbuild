import { describe, expect, test } from "bun:test"
import { buildManifest } from "./manifest"

describe("buildManifest", () => {
	const generatedAt = new Date("2026-09-28T12:00:00.000Z")

	test("lists patches newest first and points currentPatch at the newest", () => {
		expect(
			buildManifest(["16.9.1", "16.19.1", "16.10.1"], generatedAt),
		).toEqual({
			currentPatch: "16.19.1",
			patches: ["16.19.1", "16.10.1", "16.9.1"],
			generatedAt: "2026-09-28T12:00:00.000Z",
		})
	})

	test("fails when there is no patch to serve", () => {
		expect(() => buildManifest([], generatedAt)).toThrow()
	})
})
