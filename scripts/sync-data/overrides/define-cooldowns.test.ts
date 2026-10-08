import { describe, expect, test } from "bun:test"
import { RENGAR_COOLDOWNS } from "../champions/rengar"
import {
	type ChampionAbilities,
	championAbilitiesSchema,
} from "../schemas/champion"
import { defineCooldowns } from "./define-champion-overrides"

const SPELL = {
	name: "Spell",
	description: "",
	icon: "https://example.com/icon.png",
	maxRank: 5,
	cooldown: [0.25, 0.25, 0.25, 0.25, 0.25],
	rankValues: [],
}

const ABILITIES: ChampionAbilities = {
	passive: { name: "P", description: "", icon: "https://example.com/p.png" },
	spells: [
		{ ...SPELL, slot: "Q" },
		{ ...SPELL, slot: "W" },
		{ ...SPELL, slot: "E" },
		{ ...SPELL, slot: "R", maxRank: 3, cooldown: [100, 90, 80] },
	],
}

describe("defineCooldowns", () => {
	test("sets the cooldowns of the slots it lists and keeps the others", () => {
		const override = defineCooldowns({
			id: "test-cooldowns",
			championKey: "Rengar",
			since: "16.19",
			reason: "test",
			cooldowns: { Q: [6, 5.5, 5, 4.5, 4] },
		})

		const abilities = override.apply(structuredClone(ABILITIES))

		expect(abilities.spells.map(({ cooldown }) => cooldown)).toEqual([
			[6, 5.5, 5, 4.5, 4],
			[0.25, 0.25, 0.25, 0.25, 0.25],
			[0.25, 0.25, 0.25, 0.25, 0.25],
			[100, 90, 80],
		])
	})

	test("Rengar's keeps the abilities valid", () => {
		expect(
			championAbilitiesSchema.safeParse(
				RENGAR_COOLDOWNS.apply(structuredClone(ABILITIES)),
			).success,
		).toBe(true)
	})
})
