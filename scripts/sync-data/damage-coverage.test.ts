import { describe, expect, test } from "bun:test"
import type { AbilityDamage, ChampionSpell } from "@schemas/champion"
import { coverageMarkdown, damageCoverage } from "./damage-coverage"

const MODELED: AbilityDamage = {
	name: "Damage",
	type: "magic",
	parts: [{ value: 80 }],
}
const NOT_MODELED: AbilityDamage = {
	name: "PercentDamage",
	type: "magic",
	parts: [],
	notModeled: ["a percentage, such as a share of the target's health"],
}

function spell(
	slot: ChampionSpell["slot"],
	damage?: AbilityDamage[],
): ChampionSpell {
	return {
		slot,
		name: slot,
		description: "",
		icon: "https://example.com/icon.png",
		maxRank: 5,
		cooldown: [1, 1, 1, 1, 1],
		rankValues: [],
		...(damage && { damage }),
	}
}

function champion(
	key: string,
	damage: Partial<Record<ChampionSpell["slot"], AbilityDamage[]>>,
) {
	return {
		key,
		name: key,
		abilities: {
			passive: {
				name: "P",
				description: "",
				icon: "https://example.com/p.png",
			},
			spells: [
				spell("Q", damage.Q),
				spell("W", damage.W),
				spell("E", damage.E),
				spell("R", damage.R),
			] as [ChampionSpell, ChampionSpell, ChampionSpell, ChampionSpell],
		},
	}
}

describe("damageCoverage", () => {
	test("rates each ability: modeled, partial, not modeled, or no damage", () => {
		const [coverage] = damageCoverage([
			champion("Lux", {
				Q: [MODELED],
				W: [MODELED, NOT_MODELED],
				E: [NOT_MODELED],
			}),
		])

		expect(
			coverage?.abilities.map(({ ability, coverage: kind }) => [ability, kind]),
		).toEqual([
			["Passive", "none"],
			["Q", "modeled"],
			["W", "partial"],
			["E", "not-modeled"],
			["R", "none"],
		])
		expect(coverage?.full).toBe(false)
		expect(coverage?.abilities[3]?.notModeled).toEqual([
			{
				name: "PercentDamage",
				reasons: ["a percentage, such as a share of the target's health"],
			},
		])
	})

	test("a champion is full when every damage it shows has a formula", () => {
		const [coverage] = damageCoverage([
			champion("Annie", { Q: [MODELED], R: [MODELED] }),
		])

		expect(coverage?.full).toBe(true)
	})

	test("rates the abilities another form swaps in", () => {
		const jayce = champion("Jayce", { Q: [MODELED] })
		const [coverage] = damageCoverage([
			{
				...jayce,
				abilities: {
					...jayce.abilities,
					forms: { cannon: { Q: spell("Q", [NOT_MODELED]) } },
				},
			},
		])

		expect(coverage?.abilities.at(-1)).toMatchObject({
			ability: "cannon Q",
			coverage: "not-modeled",
		})
		expect(coverage?.full).toBe(false)
	})
})

describe("coverageMarkdown", () => {
	test("leads with the totals and lists why each damage was not modeled", () => {
		const markdown = coverageMarkdown(
			damageCoverage([
				champion("Annie", { Q: [MODELED] }),
				champion("Lux", { E: [NOT_MODELED] }),
			]),
		)

		expect(markdown).toContain(
			"1 of 2 champions have every damage formula read. Abilities with damage: 1 modeled, 0 partial, 1 not modeled",
		)
		expect(markdown).toContain(
			"- Lux E `PercentDamage`: a percentage, such as a share of the target's health",
		)
	})
})
