import { describe, expect, test } from "bun:test"
import { suggestShortcuts } from "./filter-shortcuts"

function texts(word: string) {
	return suggestShortcuts(word).map(({ text }) => text)
}

describe("suggestShortcuts", () => {
	test("suggests the prefixes the typed word starts", () => {
		expect(texts("g")).toEqual(["group:", "gold<=", "gold>="])
		expect(texts("GOLD<")).toEqual(["gold<="])
		expect(texts("in")).toEqual(["into:"])
	})

	test("suggests a stat minimum once a stat alias is typed", () => {
		expect(texts("ap")).toEqual(["ap>="])
		expect(texts("ms%>")).toEqual(["ms%>="])
		expect(suggestShortcuts("as")[0]?.label).toBe("Attack Speed at least")
	})

	test("nothing once the prefix is typed, or for an empty word", () => {
		expect(texts("from:")).toEqual([])
		expect(texts("ap>=")).toEqual([])
		expect(texts(" ")).toEqual([])
	})
})
