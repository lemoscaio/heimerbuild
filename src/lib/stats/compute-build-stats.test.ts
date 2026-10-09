import { describe, expect, test } from "bun:test"
import type { ShardStat } from "@schemas/rune"
import type { BuildEffect, Effect } from "../effects/effect"
import {
	type BuildStatsInput,
	computeBuildStats,
	percentBonusBasis,
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

// Rabadon's Magical Opus: 30% of ability power.
const apFromAp = alwaysOn("ap-from-ap", [
	{
		kind: "stat",
		stat: "abilityPower",
		amount: { by: "percentOfTotal", stat: "abilityPower", ratio: 0.3 },
	},
])

describe("computeBuildStats with percent-of-total bonuses", () => {
	const plain = { ...build, shards: [] }
	const DEATHCAP = { stats: { abilityPower: 130 } }
	const withEffects = (
		available: BuildEffect[],
		change: Partial<BuildStatsInput> = {},
	) =>
		computeBuildStats({
			...plain,
			items: [DEATHCAP],
			effects: { available, overrides: {} },
			...change,
		})

	test("a bonus is its ratio of the stat's total: 130 ability power becomes 169", () => {
		expect(withEffects([apFromAp]).abilityPower.total).toBeCloseTo(169)
	})

	test("it applies after every flat source: items, shards, effects and stat-dependent bonuses", () => {
		const flatAp = alwaysOn("flat-ap", [
			{ kind: "stat", stat: "abilityPower", amount: 40 },
		])
		const apFromHealth = alwaysOn("ap-from-health", [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: { by: "stat", stat: "health", ratio: 0.01 },
			},
		])
		const effects = [apFromAp, flatAp, apFromHealth]
		const before = withEffects([flatAp, apFromHealth], { shards: [ADAPTIVE] })

		expect(before.abilityPower.total).toBeCloseTo(
			130 + 9 + 40 + before.health.total * 0.01,
		)
		expect(
			withEffects(effects, { shards: [ADAPTIVE] }).abilityPower.total,
		).toBeCloseTo(before.abilityPower.total * 1.3)
	})

	test("it includes the effects turned on and the match stacks", () => {
		const burstAp: BuildEffect = alwaysOn("burst-ap", [
			{ kind: "stat", stat: "abilityPower", amount: 50 },
		])
		const switched: BuildEffect = {
			...burstAp,
			effect: { ...burstAp.effect, trigger: { kind: "after-use" } },
		}
		const stacked = alwaysOn("stacked-ap", [
			{
				kind: "stat",
				stat: "abilityPower",
				amount: {
					by: "matchStacks",
					source: { id: "ap-stacks", name: "AP stacks", sliderMax: 500 },
				},
			},
		])
		const stats = computeBuildStats({
			...plain,
			items: [DEATHCAP],
			effects: {
				available: [apFromAp, switched, stacked],
				overrides: { "burst-ap": true },
			},
			matchStacks: { "ap-stacks": 100 },
		})

		expect(stats.abilityPower.total).toBeCloseTo((130 + 50 + 100) * 1.3)
	})

	test("it never feeds itself, and the stat-dependent bonuses read the total before it", () => {
		const speedFromAp = alwaysOn("speed-from-ap", [
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				amount: { by: "stat", stat: "abilityPower", ratio: 0.001 },
			},
		])
		const without = withEffects([speedFromAp])
		const stats = withEffects([apFromAp, speedFromAp])

		expect(stats.abilityPower.total).toBeCloseTo(130 * 1.3)
		expect(stats.movementSpeed.total).toBe(without.movementSpeed.total)
	})

	test("the basis is the totals it reads: the build with its stat-dependent bonuses", () => {
		const input = {
			...plain,
			items: [DEATHCAP, CLOTH_ARMOR],
			effects: { available: [apFromAp, armorFromArmor], overrides: {} },
		}

		expect(percentBonusBasis(input)).toEqual(
			computeBuildStats({
				...input,
				effects: { available: [armorFromArmor], overrides: {} },
			}),
		)
		expect(statBonusBasis(input).abilityPower.total).toBe(130)
	})
})

// A Shyvana-like form behind an R point, with a bonus bound to it.
const formed: BuildStatsInput["champion"] = {
	...champion,
	forms: [
		{ id: "human", name: "Human" },
		{ id: "dragon", name: "Dragon", requires: { slot: "R", minRank: 1 } },
	],
}
const healthBonus = alwaysOn(
	"dragon-health",
	[{ kind: "stat", stat: "health", amount: 250 }],
	{ slot: "R" },
)
const dragonHealth: BuildEffect = {
	...healthBonus,
	effect: { ...healthBonus.effect, form: "dragon" },
}

describe("computeBuildStats with forms", () => {
	const inForm = (form: string | undefined, R = 1) =>
		computeBuildStats({
			...build,
			champion: formed,
			form,
			ranks: { ...NO_RANKS, R },
			effects: { available: [dragonHealth], overrides: {} },
		})

	test("an effect bound to a form adds its bonus only in that form", () => {
		expect(inForm("dragon").health.total - inForm(undefined).health.total).toBe(
			250,
		)
		expect(inForm("human")).toEqual(inForm(undefined))
	})

	test("a form missing its required rank is the default form", () => {
		expect(inForm("dragon", 0)).toEqual(inForm(undefined, 0))
	})
})

function multiplier(of: "bonus" | "total", amount: number) {
	return alwaysOn(`${of}-multiplier`, [
		{ kind: "attackSpeedMultiplier", of, amount },
	])
}

describe("computeBuildStats with attack speed multipliers", () => {
	const plain = { ...build, shards: [] }
	const DAGGER = { stats: { attackSpeedPercent: 0.35 } }
	const before = computeBuildStats({ ...plain, items: [DAGGER] }).attackSpeed
	const withEffects = (...available: BuildEffect[]) =>
		computeBuildStats({
			...plain,
			items: [DAGGER],
			effects: { available, overrides: {} },
		}).attackSpeed

	test("a bonus multiplier scales the bonus attack speed, level growth included", () => {
		const stats = withEffects(multiplier("bonus", -0.1))

		expect(stats.base).toBe(before.base)
		expect(stats.bonus).toBeCloseTo(before.bonus * 0.9)
	})

	test("a total multiplier scales the whole attack speed", () => {
		expect(withEffects(multiplier("total", 0.2)).total).toBeCloseTo(
			before.total * 1.2,
		)
	})

	test("the bonus multiplier applies first, then the total one", () => {
		expect(
			withEffects(multiplier("total", 0.2), multiplier("bonus", -0.1)).total,
		).toBeCloseTo((before.base + before.bonus * 0.9) * 1.2)
	})

	test("they apply after the stat-dependent bonuses, which read the attack speed before them", () => {
		const asFromAs = alwaysOn("as-from-as", [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: { by: "stat", stat: "attackSpeed", ratio: 0.1 },
			},
		])
		const basis = statBonusBasis({
			...plain,
			items: [DAGGER],
			effects: {
				available: [asFromAs, multiplier("total", 0.2)],
				overrides: {},
			},
		})

		expect(basis.attackSpeed).toEqual(before)
		expect(withEffects(asFromAs, multiplier("total", 0.2)).total).toBeCloseTo(
			withEffects(asFromAs).total * 1.2,
		)
	})
})
