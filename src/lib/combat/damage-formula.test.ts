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

/** A full dummy: 1800 maximum health. */
const TARGET = { maximum: 1800, current: 1800 }

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
		expect(
			evaluateDamage(VAULT, {
				stats: STATS,
				rank: 3,
				level: 9,
				target: TARGET,
			}),
		).toBe(102)
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

		expect(
			evaluateDamage(damage, {
				stats: STATS,
				rank: 2,
				level: 9,
				target: TARGET,
			}),
		).toBe((9 + 0.6 * 50 + 0.1 * 100) * 2)
	})

	test("has no number for damage not modeled, or a value by rank without a rank", () => {
		expect(
			evaluateDamage(
				{ ...VAULT, notModeled: ["summed sub-parts"] },
				{ stats: STATS, rank: 1, level: 1, target: TARGET },
			),
		).toBeUndefined()
		expect(
			evaluateDamage(VAULT, { stats: STATS, level: 1, target: TARGET }),
		).toBeUndefined()
	})
})

describe("evaluateDamage: a share of the target's health", () => {
	/** 4% to 8% of the target's maximum health (+3% per 100 AP), as Zac's W. */
	const MAXIMUM: AbilityDamage = {
		name: "DisplayPercentDamage",
		type: "magic",
		parts: [
			{ value: { byRank: [4, 5, 6, 7, 8] } },
			{ stat: "abilityPower", ratio: 0.03 },
		],
		multiplier: 0.01,
		ofTargetHealth: "maximum",
	}

	test("reads the target's maximum health, the stat ratios scaling the share (rank 2: 5% + 1.5% for 50 AP)", () => {
		const input = { stats: STATS, rank: 2, level: 9 }

		expect(evaluateDamage(MAXIMUM, { ...input, target: TARGET })).toBeCloseTo(
			0.065 * 1800,
		)
		expect(
			evaluateDamage(MAXIMUM, {
				...input,
				target: { maximum: 3800, current: 500 },
			}),
		).toBeCloseTo(0.065 * 3800)
	})

	test("reads the target's current or missing health at the moment of the hit", () => {
		const share = (ofTargetHealth: "current" | "missing"): AbilityDamage => ({
			name: "Share",
			type: "true",
			parts: [{ value: 0.25 }],
			ofTargetHealth,
		})
		const at = (current: number) => ({
			stats: STATS,
			level: 9,
			target: { maximum: 1800, current },
		})

		expect(evaluateDamage(share("current"), at(1800))).toBe(450)
		expect(evaluateDamage(share("current"), at(600))).toBe(150)
		expect(evaluateDamage(share("missing"), at(1800))).toBe(0)
		expect(evaluateDamage(share("missing"), at(600))).toBe(300)
	})
})

describe("abilityCooldown", () => {
	test("scales by 100 / (100 + ability haste)", () => {
		expect(abilityCooldown(10, 0)).toBe(10)
		expect(abilityCooldown(10, 100)).toBe(5)
		expect(abilityCooldown(4.5, 20)).toBeCloseTo(3.75)
	})
})
