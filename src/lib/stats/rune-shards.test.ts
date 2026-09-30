import { describe, expect, test } from "bun:test"
import type { ShardStat } from "@schemas/rune"
import {
	resolveAdaptiveType,
	shardStatAtLevel,
	shardStatsInput,
} from "./rune-shards"

function shard(...stats: ShardStat[]) {
	return { stats }
}

const ADAPTIVE = shard({ stat: "adaptiveForce", min: 9, max: 9 })
const HEALTH_SCALING = shard({ stat: "health", min: 10, max: 180 })
const TENACITY = shard(
	{ stat: "tenacityPercent", min: 0.15, max: 0.15 },
	{ stat: "slowResistPercent", min: 0.15, max: 0.15 },
)

describe("shardStatAtLevel", () => {
	test("health scaling gives 10 per level, from 10 at level 1 to 180 at 18", () => {
		const scaling = { min: 10, max: 180 }
		expect(shardStatAtLevel(scaling, 1)).toBe(10)
		expect(shardStatAtLevel(scaling, 11)).toBeCloseTo(110)
		expect(shardStatAtLevel(scaling, 18)).toBe(180)
	})

	test("a flat shard is the same at every level", () => {
		expect(shardStatAtLevel({ min: 65, max: 65 }, 7)).toBe(65)
	})
})

describe("resolveAdaptiveType", () => {
	test("follows the larger bonus stat from items", () => {
		expect(
			resolveAdaptiveType("ap", { attackDamage: 40, abilityPower: 0 }),
		).toBe("ad")
		expect(
			resolveAdaptiveType("ad", { attackDamage: 10, abilityPower: 90 }),
		).toBe("ap")
	})

	test("uses the champion's default when the bonuses are equal", () => {
		const none = { attackDamage: 0, abilityPower: 0 }
		expect(resolveAdaptiveType("ap", none)).toBe("ap")
		expect(resolveAdaptiveType("ad", none)).toBe("ad")
	})
})

describe("shardStatsInput", () => {
	test("adaptive force is 9 ability power for an AP champion without items", () => {
		const { stats } = shardStatsInput([ADAPTIVE], {
			level: 1,
			defaultAdaptiveType: "ap",
			items: [],
		})
		expect(stats).toEqual({ abilityPower: 9 })
	})

	test("adaptive force is 5.4 attack damage once items give more AD than AP", () => {
		const { stats } = shardStatsInput([ADAPTIVE, ADAPTIVE], {
			level: 1,
			defaultAdaptiveType: "ap",
			items: [{ stats: { attackDamage: 10 } }],
		})
		expect(stats.attackDamage).toBeCloseTo(10.8)
		expect(stats.abilityPower).toBeUndefined()
	})

	test("adds up scaling and flat health, and one shard can give two stats", () => {
		const { stats } = shardStatsInput(
			[HEALTH_SCALING, shard({ stat: "health", min: 65, max: 65 }), TENACITY],
			{ level: 18, defaultAdaptiveType: "ad", items: [] },
		)
		expect(stats).toEqual({
			health: 245,
			tenacityPercent: 0.15,
			slowResistPercent: 0.15,
		})
	})
})
