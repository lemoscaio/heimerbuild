import { describe, expect, test } from "bun:test"
import type { AbilityDamage } from "@schemas/champion"
import type { ComputedStats } from "../stats/compute-stats"
import { abilityCooldown, evaluateDamage } from "./damage-formula"

function breakdown(base: number, bonus: number) {
	return { base, bonus, total: base + bonus }
}

const STATS = {
	attackDamage: breakdown(100, 60),
	abilityPower: breakdown(0, 50),
	armor: breakdown(80, 20),
} as ComputedStats

const VAULT: AbilityDamage = {
	name: "TotalDamage",
	type: "physical",
	parts: [
		{ value: { byRank: [40, 65, 90, 115, 140] } },
		{ stat: "attackDamage", part: "bonus", ratio: 0.2 },
	],
}

describe("evaluateDamage", () => {
	test("sums the base at the rank and each stat ratio (Vault rank 3: 90 + 20% of 60 bonus AD)", () => {
		expect(evaluateDamage(VAULT, { stats: STATS, rank: 3, level: 9 })).toBe(102)
	})

	test("reads values by champion level, the stat's total by default, and the multiplier", () => {
		const damage: AbilityDamage = {
			name: "Damage",
			type: "magic",
			parts: [
				{ value: { byLevel: Array.from({ length: 18 }, (_, i) => i + 1) } },
				{ stat: "abilityPower", ratio: { byRank: [0.5, 0.6] } },
				{ stat: "armor", ratio: 0.1 },
			],
			multiplier: 2,
		}

		expect(evaluateDamage(damage, { stats: STATS, rank: 2, level: 9 })).toBe(
			(9 + 0.6 * 50 + 0.1 * 100) * 2,
		)
	})

	test("has no number for damage not modeled, or a value by rank without a rank", () => {
		expect(
			evaluateDamage(
				{ ...VAULT, notModeled: ["summed sub-parts"] },
				{ stats: STATS, rank: 1, level: 1 },
			),
		).toBeUndefined()
		expect(evaluateDamage(VAULT, { stats: STATS, level: 1 })).toBeUndefined()
	})
})

describe("abilityCooldown", () => {
	test("scales by 100 / (100 + ability haste)", () => {
		expect(abilityCooldown(10, 0)).toBe(10)
		expect(abilityCooldown(10, 100)).toBe(5)
		expect(abilityCooldown(4.5, 20)).toBeCloseTo(3.75)
	})
})
