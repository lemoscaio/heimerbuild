import { describe, expect, test } from "bun:test"
import map11Bin from "./fixtures/map11.bin.json"
import { classicItemIds } from "./shop-filter"

describe("classicItemIds", () => {
	test("collects every CLASSIC item list and ignores other modes", () => {
		const ids = classicItemIds(map11Bin)
		expect(ids).toContain("1036")
		expect(ids).toContain("1055")
		expect(ids).not.toContain("2051")
	})

	test("fails when a CLASSIC item list is missing from the bin", () => {
		const bin = structuredClone(map11Bin) as Record<string, unknown>
		delete bin["{becd97c7}"]
		expect(() => classicItemIds(bin)).toThrow(
			"CLASSIC item list {becd97c7} is missing",
		)
	})
})
