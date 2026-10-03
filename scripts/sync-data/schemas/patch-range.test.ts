import { describe, expect, test } from "bun:test"
import {
	assertValidPatchRange,
	compareVersions,
	isInPatchRange,
	type Patch,
	patchRangesOverlap,
} from "./patch-range"

describe("isInPatchRange", () => {
	test("matches every version of the first patch, whatever the third number", () => {
		expect(isInPatchRange("16.19.1", { since: "16.19" })).toBe(true)
		expect(isInPatchRange("16.19.4", { since: "16.19" })).toBe(true)
	})

	test("is open-ended without until", () => {
		expect(isInPatchRange("16.20.1", { since: "16.19" })).toBe(true)
		expect(isInPatchRange("17.1.1", { since: "16.19" })).toBe(true)
	})

	test("excludes patches before since", () => {
		expect(isInPatchRange("16.18.1", { since: "16.19" })).toBe(false)
		expect(isInPatchRange("15.24.1", { since: "16.1" })).toBe(false)
	})

	test("includes until and excludes the patches after it", () => {
		const range = { since: "16.19", until: "16.21" } as const
		expect(isInPatchRange("16.21.1", range)).toBe(true)
		expect(isInPatchRange("16.22.1", range)).toBe(false)
	})

	test("compares minor versions as numbers", () => {
		expect(isInPatchRange("16.10.1", { since: "16.9" })).toBe(true)
		expect(isInPatchRange("16.9.1", { since: "16.10" })).toBe(false)
	})
})

describe("patchRangesOverlap", () => {
	const range = (since: Patch, until?: Patch) => ({ since, until })

	test("detects shared patches, including a shared edge", () => {
		expect(patchRangesOverlap(range("16.19"), range("16.25"))).toBe(true)
		expect(
			patchRangesOverlap(range("16.19", "16.21"), range("16.21", "16.23")),
		).toBe(true)
	})

	test("allows back-to-back ranges", () => {
		expect(patchRangesOverlap(range("16.19", "16.20"), range("16.22"))).toBe(
			false,
		)
		expect(patchRangesOverlap(range("16.22"), range("16.19", "16.20"))).toBe(
			false,
		)
	})
})

describe("assertValidPatchRange", () => {
	test("rejects a full Data Dragon version and a range that ends before it starts", () => {
		expect(() => assertValidPatchRange({ since: "16.19.1" as Patch })).toThrow(
			'Invalid patch "16.19.1"',
		)
		expect(() =>
			assertValidPatchRange({ since: "16.20", until: "16.19" }),
		).toThrow("ends before it starts")
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
