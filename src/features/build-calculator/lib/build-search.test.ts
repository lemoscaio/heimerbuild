import { describe, expect, test } from "bun:test"
import { BUILD_LINK_VERSION } from "./build-link-migrations"
import {
	buildSearchSchema,
	readBuildSearch,
	toBuildSearch,
} from "./build-search"

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

	test("accepts the runes, skills and combo tabs and drops any other tab", () => {
		expect(parse({ tab: "runes" }).tab).toBe("runes")
		expect(parse({ tab: "skills" }).tab).toBe("skills")
		expect(parse({ tab: "combo" }).tab).toBe("combo")
		expect(parse({ tab: "items" }).tab).toBeUndefined()
		expect(parse({ tab: "masteries" }).tab).toBeUndefined()
		expect(parse({ tab: 1 }).tab).toBeUndefined()
	})

	test("accepts a rune page in its compact form and drops anything else", () => {
		const runes = "8200-8229-8226-8210-8237_8300-8304-8347_5008-5008-5011"
		expect(parse({ runes }).runes).toBe(runes)
		expect(parse({ runes: "8200" }).runes).toBeUndefined()
		expect(parse({ runes: 8200 }).runes).toBeUndefined()
		expect(parse({ runes: "<script>_x_y" }).runes).toBeUndefined()
	})

	test("accepts a form id and drops anything a form id cannot be", () => {
		expect(parse({ form: "mega" }).form).toBe("mega")
		expect(parse({ form: "Mega Gnar" }).form).toBeUndefined()
		expect(parse({ form: 1 }).form).toBeUndefined()
		expect(parse({ form: ["mega"] }).form).toBeUndefined()
	})

	test("accepts skill points as ability letters and drops anything else", () => {
		expect(parse({ skills: "EQWE" }).skills).toBe("EQWE")
		expect(parse({ skills: "Q_Q" }).skills).toBe("Q_Q")
		expect(parse({ skills: "eqwe" }).skills).toBeUndefined()
		expect(parse({ skills: "QWEQQRQWEWRQEWQERQE" }).skills).toBeUndefined()
		expect(parse({ skills: 1 }).skills).toBeUndefined()
	})

	test("accepts summoner spells in their slot form and drops anything else", () => {
		expect(parse({ summoners: "4,14" }).summoners).toBe("4,14")
		expect(parse({ summoners: ",14" }).summoners).toBe(",14")
		expect(parse({ summoners: "flash,ignite" }).summoners).toBeUndefined()
		expect(parse({ summoners: "4,14,6" }).summoners).toBeUndefined()
	})

	test("reads a single summoner spell id, which the router parses as a number, as the D slot", () => {
		expect(parse({ summoners: 4 }).summoners).toBe("4,")
		expect(parse({ summoners: -4 }).summoners).toBeUndefined()
	})

	test("accepts effect choices in their param form and drops anything else", () => {
		expect(parse({ effects: "ghost,-teemo-w-passive" }).effects).toBe(
			"ghost,-teemo-w-passive",
		)
		expect(parse({ effects: "Ghost" }).effects).toBeUndefined()
		expect(parse({ effects: 4 }).effects).toBeUndefined()
	})

	test("accepts a current health from 1 to 100 percent and drops anything else", () => {
		expect(parse({ hp: 40 }).hp).toBe(40)
		expect(parse({ hp: 1 }).hp).toBe(1)
		for (const hp of [0, 101, 40.5, "low"]) {
			expect(parse({ hp }).hp).toBeUndefined()
		}
	})

	test("accepts a game time from 0 to 120 minutes and drops anything else", () => {
		expect(parse({ min: 30 }).min).toBe(30)
		expect(parse({ min: 0 }).min).toBe(0)
		expect(parse({ min: 120 }).min).toBe(120)
		for (const min of [-1, 121, 12.5, "late"]) {
			expect(parse({ min }).min).toBeUndefined()
		}
	})

	test("keeps valid fields when another one is invalid", () => {
		expect(parse({ lvl: 99, items: "3089", patch: "16.19.1" })).toEqual({
			lvl: undefined,
			items: ["3089"],
			patch: "16.19.1",
		})
	})
})

