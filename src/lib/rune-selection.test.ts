import { describe, expect, test } from "bun:test"
import perks from "../../scripts/sync-data/fixtures/runes/perks.json"
import perkStyles from "../../scripts/sync-data/fixtures/runes/perkstyles.json"
import runesReforged from "../../scripts/sync-data/fixtures/runes/runesReforged.json"
import { normalizeRunes } from "../../scripts/sync-data/normalize-runes"
import {
	EMPTY_RUNE_SELECTION,
	parseRuneSelection,
	type RuneSelection,
	runePageHighlights,
	selectedShards,
	serializeRuneSelection,
} from "./rune-selection"

const runes = normalizeRunes(runesReforged, perks, perkStyles, "16.19.1")

// Sorcery: Arcane Comet, Manaflow Band, Transcendence, Scorch.
// Inspiration: Magical Footwear (row 1), Cosmic Insight (row 3).
const COMET_PAGE: RuneSelection = {
	primary: { treeId: 8200, keystoneId: 8229, runeIds: [8226, 8210, 8237] },
	secondary: { treeId: 8300, runeIds: [8304, 8347] },
	shardIds: [5008, 5008, 5011],
}
const COMET_URL = "8200-8229-8226-8210-8237_8300-8304-8347_5008-5008-5011"

describe("serializeRuneSelection", () => {
	test("writes a full page in the compact URL form", () => {
		expect(serializeRuneSelection(COMET_PAGE)).toBe(COMET_URL)
	})

	test("writes 0 for picks not made yet", () => {
		expect(
			serializeRuneSelection({
				primary: { treeId: 8200, runeIds: [] },
				shardIds: [undefined, 5010],
			}),
		).toBe("8200-0-0-0-0_0-0-0_0-5010-0")
	})

	test("leaves an empty page out of the URL", () => {
		expect(serializeRuneSelection(EMPTY_RUNE_SELECTION)).toBeUndefined()
	})

	test("never produces a value the router would read as JSON", () => {
		const value = serializeRuneSelection({ shardIds: [5008] }) ?? ""
		expect(() => JSON.parse(value)).toThrow()
	})
})

describe("parseRuneSelection", () => {
	test("restores the exact page a link was made from", () => {
		expect(
			parseRuneSelection(serializeRuneSelection(COMET_PAGE), runes),
		).toEqual(COMET_PAGE)
	})

	test("drops a keystone or rune that is not in the chosen tree or row", () => {
		// Electrocute is a Domination keystone; Scorch sits in row 3, not row 1.
		const page = parseRuneSelection(
			"8200-8112-8237-8210-8237_0-0-0_0-0-0",
			runes,
		)
		expect(page.primary).toEqual({
			treeId: 8200,
			keystoneId: undefined,
			runeIds: [undefined, 8210, 8237],
		})
	})

	test("drops a secondary tree equal to the primary one", () => {
		const page = parseRuneSelection("8200-8229-0-0-0_8200-8226-0_0-0-0", runes)
		expect(page.secondary).toBeUndefined()
	})

	test("keeps only one secondary rune per row", () => {
		// Hextech Flashtraption and Magical Footwear share Inspiration's first row.
		const page = parseRuneSelection("0-0-0-0-0_8300-8306-8304_0-0-0", runes)
		expect(page.secondary).toEqual({ treeId: 8300, runeIds: [8306] })
	})

	test("drops a shard that its row does not offer", () => {
		// Health (5011) is a Defense shard, not an Offense one.
		const page = parseRuneSelection("0-0-0-0-0_0-0-0_5011-5010-5013", runes)
		expect(page.shardIds).toEqual([undefined, 5010, 5013])
	})

	test("ignores a malformed or unknown value instead of failing", () => {
		expect(parseRuneSelection("hello", runes)).toEqual(EMPTY_RUNE_SELECTION)
		expect(parseRuneSelection(undefined, runes)).toEqual(EMPTY_RUNE_SELECTION)
		expect(
			parseRuneSelection("9999-1-2-3-4_0-0-0_0-0-0", runes).primary,
		).toBeUndefined()
	})
})

describe("selectedShards", () => {
	test("counts a shard picked in two rows twice", () => {
		expect(
			selectedShards(COMET_PAGE, runes).map((shard) => shard.name),
		).toEqual(["Adaptive Force", "Adaptive Force", "Health"])
	})
})

describe("runePageHighlights", () => {
	test("names the keystone and the secondary tree of a page", () => {
		const { keystone, secondaryTree } = runePageHighlights(COMET_PAGE, runes)
		expect(keystone?.name).toBe("Arcane Comet")
		expect(secondaryTree?.name).toBe("Inspiration")
	})

	test("has neither before they are chosen", () => {
		expect(
			runePageHighlights(
				{ primary: { treeId: 8200, runeIds: [] }, shardIds: [] },
				runes,
			),
		).toEqual({ keystone: undefined, secondaryTree: undefined })
	})
})
