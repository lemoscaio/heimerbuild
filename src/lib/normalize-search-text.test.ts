import { describe, expect, test } from "bun:test"
import { normalizeSearchText } from "./normalize-search-text"

describe("normalizeSearchText", () => {
	test.each([
		["Rabadon's Deathcap", "rabadonsdeathcap"],
		["Séraphine", "seraphine"],
		["  Nunu & Willump ", "nunuwillump"],
		["B.F. Sword", "bfsword"],
		["", ""],
	])("%p becomes %p", (text, expected) => {
		expect(normalizeSearchText(text)).toBe(expected)
	})
})
