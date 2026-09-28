import { describe, expect, test } from "bun:test"
import { resolveBuildPatch } from "./build-patch"

const manifest = {
	currentPatch: "16.20.1",
	patches: ["16.20.1", "16.19.1"],
}

describe("resolveBuildPatch", () => {
	test("uses the current patch when the link has none", () => {
		expect(resolveBuildPatch(manifest, undefined)).toEqual({ patch: "16.20.1" })
	})

	test("uses the current patch when the link asks for it", () => {
		expect(resolveBuildPatch(manifest, "16.20.1")).toEqual({ patch: "16.20.1" })
	})

	test("uses an older patch whose data is still served", () => {
		expect(resolveBuildPatch(manifest, "16.19.1")).toEqual({ patch: "16.19.1" })
	})

	test("falls back to the current patch and reports a patch that is gone", () => {
		expect(resolveBuildPatch(manifest, "16.10.1")).toEqual({
			patch: "16.20.1",
			unavailablePatch: "16.10.1",
		})
	})
})
