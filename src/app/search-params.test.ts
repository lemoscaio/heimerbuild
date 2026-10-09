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

	test("round-trips a rune page without quoting it", () => {
		const build = {
			items: ["3089"],
			runes: "8200-8229-8226-8210-8237_8300-8304-8347_5008-5008-5011",
		}
		const search = stringifySearch(build)
		expect(search).toContain(`runes=${build.runes}`)
		expect(buildSearchSchema.parse(defaultParseSearch(search))).toEqual(build)
	})

	test("round-trips the game time", () => {
		const build = { lvl: 11, min: 30 }
		const search = stringifySearch(build)
		expect(search).toContain("min=30")
		expect(buildSearchSchema.parse(defaultParseSearch(search))).toEqual(build)
	})

	test("round-trips a combo and its target without quoting or escaping them", () => {
		const build = {
			combo: "m-quinn-harrier-valor.aa.aa.q-handle.t1_5",
			free: 1 as const,
			choices: "2e-hail-of-blades-n",
			target: "2500-60-45",
		}
		const search = stringifySearch(build)
		expect(search).toBe(
			"?combo=m-quinn-harrier-valor.aa.aa.q-handle.t1_5&free=1&choices=2e-hail-of-blades-n&target=2500-60-45",
		)
		expect(buildSearchSchema.parse(defaultParseSearch(search))).toEqual(build)
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
