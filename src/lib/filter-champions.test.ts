import { describe, expect, test } from "bun:test"

import type {
	ChampionRole,
	ChampionSummary,
} from "../../scripts/sync-data/schemas/champion"
import { filterChampions } from "./filter-champions"

function championsNamed(...names: string[]): ChampionSummary[] {
	return names.map((name, id) => ({ id, name }) as ChampionSummary)
}

function championWithRoles(name: string, roles: ChampionRole[]) {
	return { name, roles } as ChampionSummary
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

	test("keeps only champions with the chosen role, combined with the search", () => {
		const roster = [
			championWithRoles("Heimerdinger", ["MAGE", "SUPPORT"]),
			championWithRoles("Hecarim", ["FIGHTER", "TANK"]),
			championWithRoles("Ahri", ["MAGE", "ASSASSIN"]),
		]
		const names = (search: string, role?: ChampionRole) =>
			filterChampions(roster, search, { role }).map(({ name }) => name)

		expect(names("", "MAGE")).toEqual(["Heimerdinger", "Ahri"])
		expect(names("he", "MAGE")).toEqual(["Heimerdinger"])
		expect(names("he", "SUPPORT")).toEqual(["Heimerdinger"])
		expect(names("he")).toEqual(["Heimerdinger", "Hecarim"])
		expect(names("ahri", "TANK")).toEqual([])
	})
})