describe("readBuildSearch", () => {
	test("reads a link without a version and marks it with the current one", () => {
		expect(readBuildSearch({ lvl: 9, items: "3089,3020" })).toEqual({
			v: BUILD_LINK_VERSION,
			lvl: 9,
			items: ["3089", "3020"],
		})
	})

	test("reads a link of the current version", () => {
		expect(readBuildSearch({ v: BUILD_LINK_VERSION, lvl: 9 })).toEqual({
			v: BUILD_LINK_VERSION,
			lvl: 9,
		})
	})

	test("still drops invalid values after reading the version", () => {
		expect(readBuildSearch({ v: "abc", lvl: 99, items: "3089" })).toEqual({
			v: BUILD_LINK_VERSION,
			items: ["3089"],
		})
	})
})

describe("toBuildSearch", () => {
	test("writes only the effects that differ from their defaults, and none when none do", () => {
		const build = { level: 1, itemIds: [], patch: undefined }
		expect(
			toBuildSearch({
				...build,
				effects: { ghost: true, "teemo-w-passive": false },
			}).effects,
		).toBe("ghost,-teemo-w-passive")
		expect(toBuildSearch({ ...build, effects: {} }).effects).toBeUndefined()
	})

	test("writes the current health, and nothing at full health", () => {
		const build = { level: 1, itemIds: [], patch: undefined }
		expect(toBuildSearch({ ...build, currentHealth: 40 }).hp).toBe(40)
		expect(toBuildSearch({ ...build, currentHealth: 100 }).hp).toBeUndefined()
		expect(toBuildSearch(build).hp).toBeUndefined()
	})

	test("writes the game time, and nothing at the game's start", () => {
		const build = { level: 1, itemIds: [], patch: undefined }
		expect(toBuildSearch({ ...build, gameTime: 30 }).min).toBe(30)
		expect(toBuildSearch({ ...build, gameTime: 0 }).min).toBeUndefined()
		expect(toBuildSearch(build).min).toBeUndefined()
	})

	test("reads back the game time it writes", () => {
		const build = { level: 1, itemIds: [], patch: undefined, gameTime: 45 }
		expect(readBuildSearch(toBuildSearch(build)).min).toBe(45)
	})

	test("writes level, items and patch", () => {
		expect(
			toBuildSearch({ level: 11, itemIds: ["3089", "3020"], patch: "16.19.1" }),
		).toEqual({
			lvl: 11,
			items: ["3089", "3020"],
			patch: "16.19.1",
			v: BUILD_LINK_VERSION,
		})
	})

	test("leaves the default level and an empty build out of the URL", () => {
		expect(toBuildSearch({ level: 1, itemIds: [], patch: undefined })).toEqual({
			lvl: undefined,
			items: undefined,
			patch: undefined,
			v: BUILD_LINK_VERSION,
		})
	})

	test("writes the shop view and leaves the overview out", () => {
		const build = { level: 1, itemIds: [], patch: undefined }
		expect(toBuildSearch({ ...build, view: "shop" }).view).toBe("shop")
		expect(toBuildSearch({ ...build, view: "overview" }).view).toBeUndefined()
	})

	test("writes the runes tab and leaves the items tab out", () => {
		const build = { level: 1, itemIds: [], patch: undefined }
		expect(toBuildSearch({ ...build, tab: "runes" }).tab).toBe("runes")
		expect(toBuildSearch({ ...build, tab: "items" }).tab).toBeUndefined()
	})

	test("reads back through the search schema", () => {
		const search = toBuildSearch({
			level: 18,
			itemIds: ["3089"],
			patch: "16.19.1",
			view: "shop",
			tab: "runes",
			form: "mega",
			summoners: ",4",
		})
		expect(buildSearchSchema.parse(search)).toEqual(search)
	})
})
