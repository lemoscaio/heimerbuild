import { describe, expect, test } from "bun:test"
import {
	type ChampionAbilities,
	championAbilitiesSchema,
} from "../schemas/champion"
import { CHAMPION_CAST_TIMES } from "./champion-cast-times"
import { defineCastTimes } from "./define-champion-overrides"

const SPELL = {
	name: "Spell",
	description: "",
	icon: "https://example.com/icon.png",
	maxRank: 5,
	cooldown: [1, 1, 1, 1, 1],
	rankValues: [],
	castTime: 0.25,
}

const ABILITIES: ChampionAbilities = {
	passive: { name: "P", description: "", icon: "https://example.com/p.png" },
	spells: [
		{ ...SPELL, slot: "Q" },
		{ ...SPELL, slot: "W" },
		{ ...SPELL, slot: "E" },
		{ ...SPELL, slot: "R", maxRank: 3, cooldown: [1, 1, 1] },
	],
}

describe("defineCastTimes", () => {
	test("sets the cast time of the slots it lists and keeps the others", () => {
		const override = defineCastTimes({
			id: "test-cast-times",
			championKey: "Quinn",
			since: "16.19",
			reason: "test",
			castTimes: { W: 0 },
		})

		const abilities = override.apply(structuredClone(ABILITIES))

		expect(abilities.spells.map(({ castTime }) => castTime)).toEqual([
			0.25, 0, 0.25, 0.25,
		])
	})

	test.each(
		CHAMPION_CAST_TIMES.map((override) => [override.id, override] as const),
	)("%s keeps the abilities valid", (_, override) => {
		expect(
			championAbilitiesSchema.safeParse(
				override.apply(structuredClone(ABILITIES)),
			).success,
		).toBe(true)
	})
})
