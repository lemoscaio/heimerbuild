import { describe, expect, test } from "bun:test"
import perks from "../../../../scripts/sync-data/fixtures/runes/perks.json"
import perkStyles from "../../../../scripts/sync-data/fixtures/runes/perkstyles.json"
import runesReforged from "../../../../scripts/sync-data/fixtures/runes/runesReforged.json"
import { normalizeRunes } from "../../../../scripts/sync-data/normalize-runes"
import { readRunePage } from "./rune-page-state"

const runes = normalizeRunes(runesReforged, perks, perkStyles, "16.19.1")

// Sorcery: Arcane Comet, Manaflow Band, Transcendence, Scorch; Inspiration: Magical Footwear, Cosmic Insight.
const COMET = "8200-8229-8226-8210-8237_8300-8304-8347_5008-5008-5011"

describe("readRunePage", () => {
	test("keeps the value as given until the runes load", () => {
		expect(readRunePage("9-9-9_bad", undefined)).toEqual({
			selection: { shardIds: [] },
			value: "9-9-9_bad",
			shards: [],
		})
	})

	test("reads a valid page and its shards once the runes load", () => {
		const page = readRunePage(COMET, runes)

		expect(page.value).toBe(COMET)
		expect(page.selection.primary?.keystoneId).toBe(8229)
		expect(page.shards.map((shard) => shard.id)).toEqual([5008, 5008, 5011])
	})

	test("drops what this patch does not have from the value", () => {
		const page = readRunePage("8200-1-0-0-0_0-0-0_5008-0-0", runes)

		expect(page.value).toBe("8200-0-0-0-0_0-0-0_5008-0-0")
		expect(page.shards.map((shard) => shard.id)).toEqual([5008])
	})

	test("an empty page has no value", () => {
		expect(readRunePage(undefined, runes).value).toBeUndefined()
	})
})
