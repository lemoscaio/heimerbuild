import { describe, expect, test } from "bun:test"
import type { Champion } from "@schemas/champion"
import { type ItemStats, STAT_UNITS } from "@schemas/item"
import { CHAMPION_LEVEL_STATES } from "../../../scripts/sync-data/overrides/champion-level-states"
import { computeStats } from "./compute-stats"

// Heimerdinger, patch 16.19.1 (public/data/16.19.1/champions/Heimerdinger.json).
const heimerdinger: Pick<Champion, "resource" | "stats"> = {
	resource: "MANA",
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
				...heimerdinger,
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

	describe("mana from items applies only to mana champions", () => {
		const tear = { stats: { mana: 240 } }
		const manaRegenItems = [
			{ stats: { manaRegen: 1 } },
			{ stats: { baseManaRegenPercent: 0.5 } },
		]
		// Zed, patch 16.19.1: 200 energy and 50 energy regen per 5 s, no growth.
		const zed = {
			resource: "ENERGY",
			stats: {
				...heimerdinger.stats,
				mana: { base: 200, perLevel: 0 },
				manaRegen: { base: 50, perLevel: 0 },
			},
		}

		test("a mana champion gets mana and mana regen from items", () => {
			const stats = computeStats(heimerdinger, 1, [tear, ...manaRegenItems])

			expect(stats.mana).toEqual({ base: 385, bonus: 240, total: 625 })
			expect(stats.manaRegen).toEqual({ base: 8, bonus: 5, total: 13 })
		})

		test("another resource keeps the champion's own value and ignores items", () => {
			const stats = computeStats(zed, 9, [tear, ...manaRegenItems])

			expect(stats.mana).toEqual({ base: 200, bonus: 0, total: 200 })
			expect(stats.manaRegen).toEqual({ base: 50, bonus: 0, total: 50 })
		})

		// Viego's data ships a 10000 mana placeholder with resource NONE.
		test("a champion without a resource gets no mana from items", () => {
			const viego = {
				resource: "NONE",
				stats: { ...heimerdinger.stats, mana: { base: 10000, perLevel: 0 } },
			}

			const stats = computeStats(viego, 1, [tear, ...manaRegenItems])

			expect(stats.mana.bonus).toBe(0)
			expect(stats.manaRegen.bonus).toBe(0)
		})

		test("other item stats still apply to champions without mana", () => {
			const stats = computeStats(zed, 1, [
				{ stats: { mana: 240, abilityHaste: 15, health: 300 } },
			])

			expect(stats.abilityHaste.total).toBe(15)
			expect(stats.health.bonus).toBe(300)
		})
	})

	describe("level states", () => {
		/** The champion as synced: Riot's level 1 range plus its curated level states. */
		function championWith(key: string, attackRange: number) {
			const levelStates = CHAMPION_LEVEL_STATES.find(
				(override) => override.target === key,
			)?.apply(undefined)
			if (!levelStates) throw new Error(`No level states for ${key}`)
			return {
				...heimerdinger,
				stats: {
					...heimerdinger.stats,
					attackRange: { base: attackRange, perLevel: 0 },
				},
				levelStates,
			}
		}

		// Expected ranges: wiki Mini Gnar, Divine Ascent and Draw a Bead (linked in the level states).
		test.each([
			["Gnar", 175, 1, 400],
			["Gnar", 175, 9, 400 + (100 / 17) * 8],
			["Gnar", 175, 18, 500],
			["Kayle", 175, 1, 175],
			["Kayle", 175, 5, 175],
			["Kayle", 175, 6, 525],
			["Kayle", 175, 15, 525],
			["Kayle", 175, 16, 625],
			["Kayle", 175, 18, 625],
			["Tristana", 550, 1, 550],
			["Tristana", 550, 2, 550 + 150 / 17],
			["Tristana", 550, 18, 700],
		])(
			"%s (Riot range %i) at level %i has %p attack range",
			(key, riotRange, level, expected) => {
				const { attackRange } = computeStats(
					championWith(key, riotRange),
					level,
					[],
				)

				expect(attackRange.base).toBeCloseTo(expected, 10)
				expect(attackRange.total).toBeCloseTo(expected, 10)
			},
		)

		test("the range a level state sets is base, so items still add bonus", () => {
			const { attackRange } = computeStats(championWith("Kayle", 175), 6, [
				{ stats: { attackRange: 50 } },
			])

			expect(attackRange).toEqual({ base: 525, bonus: 50, total: 575 })
		})

		test("a level state leaves the stats it does not set as they were", () => {
			const kayle = championWith("Kayle", 175)

			const withStates = computeStats(kayle, 16, [])
			const without = computeStats({ ...kayle, levelStates: undefined }, 16, [])

			expect({ ...withStates, attackRange: without.attackRange }).toEqual(
				without,
			)
		})
	})
})
