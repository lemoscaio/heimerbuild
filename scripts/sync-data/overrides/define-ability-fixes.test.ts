import { describe, expect, test } from "bun:test"
import { GAREN_ABILITIES } from "../champions/garen"
import { NASUS_ABILITIES } from "../champions/nasus"
import { RENGAR_ABILITIES } from "../champions/rengar"
import {
	type AbilityDamage,
	type ChampionAbilities,
	championAbilitiesSchema,
} from "../schemas/champion"
import {
	defineAbilityFixes,
	defineCooldowns,
} from "./define-champion-overrides"

const SPELL = {
	name: "Spell",
	description: "",
	icon: "https://example.com/icon.png",
	maxRank: 5,
	cooldown: [0.25, 0.25, 0.25, 0.25, 0.25],
	rankValues: [],
	castTime: 0.25,
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

/** Abilities whose `slot` shows `damage`, as the sync reads it. */
function withDamage(
	slot: "Q" | "E",
	damage: AbilityDamage[],
): ChampionAbilities {
	return {
		...ABILITIES,
		spells: ABILITIES.spells.map((spell) =>
			spell.slot === slot ? { ...spell, damage } : spell,
		) as ChampionAbilities["spells"],
	}
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
})

describe("defineAbilityFixes", () => {
	test("sets cast times, cooldowns and damage in one override, keeping what it doesn't list", () => {
		const override = defineAbilityFixes({
			id: "test-abilities",
			championKey: "Rengar",
			since: "16.19",
			reason: "test",
			castTimes: { R: 0 },
			cooldowns: { Q: [6, 5.5, 5, 4.5, 4] },
			damage: {
				Q: (damage) => damage.map((entry) => ({ ...entry, multiplier: 2 })),
			},
		})
		const damage: AbilityDamage = {
			name: "Damage",
			type: "physical",
			parts: [{ value: 10 }],
		}

		const abilities = override.apply(withDamage("Q", [damage]))

		expect(abilities.spells.map(({ castTime }) => castTime)).toEqual([
			0.25, 0.25, 0.25, 0,
		])
		expect(abilities.spells[0]?.cooldown).toEqual([6, 5.5, 5, 4.5, 4])
		expect(abilities.spells[0]?.damage).toEqual([{ ...damage, multiplier: 2 }])
		expect(abilities.spells[1]?.cooldown).toEqual(SPELL.cooldown)
	})

	test.each(
		[RENGAR_ABILITIES, NASUS_ABILITIES, GAREN_ABILITIES].map(
			(override) => [override.id, override] as const,
		),
	)("%s keeps the abilities valid", (_, override) => {
		expect(
			championAbilitiesSchema.safeParse(
				override.apply(structuredClone(ABILITIES)),
			).success,
		).toBe(true)
	})

	test("Nasus: Siphoning Strike's unread buff counter becomes its stacks, one damage each (wiki)", () => {
		const synced: AbilityDamage = {
			name: "TotalDamage",
			type: "physical",
			parts: [
				{ value: { byRank: [30, 50, 70, 90, 110] } },
				{ stat: "attackDamage", ratio: 1 },
			],
			notModeled: ["a buff counter"],
		}

		const [damage] =
			NASUS_ABILITIES.apply(withDamage("Q", [synced])).spells[0]?.damage ?? []

		expect(damage).toEqual({
			name: "TotalDamage",
			type: "physical",
			parts: [...synced.parts, { counter: "stacks", ratio: 1 }],
		})
	})

	test("Nasus: a Siphoning Strike the sync reads in full stays as it is", () => {
		const read: AbilityDamage = {
			name: "TotalDamage",
			type: "physical",
			parts: [{ value: 30 }],
		}

		expect(
			NASUS_ABILITIES.apply(withDamage("Q", [read])).spells[0]?.damage,
		).toEqual([read])
	})

	test("Garen: Judgment's nearest enemy bonus is a spin's damage plus 25% (wiki)", () => {
		const spin: AbilityDamage = {
			name: "TotalDamage",
			type: "physical",
			parts: [
				{ value: { byRank: [4, 7, 10, 13, 16] } },
				{
					stat: "attackDamage",
					ratio: { byRank: [0.4, 0.43, 0.46, 0.49, 0.52] },
				},
			],
		}
		const bonus: AbilityDamage = {
			name: "NearestEnemyBonus",
			type: "physical",
			parts: [],
			notModeled: ["a percentage of something other than the target's health"],
		}

		const damage = GAREN_ABILITIES.apply(withDamage("E", [spin, bonus]))
			.spells[2]?.damage

		expect(damage).toEqual([
			spin,
			{ ...spin, name: "NearestEnemyBonus", multiplier: 1.25 },
		])
	})
})
