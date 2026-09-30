import { describe, expect, test } from "bun:test"
import { EMPTY_RUNE_SELECTION, type RuneSelection } from "@/lib/rune-selection"
import perks from "../../../../scripts/sync-data/fixtures/runes/perks.json"
import perkStyles from "../../../../scripts/sync-data/fixtures/runes/perkstyles.json"
import runesReforged from "../../../../scripts/sync-data/fixtures/runes/runesReforged.json"
import { normalizeRunes } from "../../../../scripts/sync-data/normalize-runes"
import {
	pickKeystone,
	pickPrimaryRune,
	pickPrimaryTree,
	pickSecondaryRune,
	pickSecondaryTree,
	pickShard,
} from "./pick-runes"

const runes = normalizeRunes(runesReforged, perks, perkStyles, "16.19.1")
const inspiration = runes.trees.find((tree) => tree.key === "Inspiration")
if (!inspiration) throw new Error("fixture has no Inspiration tree")

const SORCERY = 8200
const INSPIRATION = 8300
// Inspiration rows: Magical Footwear (row 1), Biscuit Delivery (row 2), Cosmic Insight (row 3).
const FOOTWEAR = 8304
const FLASHTRAPTION = 8306
const BISCUITS = 8345
const COSMIC = 8347

function withSecondary(runeIds: number[]): RuneSelection {
	return {
		primary: { treeId: SORCERY, runeIds: [] },
		secondary: { treeId: INSPIRATION, runeIds },
		shardIds: [],
	}
}

describe("primary tree", () => {
	test("a new primary tree starts empty", () => {
		let page = pickPrimaryTree(EMPTY_RUNE_SELECTION, SORCERY)
		page = pickKeystone(page, 8229)
		page = pickPrimaryRune(page, 1, 8210)
		expect(page.primary).toEqual({
			treeId: SORCERY,
			keystoneId: 8229,
			runeIds: [undefined, 8210],
		})
		expect(pickPrimaryTree(page, 8000).primary).toEqual({
			treeId: 8000,
			runeIds: [],
		})
	})

	test("taking the secondary tree as primary clears the secondary", () => {
		const page = pickPrimaryTree(withSecondary([FOOTWEAR]), INSPIRATION)
		expect(page.secondary).toBeUndefined()
	})

	test("runes wait for a primary tree", () => {
		expect(pickKeystone(EMPTY_RUNE_SELECTION, 8229)).toBe(EMPTY_RUNE_SELECTION)
	})
})

describe("secondary tree", () => {
	test("cannot be the primary tree", () => {
		const page = pickPrimaryTree(EMPTY_RUNE_SELECTION, SORCERY)
		expect(pickSecondaryTree(page, SORCERY)).toBe(page)
	})

	test("a pick replaces the rune already chosen in its row", () => {
		const page = pickSecondaryRune(
			withSecondary([FOOTWEAR, COSMIC]),
			inspiration,
			FLASHTRAPTION,
		)
		expect(page.secondary?.runeIds).toEqual([COSMIC, FLASHTRAPTION])
	})

	test("a pick in a third row replaces the oldest of the two", () => {
		const page = pickSecondaryRune(
			withSecondary([FOOTWEAR, COSMIC]),
			inspiration,
			BISCUITS,
		)
		expect(page.secondary?.runeIds).toEqual([COSMIC, BISCUITS])
	})

	test("ignores runes of another tree", () => {
		const page = withSecondary([FOOTWEAR])
		expect(pickSecondaryRune(page, inspiration, 8229)).toBe(page)
	})
})

describe("pickShard", () => {
	test("sets one shard per row", () => {
		const page = pickShard(pickShard(EMPTY_RUNE_SELECTION, 2, 5011), 0, 5008)
		expect(page.shardIds).toEqual([5008, undefined, 5011])
	})
})
