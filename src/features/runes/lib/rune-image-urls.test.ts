import { expect, test } from "bun:test"
import perks from "../../../../scripts/sync-data/fixtures/runes/perks.json"
import perkStyles from "../../../../scripts/sync-data/fixtures/runes/perkstyles.json"
import runesReforged from "../../../../scripts/sync-data/fixtures/runes/runesReforged.json"
import { normalizeRunes } from "../../../../scripts/sync-data/normalize-runes"
import { runeImageUrls } from "./rune-image-urls"

test("lists every tree, rune and shard icon once", () => {
	const runes = normalizeRunes(runesReforged, perks, perkStyles, "16.19.1")
	const runeCount = runes.trees.reduce(
		(sum, tree) => sum + tree.keystones.length + tree.rows.flat().length,
		0,
	)
	const urls = runeImageUrls(runes)
	expect(urls.size).toBe(runes.trees.length + runeCount + runes.shards.length)
	expect(urls).toContain("perk-images/Styles/7200_Domination.png")
	expect(urls).toContain("perk-images/StatMods/StatModsAdaptiveForceIcon.png")
})
