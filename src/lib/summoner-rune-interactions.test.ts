import { describe, expect, test } from "bun:test"
import type { Rune } from "@schemas/rune"
import type { SummonerSpell } from "@schemas/summoner-spell"
import perks from "../../scripts/sync-data/fixtures/runes/perks.json"
import perkStyles from "../../scripts/sync-data/fixtures/runes/perkstyles.json"
import runesReforged from "../../scripts/sync-data/fixtures/runes/runesReforged.json"
import sharedBin from "../../scripts/sync-data/fixtures/summoners/shared.bin.json"
import summonerJson from "../../scripts/sync-data/fixtures/summoners/summoner.json"
import { normalizeRunes } from "../../scripts/sync-data/normalize-runes"
import { normalizeSummonerSpells } from "../../scripts/sync-data/normalize-summoner-spells"
import {
	hastedCooldown,
	runeSpellHaste,
	runeSummonerHints,
	SUMMONER_RUNE_INTERACTIONS,
	spellRuneEffects,
} from "./summoner-rune-interactions"

const runes = normalizeRunes(runesReforged, perks, perkStyles, "16.19.1")
const spells = normalizeSummonerSpells(summonerJson, sharedBin, "16.19.1")
const allRunes = runes.trees.flatMap((tree) => [
	...tree.keystones,
	...tree.rows.flat(),
])

function rune(key: string): Rune {
	const found = allRunes.find((entry) => entry.key === key)
	if (!found) throw new Error(`No rune ${key} in the fixture`)
	return found
}

function spell(name: string): SummonerSpell {
	const found = spells.spells.find((entry) => entry.name === name)
	if (!found) throw new Error(`No spell ${name} in the fixture`)
	return found
}

const nimbusCloak = rune("NimbusCloak")
const cosmicInsight = rune("CosmicInsight")
const flashtraption = rune("HextechFlashtraption")
const arcaneComet = rune("ArcaneComet")

describe("SUMMONER_RUNE_INTERACTIONS", () => {
	test("names runes that exist in the patch's runes", () => {
		for (const { runeKey } of SUMMONER_RUNE_INTERACTIONS) {
			expect(allRunes.some((entry) => entry.key === runeKey)).toBe(true)
		}
	})
})

describe("hastedCooldown", () => {
	test("divides by 1 + haste / 100", () => {
		expect(hastedCooldown(300, 18)).toBeCloseTo(254.24, 2)
		expect(hastedCooldown(180, 0)).toBe(180)
		expect(hastedCooldown(240, 100)).toBe(120)
	})
})

describe("runeSpellHaste", () => {
	test("reads Cosmic Insight's Summoner Spell Haste from its description", () => {
		expect(runeSpellHaste(cosmicInsight)).toBe(18)
	})

	test("is undefined for a rune without it", () => {
		expect(runeSpellHaste(nimbusCloak)).toBeUndefined()
	})
})

describe("runeSummonerHints", () => {
	test("lists the page's reacting runes in page order, each with the chosen spells it reacts to", () => {
		const hints = runeSummonerHints(
			[arcaneComet, nimbusCloak, flashtraption, cosmicInsight],
			[spell("Flash"), spell("Ignite")],
		)

		expect(
			hints.map((hint) => [
				hint.rune.name,
				hint.spells.map((entry) => entry.name),
			]),
		).toEqual([
			["Nimbus Cloak", ["Flash", "Ignite"]],
			["Hextech Flashtraption", ["Flash"]],
			["Cosmic Insight", ["Flash", "Ignite"]],
		])
	})

	test("gives Cosmic Insight's hasted cooldown of each chosen spell, rounded", () => {
		const [hint] = runeSummonerHints(
			[cosmicInsight],
			[spell("Flash"), spell("Ignite")],
		)

		expect(hint?.text).toContain("+18 Summoner Spell Haste")
		expect(hint?.text).toContain("Flash 300 s → 254 s")
		expect(hint?.text).toContain("Ignite 180 s → 153 s")
	})

	test("reads Nimbus Cloak's speed range and duration from the rune text", () => {
		const [hint] = runeSummonerHints([nimbusCloak], [spell("Ghost")])

		expect(hint?.text).toContain("15–45% move speed for 2 s")
	})

	test("leaves out Hextech Flashtraption without Flash", () => {
		expect(
			runeSummonerHints([flashtraption], [spell("Ignite"), spell("Heal")]),
		).toEqual([])
	})

	test("is empty without a chosen spell", () => {
		expect(runeSummonerHints([nimbusCloak, cosmicInsight], [])).toEqual([])
	})
})

describe("spellRuneEffects", () => {
	test("lists the runes that react to one spell, marking the ones made for it", () => {
		const effects = spellRuneEffects(
			[arcaneComet, nimbusCloak, flashtraption, cosmicInsight],
			spell("Flash"),
		)

		expect(
			effects.map((effect) => [effect.rune.name, effect.isSpellSpecific]),
		).toEqual([
			["Nimbus Cloak", false],
			["Hextech Flashtraption", true],
			["Cosmic Insight", false],
		])
	})

	test("gives that spell's hasted cooldown without repeating its name", () => {
		const [effect] = spellRuneEffects([cosmicInsight], spell("Ghost"))

		expect(effect?.text).toContain("240 s → 203 s")
		expect(effect?.text).not.toContain("Ghost")
	})

	test("hastes Smite's charge recharge, not the time between two charges", () => {
		const [effect] = spellRuneEffects([cosmicInsight], spell("Smite"))

		expect(effect?.text).toContain("90 s → 76 s")
	})
})
