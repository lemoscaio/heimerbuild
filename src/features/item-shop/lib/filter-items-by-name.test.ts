import { describe, expect, test } from "bun:test"
import { filterItemsByName } from "./filter-items-by-name"

const items = [
	{ id: "3089", name: "Rabadon's Deathcap" },
	{ id: "3157", name: "Zhonya's Hourglass" },
	{ id: "1038", name: "B. F. Sword" },
	{ id: "9999", name: "Épée Test" },
]

function namesMatching(query: string) {
	return filterItemsByName(items, query).map(({ name }) => name)
}

describe("filterItemsByName", () => {
	test("an empty or blank query keeps every item", () => {
		expect(namesMatching("")).toHaveLength(items.length)
		expect(namesMatching("   ")).toHaveLength(items.length)
	})

	test("matches any part of the name, ignoring case", () => {
		expect(namesMatching("deathcap")).toEqual(["Rabadon's Deathcap"])
		expect(namesMatching("ZHON")).toEqual(["Zhonya's Hourglass"])
	})

	test("ignores accents in names and query", () => {
		expect(namesMatching("epee")).toEqual(["Épée Test"])
		expect(namesMatching("zhönya")).toEqual(["Zhonya's Hourglass"])
	})

	test("ignores punctuation and spaces", () => {
		expect(namesMatching("rabadons")).toEqual(["Rabadon's Deathcap"])
		expect(namesMatching("bf sword")).toEqual(["B. F. Sword"])
	})

	test("returns nothing when no name matches", () => {
		expect(namesMatching("teemo")).toEqual([])
	})
})
