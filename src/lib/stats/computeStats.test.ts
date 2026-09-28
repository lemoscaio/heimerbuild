import { describe, expect, test } from "bun:test"
import type { ChampionStats } from "../../../scripts/sync-data/schemas/champion"
import {
	type ItemStats,
	STAT_UNITS,
} from "../../../scripts/sync-data/schemas/item"
import { computeStats } from "./computeStats"

// Heimerdinger, patch 16.19.1 (public/data/16.19.1/champions/Heimerdinger.json).
const heimerdinger: { stats: ChampionStats } = {
	stats: {
		health: { base: 558, perLevel: 105 },
		healthRegen: { base: 7, perLevel: 0.55 },
		mana: { base: 385, perLevel: 20 },
		manaRegen: { base: 8, perLevel: 0.8 },
		armor: { base: 19, perLevel: 4.2 },
		magicResist: { base: 30, perLevel: 1.3 },
		attackDamage: { base: 56, perLevel: 2.7 },
		attackSpeed: { base: 0.658, perLevelPercent: 1.36, ratio: 0.625 },
		critChance: { base: 0, perLevel: 0 },
		movementSpeed: { base: 340, perLevel: 0 },
		attackRange: { base: 550, perLevel: 0 },
	},
}

describe("computeStats", () => {
	test("reports base, bonus and total for every canonical stat", () => {
		const stats = computeStats(heimerdinger, 1, [])

		for (const stat of Object.keys(heimerdinger.stats)) {
			expect(stats).toHaveProperty(stat)
		}
		expect(stats).toHaveProperty("abilityPower")
		expect(stats).not.toHaveProperty("attackSpeedPercent")
		for (const { base, bonus, total } of Object.values(stats)) {
			expect(total).toBeCloseTo(base + bonus, 10)
		}
	})

	test("level 1 without items is the champion's base stats", () => {
		const stats = computeStats(heimerdinger, 1, [])

		expect(stats.health).toEqual({ base: 558, bonus: 0, total: 558 })
		expect(stats.attackSpeed).toEqual({ base: 0.658, bonus: 0, total: 0.658 })
		expect(stats.abilityPower).toEqual({ base: 0, bonus: 0, total: 0 })
	})

	test("items only ever add to bonus", () => {
		const everyStat = {
			stats: Object.fromEntries(
				Object.keys(STAT_UNITS).map((stat) => [stat, 0.1]),
			) as ItemStats,
		}

		const bare = computeStats(heimerdinger, 9, [])
		const itemized = computeStats(heimerdinger, 9, [everyStat])

		for (const [stat, { base }] of Object.entries(itemized)) {
			expect(base).toBe(bare[stat as keyof typeof bare].base)
		}
	})

	test.each([0, 19, 1.5, Number.NaN])("rejects level %p", (level) => {
		expect(() => computeStats(heimerdinger, level, [])).toThrow(RangeError)
	})

	// Issues 18/19 list 972.8 and 1707.8: the exact values rounded to one decimal.
	test.each([
		[1, 558],
		[6, 972.75],
		[9, 1265.7],
		[13, 1707.75],
		[18, 2343],
	])("Heimerdinger health at level %i is %p", (level, health) => {
		expect(computeStats(heimerdinger, level, []).health.total).toBeCloseTo(
			health,
			6,
		)
	})

	describe("attack speed sums level and item bonuses once", () => {
		const twoItems = [
			{ stats: { attackSpeedPercent: 0.25 } },
			{ stats: { attackSpeedPercent: 0.25 } },
		]

		// Issue 20: ratio equal to base AS. Heimerdinger's real ratio is 0.625:
		// 0.658 + 0.625 × (0.2312 level bonus + 0.5 items) = 1.115.
		test.each([
			["ratio equal to base (issue 20)", 0.658, 1.139],
			["Heimerdinger's ratio", 0.625, 1.115],
			["ratio 0 never scales", 0, 0.658],
		])("%s", (_, ratio, expected) => {
			const champion = {
				stats: {
					...heimerdinger.stats,
					attackSpeed: { base: 0.658, perLevelPercent: 1.36, ratio },
				},
			}

			const { attackSpeed } = computeStats(champion, 18, twoItems)

			expect(attackSpeed.base).toBe(0.658)
			expect(Math.abs(attackSpeed.total - expected)).toBeLessThan(0.001)
		})

		test("attack speed from levels is bonus, not base", () => {
			const { attackSpeed } = computeStats(heimerdinger, 9, [])

			expect(attackSpeed.base).toBe(0.658)
			expect(attackSpeed.bonus).toBeCloseTo(0.625 * 0.0136 * 6.74, 10)
		})
	})

	test("flat item stats are summed on top of the champion", () => {
		const stats = computeStats(heimerdinger, 1, [
			{ stats: { attackDamage: 40, health: 450, abilityPower: 60 } },
			{ stats: { attackDamage: 30, health: 300 } },
		])

		expect(stats.attackDamage).toEqual({ base: 56, bonus: 70, total: 126 })
		expect(stats.health).toEqual({ base: 558, bonus: 750, total: 1308 })
		expect(stats.abilityPower).toEqual({ base: 0, bonus: 60, total: 60 })
	})

	test("percent item stats stay fractions and are summed", () => {
		const stats = computeStats(heimerdinger, 1, [
			{ stats: { lifeStealPercent: 0.1, armorPenetrationPercent: 0.3 } },
			{ stats: { lifeStealPercent: 0.05, armorPenetrationPercent: 0.35 } },
		])

		expect(stats.lifeStealPercent.total).toBeCloseTo(0.15, 10)
		expect(stats.armorPenetrationPercent.total).toBeCloseTo(0.65, 10)
	})

	test("crit chance is capped at 100%", () => {
		const crit = { stats: { critChancePercent: 0.25 } }

		const stats = computeStats(heimerdinger, 1, Array(5).fill(crit))

		expect(stats.critChance).toEqual({ base: 0, bonus: 1, total: 1 })
	})

	test("movement speed applies percent bonuses after flat ones", () => {
		const stats = computeStats(heimerdinger, 1, [
			{ stats: { movementSpeedFlat: 45 } },
			{ stats: { movementSpeedPercent: 0.04 } },
		])

		expect(stats.movementSpeed.total).toBeCloseTo((340 + 45) * 1.04, 10)
	})

	test("base regen percent multiplies the champion's regen at level", () => {
		const stats = computeStats(heimerdinger, 1, [
			{ stats: { baseHealthRegenPercent: 1, healthRegen: 2 } },
		])

		expect(stats.healthRegen).toEqual({ base: 7, bonus: 9, total: 16 })
	})
})
