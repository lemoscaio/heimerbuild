import { describe, expect, test } from "bun:test"
import sharedBin from "../../../../scripts/sync-data/fixtures/summoners/shared.bin.json"
import summonerJson from "../../../../scripts/sync-data/fixtures/summoners/summoner.json"
import { normalizeSummonerSpells } from "../../../../scripts/sync-data/normalize-summoner-spells"
import {
	clearSummonerSlot,
	keptSmiteUpgrade,
	pickSummonerSpell,
	readSummoners,
	swapSummonerSlots,
} from "./summoner-picks"

const spells = normalizeSummonerSpells(summonerJson, sharedBin, "16.19.1")

const FLASH = "4"
const IGNITE = "14"
const SMITE = "11"

describe("readSummoners", () => {
	test("finds each slot's spell, D first", () => {
		const read = readSummoners("4,14", spells)

		expect(read.spells.map((spell) => spell?.name)).toEqual(["Flash", "Ignite"])
		expect(read.slots).toEqual([FLASH, IGNITE])
		expect(read.value).toBe("4,14")
	})

	test("keeps the value as given until the spells load", () => {
		const read = readSummoners("4,4", undefined)

		expect(read.value).toBe("4,4")
		expect(read.slots).toEqual([FLASH, FLASH])
		expect(read.spells).toEqual([undefined, undefined])
	})

	test("empties a slot whose spell is not on Summoner's Rift this patch", () => {
		// 13 is Clarity, an ARAM-only spell.
		expect(readSummoners("13,14", spells).value).toBe(",14")
		expect(readSummoners("4,99999", spells).value).toBe("4,")
	})

	test("never keeps the same spell twice", () => {
		expect(readSummoners("4,4", spells).value).toBe("4,")
	})

	test("an empty or unreadable value means two empty slots, left out of the link", () => {
		for (const value of [undefined, "", "flash,ignite"]) {
			const read = readSummoners(value, spells)
			expect(read.spells).toEqual([undefined, undefined])
			expect(read.value).toBeUndefined()
		}
	})
})

describe("pickSummonerSpell", () => {
	test("puts the spell in the chosen slot and keeps the other one", () => {
		expect(pickSummonerSpell([undefined, undefined], 1, FLASH)).toEqual([
			undefined,
			FLASH,
		])
		expect(pickSummonerSpell([FLASH, IGNITE], 1, SMITE)).toEqual([FLASH, SMITE])
	})

	test("swaps the slots when the spell is already in the other one", () => {
		expect(pickSummonerSpell([FLASH, IGNITE], 0, IGNITE)).toEqual([
			IGNITE,
			FLASH,
		])
		expect(pickSummonerSpell([FLASH, undefined], 1, FLASH)).toEqual([
			undefined,
			FLASH,
		])
	})
})

describe("swapSummonerSlots", () => {
	test("trades D and F, empty slots included", () => {
		expect(swapSummonerSlots([FLASH, IGNITE])).toEqual([IGNITE, FLASH])
		expect(swapSummonerSlots([FLASH, undefined])).toEqual([undefined, FLASH])
	})
})

describe("clearSummonerSlot", () => {
	test("empties only the given slot", () => {
		expect(clearSummonerSlot([FLASH, IGNITE], 0)).toEqual([undefined, IGNITE])
		expect(clearSummonerSlot([FLASH, IGNITE], 1)).toEqual([FLASH, undefined])
	})
})

describe("keptSmiteUpgrade", () => {
	test("keeps the upgrade while a slot holds Smite", () => {
		expect(keptSmiteUpgrade("primal", readSummoners("4,11", spells))).toBe(
			"primal",
		)
	})

	test("drops it once no slot holds Smite", () => {
		expect(
			keptSmiteUpgrade("unleashed", readSummoners("4,14", spells)),
		).toBeUndefined()
	})

	test("keeps it as given until the spells load", () => {
		expect(
			keptSmiteUpgrade("unleashed", readSummoners("4,14", undefined)),
		).toBe("unleashed")
	})
})
