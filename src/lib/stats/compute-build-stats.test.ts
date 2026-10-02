import { describe, expect, test } from "bun:test"
import type { ShardStat } from "@schemas/rune"
import { type BuildStatsInput, computeBuildStats } from "./compute-build-stats"
import { computeStats } from "./compute-stats"

// Heimerdinger's stats, patch 16.19.1, with Olaf's R values for the ranks.
const champion: BuildStatsInput["champion"] = {
	resource: "MANA",
	adaptiveType: "ap",
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
	rankStats: [{ slot: "R", stat: "armor", values: [10, 15, 20] }],
}

function shard(...stats: ShardStat[]) {
	return { stats }
}

const ADAPTIVE = shard({ stat: "adaptiveForce", min: 9, max: 9 })
const HEALTH_SCALING = shard({ stat: "health", min: 10, max: 180 })
const LONG_SWORD = { stats: { attackDamage: 10 } }
const AMPLIFYING_TOME = { stats: { abilityPower: 20 } }
const NO_RANKS = { Q: 0, W: 0, E: 0, R: 0 }

const build: BuildStatsInput = {
	champion,
	level: 11,
	items: [AMPLIFYING_TOME],
	shards: [ADAPTIVE, HEALTH_SCALING],
	ranks: { ...NO_RANKS, R: 1 },
}

describe("computeBuildStats", () => {
	test("without shards, it is the champion with its items and ranks alone", () => {
		expect(computeBuildStats({ ...build, shards: [] })).toEqual(
			computeStats(champion, 11, [AMPLIFYING_TOME], { ranks: build.ranks }),
		)
	})

	test("adds the shards on top of the items, scaled to the level", () => {
		const withShards = computeBuildStats(build)
		const withoutShards = computeBuildStats({ ...build, shards: [] })

		expect(
			withShards.abilityPower.total - withoutShards.abilityPower.total,
		).toBe(9)
		expect(withShards.health.total - withoutShards.health.total).toBeCloseTo(
			110,
		)
	})

	test("adaptive force follows the items: attack damage once they give more of it", () => {
		const stats = computeBuildStats({ ...build, items: [LONG_SWORD] })

		expect(stats.attackDamage.bonus).toBeCloseTo(10 + 9 * 0.6)
		expect(stats.abilityPower.total).toBe(0)
	})

	test("a what-if is the same call with one input changed", () => {
		const now = computeBuildStats(build)
		const nextRank = computeBuildStats({
			...build,
			ranks: { ...NO_RANKS, R: 2 },
		})
		const withItem = computeBuildStats({
			...build,
			items: [...build.items, AMPLIFYING_TOME],
		})

		expect(nextRank.armor.total - now.armor.total).toBe(5)
		expect(withItem.abilityPower.total - now.abilityPower.total).toBe(20)
	})
})
