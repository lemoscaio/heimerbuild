import { describe, expect, test } from "bun:test"
import type { ShardStat } from "@schemas/rune"
import type { BuildEffect, Effect } from "../effects/effect"
import {
	type BuildStatsInput,
	computeBuildStats,
	statBonusBasis,
} from "./compute-build-stats"
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
	patch: "16.19.1",
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

const BOOTS = { stats: { movementSpeedFlat: 25 } }

// A Teemo W-like passive reading the R armor rank stat, and a flat speed boost turned on by hand.
const restingArmor: BuildEffect = {
	id: "resting-armor",
	name: "Resting armor",
	icon: "",
	slot: "R",
	effect: {
		id: "resting-armor",
		source: { kind: "ability", championKey: "Heimerdinger", slot: "R" },
		trigger: { kind: "while", condition: "not-damaged-recently" },
		grants: [
			{
				kind: "stat",
				stat: "armor",
				amount: { by: "rank", rankStat: "armor" },
			},
		],
		since: "16.19",
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Olaf",
	},
}
const sprint: Effect = {
	id: "sprint",
	source: { kind: "summoner", spellKey: "SummonerHaste" },
	trigger: { kind: "after-use" },
	grants: [{ kind: "stat", stat: "movementSpeedPercent", amount: 0.2 }],
	since: "16.19",
	sourceUrl: "https://wiki.leagueoflegends.com/en-us/Ghost",
}
const sprintEffect: BuildEffect = {
	id: "sprint",
	name: "Sprint",
	icon: "",
	effect: sprint,
}

describe("computeBuildStats with effects", () => {
	test("an effect on by default keeps the totals of its always-on rank stat", () => {
		for (const R of [1, 2, 3]) {
			const ranked = { ...build, ranks: { ...NO_RANKS, R } }
			expect(
				computeBuildStats({
					...ranked,
					effects: { available: [restingArmor], overrides: {} },
				}),
			).toEqual(computeBuildStats(ranked))
		}
	})

	test("turning that effect off drops its rank stat", () => {
		const stats = computeBuildStats({
			...build,
			effects: {
				available: [restingArmor],
				overrides: { "resting-armor": false },
			},
		})

		expect(computeBuildStats(build).armor.total - stats.armor.total).toBe(10)
	})

	test("an effect off by default changes nothing until it is turned on", () => {
		const effects = { available: [sprintEffect], overrides: {} }

		expect(computeBuildStats({ ...build, effects })).toEqual(
			computeBuildStats(build),
		)
		expect(
			computeBuildStats({
				...build,
				effects: { ...effects, overrides: { sprint: true } },
			}).movementSpeed.total,
		).toBeCloseTo(340 * 1.2)
	})

	test("effects without a stacking group add up before the soft caps", () => {
		const boost: BuildEffect = {
			...sprintEffect,
			id: "boost",
			effect: { ...sprint, id: "boost" },
		}
		const stats = computeBuildStats({
			...build,
			effects: {
				available: [sprintEffect, boost],
				overrides: { sprint: true, boost: true },
			},
		})

		expect(stats.movementSpeed.total).toBeCloseTo(340 * 1.4 * 0.8 + 83)
	})

	test("effect stats add to the item bonuses before the soft caps", () => {
		const stats = computeBuildStats({
			...build,
			items: [BOOTS],
			effects: { available: [sprintEffect], overrides: { sprint: true } },
		})
		const raw = (340 + 25) * 1.2

		expect(stats.movementSpeed.base).toBe(340)
		expect(stats.movementSpeed.total).toBeCloseTo(raw * 0.8 + 83)
	})
})

function alwaysOn(
	id: string,
	grants: Effect["grants"],
	fields: Partial<BuildEffect> = {},
): BuildEffect {
	return {
		id,
		name: id,
		icon: "",
		effect: {
			id,
			source: { kind: "ability", championKey: "Heimerdinger", slot: "W" },
			trigger: { kind: "always" },
			grants,
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/Malphite",
		},
		...fields,
	}
}

