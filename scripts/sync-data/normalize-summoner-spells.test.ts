import { describe, expect, test } from "bun:test"
import sharedBin from "./fixtures/summoners/shared.bin.json"
import summonerJson from "./fixtures/summoners/summoner.json"
import {
	normalizeSummonerSpells,
	spellValues,
} from "./normalize-summoner-spells"

// Fixtures are trimmed copies of the Data Dragon 16.19.1 / CommunityDragon 16.19 cache.
const VERSION = "16.19.1"

function spells() {
	return normalizeSummonerSpells(summonerJson, sharedBin, VERSION).spells
}

function spell(name: string) {
	const found = spells().find((entry) => entry.name === name)
	if (!found) throw new Error(`no ${name}`)
	return found
}

describe("normalizeSummonerSpells", () => {
	test("keeps only the Summoner's Rift spells, by name", () => {
		expect(spells().map((entry) => entry.name)).toEqual([
			"Barrier",
			"Cleanse",
			"Exhaust",
			"Flash",
			"Ghost",
			"Heal",
			"Ignite",
			"Smite",
			"Teleport",
		])
	})

	test("uses Riot's numeric key as the id, with a patch icon and the cooldown", () => {
		expect(spell("Flash")).toMatchObject({
			id: "4",
			key: "SummonerFlash",
			icon: "https://ddragon.leagueoflegends.com/cdn/16.19.1/img/spell/SummonerFlash.png",
			cooldown: 300,
			description: "Teleports you a short distance toward your cursor.",
		})
	})

	test("evaluates level-scaled values for every level 1 to 18", () => {
		// League wiki: Ignite 70 at level 1, 150 at 5, 175 at 6, 475 at 18.
		const ignite = spell("Ignite").values.tooltiptruedamagecalculation
		expect(ignite).toHaveLength(18)
		expect([ignite?.[0], ignite?.[4], ignite?.[5], ignite?.[17]]).toEqual([
			70, 150, 175, 475,
		])
		// Linear from level 1 to 18: Heal 80 → 318 (+14 per level), Barrier 100 → 460.
		expect(spell("Heal").values.totalheal?.[1]).toBe(94)
		expect(spell("Heal").values.totalheal?.[17]).toBe(318)
		expect(spell("Barrier").values.shieldstrength?.[17]).toBe(460)
	})

	test("keeps constant values from the game files", () => {
		expect(spell("Ignite").values.grievousamount?.[0]).toBe(0.4)
		expect(spell("Smite").values.smiteupgradeddamage?.[17]).toBe(1000)
		expect(spell("Exhaust").values.damagereduction?.[9]).toBe(35)
	})

	test("fills the tooltip's numbers, as a range when they grow with level", () => {
		expect(spell("Ignite").longDescription[0]).toEqual([
			[
				{
					text: "Deals 70–475 true damage to target enemy champion over 5 seconds and applies 40% Grievous Wounds for the duration.",
				},
			],
		])
		expect(spell("Ghost").longDescription[0]?.[0]?.[0]?.text).toBe(
			"Gain 24–48% Move Speed and become Ghosted for 10 seconds.",
		)
	})

	test("gives Smite its charges", () => {
		expect(spell("Smite")).toMatchObject({
			cooldown: 15,
			charges: { count: 2, rechargeTime: 90 },
		})
		expect(spell("Flash").charges).toBeUndefined()
	})

	test("fails when the game files lack a spell", () => {
		expect(() =>
			normalizeSummonerSpells(
				summonerJson,
				{ ...sharedBin, "Shared/Spells/SummonerFlash": undefined },
				VERSION,
			),
		).toThrow("SummonerFlash is missing from the game files")
	})

	test("fails when Data Dragon and the game files disagree on a cooldown", () => {
		const flash = summonerJson.data.SummonerFlash
		const changed = {
			...summonerJson,
			data: {
				...summonerJson.data,
				SummonerFlash: { ...flash, cooldown: [9] },
			},
		}
		expect(() => normalizeSummonerSpells(changed, sharedBin, VERSION)).toThrow(
			"SummonerFlash: Data Dragon cooldown 9 differs",
		)
	})
})

describe("spellValues", () => {
	test("fails on a tooltip placeholder the game files cannot fill", () => {
		expect(() =>
			spellValues(
				{ id: "SummonerFlash", tooltip: "Blinks {{ blinkrange }} units." },
				{ cooldownTime: [300, 300] },
			),
		).toThrow("no value for {{ blinkrange }}")
	})

	test("applies a breakpoint's extra bonus at its level", () => {
		const { values } = spellValues(
			{ id: "Test", tooltip: "{{ damage }}" },
			{
				cooldownTime: [1, 1],
				mSpellCalculations: {
					Damage: {
						__type: "GameCalculation",
						mFormulaParts: [
							{
								__type: "ByCharLevelBreakpointsCalculationPart",
								mLevel1Value: 10,
								mBreakpoints: [{ mLevel: 3, mAdditionalBonusAtThisLevel: 5 }],
							},
						],
					},
				},
			},
		)
		expect(values.damage?.slice(0, 4)).toEqual([10, 10, 15, 15])
	})
})
