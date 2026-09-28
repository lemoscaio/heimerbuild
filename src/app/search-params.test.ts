import { describe, expect, test } from "bun:test"
import { defaultParseSearch } from "@tanstack/react-router"
import { buildSearchSchema } from "@/features/build-calculator/lib/build-search"
import { stringifySearch } from "./search-params"

describe("stringifySearch", () => {
	test("writes item lists as comma-separated ids", () => {
		expect(
			decodeURIComponent(
				stringifySearch({ lvl: 11, items: ["3089", "3020"], patch: "16.19.1" }),
			),
		).toBe("?lvl=11&items=3089,3020&patch=16.19.1")
	})

	test("round-trips a build through the URL", () => {
		const build = { lvl: 11, items: ["3089", "3020"], patch: "16.19.1" }
		expect(
			buildSearchSchema.parse(defaultParseSearch(stringifySearch(build))),
		).toEqual(build)
	})

	test("round-trips a single item", () => {
		const build = { items: ["3089"] }
		expect(
			buildSearchSchema.parse(defaultParseSearch(stringifySearch(build))),
		).toEqual(build)
	})

	test("leaves out undefined fields", () => {
		expect(stringifySearch({ lvl: undefined })).toBe("")
	})
})
