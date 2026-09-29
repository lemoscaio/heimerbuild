import { describe, expect, test } from "bun:test"
import { buildSearchSchema, toBuildSearch } from "./build-search"

function parse(search: Record<string, unknown>) {
	return buildSearchSchema.parse(search)
}

describe("buildSearchSchema", () => {
	test("accepts a full build", () => {
		expect(parse({ lvl: 11, items: "3089,3020", patch: "16.19.1" })).toEqual({
			lvl: 11,
			items: ["3089", "3020"],
			patch: "16.19.1",
		})
	})

	test("accepts a single item id, which the router parses as a number", () => {
		expect(parse({ items: 3089 }).items).toEqual(["3089"])
	})

	test("accepts items as an array", () => {
		expect(parse({ items: [3089, "3020"] }).items).toEqual(["3089", "3020"])
	})

	test("leaves every field out when the URL has none", () => {
		expect(parse({})).toEqual({})
	})

	test("drops a level outside 1-18 or not an integer", () => {
		expect(parse({ lvl: 0 }).lvl).toBeUndefined()
		expect(parse({ lvl: 19 }).lvl).toBeUndefined()
		expect(parse({ lvl: 2.5 }).lvl).toBeUndefined()
		expect(parse({ lvl: "abc" }).lvl).toBeUndefined()
		expect(parse({ lvl: 1 }).lvl).toBe(1)
		expect(parse({ lvl: 18 }).lvl).toBe(18)
	})

	test("drops the item list when an id is not numeric or there are more than 6", () => {
		expect(parse({ items: "3089,abc" }).items).toBeUndefined()
		expect(parse({ items: "1,2,3,4,5,6,7" }).items).toBeUndefined()
		expect(parse({ items: "1,2,3,4,5,6" }).items).toHaveLength(6)
	})

	test("drops a patch that is not a full version", () => {
		expect(parse({ patch: 16.19 }).patch).toBeUndefined()
		expect(parse({ patch: "latest" }).patch).toBeUndefined()
	})

	test("accepts the expanded shop view and drops any other view", () => {
		expect(parse({ view: "shop" }).view).toBe("shop")
		expect(parse({ view: "overview" }).view).toBeUndefined()
		expect(parse({ view: 1 }).view).toBeUndefined()
	})

	test("keeps valid fields when another one is invalid", () => {
		expect(parse({ lvl: 99, items: "3089", patch: "16.19.1" })).toEqual({
			lvl: undefined,
			items: ["3089"],
			patch: "16.19.1",
		})
	})
})

describe("toBuildSearch", () => {
	test("writes level, items and patch", () => {
		expect(
			toBuildSearch({ level: 11, itemIds: ["3089", "3020"], patch: "16.19.1" }),
		).toEqual({ lvl: 11, items: ["3089", "3020"], patch: "16.19.1" })
	})

	test("leaves the default level and an empty build out of the URL", () => {
		expect(toBuildSearch({ level: 1, itemIds: [], patch: undefined })).toEqual({
			lvl: undefined,
			items: undefined,
			patch: undefined,
		})
	})

	test("writes the shop view and leaves the overview out", () => {
		const build = { level: 1, itemIds: [], patch: undefined }
		expect(toBuildSearch({ ...build, view: "shop" }).view).toBe("shop")
		expect(toBuildSearch({ ...build, view: "overview" }).view).toBeUndefined()
	})

	test("reads back through the search schema", () => {
		const search = toBuildSearch({
			level: 18,
			itemIds: ["3089"],
			patch: "16.19.1",
			view: "shop",
		})
		expect(buildSearchSchema.parse(search)).toEqual(search)
	})
})
