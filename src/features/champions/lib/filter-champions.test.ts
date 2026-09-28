import { describe, expect, test } from "bun:test"

import type { ChampionSummary } from "../../../../scripts/sync-data/schemas/champion"
import { filterChampions } from "./filter-champions"

function championsNamed(...names: string[]): ChampionSummary[] {
	return names.map((name, id) => ({ id, name }) as ChampionSummary)
}

const champions = championsNamed(
	"Ahri",
	"Kai'Sa",
	"Nunu & Willump",
	"Heimerdinger",
	"Kha'Zix",
)

function namesMatching(search: string) {
	return filterChampions(champions, search).map((champion) => champion.name)
}

describe("filterChampions", () => {
	test("returns every champion when the search is empty or blank", () => {
		expect(namesMatching("")).toHaveLength(5)
		expect(namesMatching("   ")).toHaveLength(5)
	})

	test("matches a substring of the name, ignoring case", () => {
		expect(namesMatching("HEIMER")).toEqual(["Heimerdinger"])
		expect(namesMatching("ah")).toEqual(["Ahri"])
	})

	test("ignores punctuation and spaces in names and search", () => {
		expect(namesMatching("kaisa")).toEqual(["Kai'Sa"])
		expect(namesMatching("nunu")).toEqual(["Nunu & Willump"])
		expect(namesMatching("nunu willump")).toEqual(["Nunu & Willump"])
		expect(namesMatching("kha zix")).toEqual(["Kha'Zix"])
	})

	test("ignores accents", () => {
		expect(namesMatching("kaïsa")).toEqual(["Kai'Sa"])
		expect(filterChampions(championsNamed("Séraphine"), "seraph")).toHaveLength(
			1,
		)
	})

	test("returns an empty list when nothing matches", () => {
		expect(namesMatching("teemo")).toEqual([])
	})
})