// Malphite's W at rank 5 (30% of armor), Dr. Mundo's E at rank 1 (2% of maximum health).
const armorFromArmor = alwaysOn("armor-from-armor", [
	{
		kind: "stat",
		stat: "armor",
		amount: { by: "stat", stat: "armor", ratio: 0.3 },
	},
])
const adFromHealth = alwaysOn("ad-from-health", [
	{
		kind: "stat",
		stat: "attackDamage",
		amount: { by: "stat", stat: "health", ratio: 0.02 },
	},
])
const healthFromAd = alwaysOn("health-from-ad", [
	{
		kind: "stat",
		stat: "health",
		amount: { by: "stat", stat: "attackDamage", ratio: 1 },
	},
])
const CLOTH_ARMOR = { stats: { armor: 15 } }

describe("computeBuildStats with stat-dependent bonuses", () => {
	const plain = { ...build, shards: [] }
	const withEffects = (...available: BuildEffect[]) =>
		computeBuildStats({ ...plain, effects: { available, overrides: {} } })

	test("a bonus is its ratio of the totals before it, items and effects included", () => {
		const before = computeBuildStats({ ...plain, items: [CLOTH_ARMOR] })
		const stats = computeBuildStats({
			...plain,
			items: [CLOTH_ARMOR],
			effects: { available: [armorFromArmor], overrides: {} },
		})

		expect(stats.armor.total).toBeCloseTo(before.armor.total * 1.3)
		expect(stats.armor.base).toBe(before.armor.base)
	})

	test("a bonus never feeds itself: 30% of armor adds 30% once, not compounding", () => {
		const before = computeBuildStats(plain).armor.total
		const after = withEffects(armorFromArmor).armor.total

		expect(after - before).toBeCloseTo(before * 0.3)
		expect(after).not.toBeCloseTo(before / (1 - 0.3))
	})

	test("bonuses never read each other, so their order does not matter", () => {
		const before = computeBuildStats(plain)
		const forward = withEffects(adFromHealth, healthFromAd)

		expect(forward).toEqual(withEffects(healthFromAd, adFromHealth))
		expect(forward.attackDamage.total).toBeCloseTo(
			before.attackDamage.total + before.health.total * 0.02,
		)
		expect(forward.health.total).toBeCloseTo(
			before.health.total + before.attackDamage.total,
		)
	})

	test("the basis is the totals the bonuses read", () => {
		const input = {
			...plain,
			effects: { available: [armorFromArmor], overrides: {} },
		}

		expect(statBonusBasis(input)).toEqual(computeBuildStats(plain))
	})

	test("a movement speed bonus applies before the soft caps", () => {
		const speedFromAp = alwaysOn("speed-from-ap", [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: { by: "stat", stat: "abilityPower", ratio: 0.0002 },
			},
		])
		const stats = computeBuildStats({
			...plain,
			items: [{ stats: { abilityPower: 1000 } }, BOOTS],
			effects: { available: [speedFromAp], overrides: {} },
		})

		expect(stats.movementSpeed.total).toBeCloseTo((340 + 25) * 1.2 * 0.8 + 83)
	})

	test("the current health reaches the effects that read it", () => {
		const bloodlust = alwaysOn("bloodlust", [
			{
				kind: "stat",
				stat: "attackDamage",
				amount: { by: "missingHealth", max: 80, fullAt: 90 },
			},
		])
		const effects = { available: [bloodlust], overrides: {} }
		const atHealth = (currentHealth?: number) =>
			computeBuildStats({ ...plain, effects, currentHealth }).attackDamage.bonus

		expect(atHealth()).toBe(0)
		expect(atHealth(55)).toBeCloseTo(40)
		expect(atHealth(5)).toBeCloseTo(80)
	})
})
