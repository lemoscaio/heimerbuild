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
})
