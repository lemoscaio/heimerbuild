import { describe, expect, test } from "bun:test"
import type { AbilityRankValue, RankStat } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { ComputedStats } from "../stats/compute-stats"
import type { BuildEffect, Effect } from "./effect"
import {
	activeEffects,
	alwaysOnRankStats,
	effectStatsInput,
	isEffectOn,
	resolveAmount,
	resolveGrants,
} from "./evaluate"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

function perLevel(first: number, last: number) {
	return Array.from(
		{ length: 18 },
		(_, index) => first + ((last - first) * index) / 17,
	)
}

function spell(
	fields: Pick<SummonerSpell, "key" | "name" | "cooldown" | "values">,
): SummonerSpell {
	return {
		id: "0",
		icon: "https://ddragon.leagueoflegends.com/cdn/img/spell.png",
		description: fields.name,
		longDescription: [[[{ text: fields.name }]]],
		...fields,
	}
}

// Patch 16.19.1 values (public/data/16.19.1/summoner-spells.json).
const GHOST = spell({
	key: "SummonerHaste",
	name: "Ghost",
	cooldown: 240,
	values: { movespeedmod: perLevel(0.24, 0.48), duration: perLevel(10, 10) },
})
const BARRIER = spell({
	key: "SummonerBarrier",
	name: "Barrier",
	cooldown: 180,
	values: { shieldstrength: perLevel(100, 460) },
})
const FLASH = spell({
	key: "SummonerFlash",
	name: "Flash",
	cooldown: 300,
	values: {},
})

const TEEMO_W: RankStat = {
	slot: "W",
	stat: "movementSpeedPercent",
	values: [0.12, 0.16, 0.2, 0.24, 0.28],
}
const RANKS = { Q: 1, W: 3, E: 1, R: 0 }

function bind(effect: Effect, fields: Partial<BuildEffect> = {}): BuildEffect {
	return { id: effect.id, effect, name: effect.id, icon: "", ...fields }
}

const passive: Effect = {
	id: "teemo-w-passive",
	source: { kind: "ability", championKey: "Teemo", slot: "W" },
	trigger: { kind: "while", condition: "not-damaged-recently" },
	stacking: { group: "teemo-w", rule: "replace", priority: 0 },
	grants: [
		{
			kind: "stat",
			stat: "movementSpeedPercent",
			amount: { by: "rank", rankStat: "movementSpeedPercent" },
		},
	],
	since: "16.19",
	sourceUrl: `${WIKI}Teemo`,
}
const active: Effect = {
	...passive,
	id: "teemo-w-active",
	trigger: { kind: "after-use" },
	stacking: { group: "teemo-w", rule: "replace", priority: 1 },
	grants: [
		{
			kind: "stat",
			stat: "movementSpeedPercent",
			amount: { by: "rank", rankStat: "movementSpeedPercent", scale: 2 },
		},
	],
}
const ghost: Effect = {
	id: "ghost",
	source: { kind: "summoner", spellKey: "SummonerHaste" },
	trigger: { kind: "after-use" },
	grants: [
		{
			kind: "stat",
			stat: "movementSpeedPercent",
			amount: { by: "level", value: "movespeedmod" },
		},
	],
	since: "16.19",
	sourceUrl: `${WIKI}Ghost`,
}
const barrier: Effect = {
	id: "barrier",
	source: { kind: "summoner", spellKey: "SummonerBarrier" },
	trigger: { kind: "after-use" },
	grants: [
		{ kind: "shield", amount: { by: "level", value: "shieldstrength" } },
	],
	since: "16.19",
	sourceUrl: `${WIKI}Barrier`,
}
const brackets = [
	{ from: 0, value: 0.15 },
	{ from: 100, value: 0.35 },
	{ from: 250, value: 0.45 },
]

const teemoPassive = bind(passive, { slot: "W" })
const teemoActive = bind(active, { slot: "W" })
const ghostEffect = bind(ghost, { spell: GHOST })
const context = { level: 9, ranks: RANKS, rankStats: [TEEMO_W] }

// Malphite's W tooltip line (16.19.1) and an armor passive reading it, on by default with no switch.
const ARMOR_LINE: AbilityRankValue = {
	label: "Armor",
	values: [10, 15, 20, 25, 30],
	unit: "%",
}
const ARMOR_RATIO = { by: "rankValue", label: "Armor", scale: 0.01 } as const
const armorPassive: Effect = {
	id: "malphite-w-passive",
	source: { kind: "ability", championKey: "Malphite", slot: "W" },
	trigger: { kind: "always" },
	grants: [
		{
			kind: "stat",
			stat: "armor",
			amount: { by: "stat", stat: "armor", ratio: ARMOR_RATIO },
		},
	],
	since: "16.19",
	sourceUrl: `${WIKI}Malphite`,
}
const malphiteW = bind(armorPassive, { slot: "W", rankValues: [ARMOR_LINE] })

function totalsWith(stats: Partial<Record<keyof ComputedStats, number>>) {
	return Object.fromEntries(
		Object.entries(stats).map(([stat, total]) => [
			stat,
			{ base: total, bonus: 0, total },
		]),
	) as unknown as ComputedStats
}

describe("activeEffects", () => {
	const available = [teemoPassive, ghostEffect]

	test("with no choices, each effect follows its trigger's default", () => {
		expect(activeEffects(available, {}, context)).toEqual([teemoPassive])
	})

	test("the user's choices turn effects on and off", () => {
		expect(
			activeEffects(
				available,
				{ ghost: true, "teemo-w-passive": false },
				context,
			),
		).toEqual([ghostEffect])
	})

	test("an always-on effect keeps its default whatever the choices say", () => {
		expect(isEffectOn(malphiteW, { "malphite-w-passive": false })).toBe(true)
		expect(
			activeEffects([malphiteW], { "malphite-w-passive": false }, context),
		).toEqual([malphiteW])
	})

	test("in a replace group, the higher priority applies", () => {
		expect(
			activeEffects(
				[teemoPassive, teemoActive],
				{ "teemo-w-active": true },
				context,
			),
		).toEqual([teemoActive])
	})
})

describe("resolveAmount", () => {
	test("a fixed number is itself", () => {
		expect(resolveAmount(3, ghostEffect, context)).toBe(3)
	})

	test("a level table reads the spell's value at the champion level", () => {
		const amount = { by: "level", value: "movespeedmod" } as const

		expect(resolveAmount(amount, ghostEffect, { level: 1 })).toBeCloseTo(0.24)
		expect(resolveAmount(amount, ghostEffect, { level: 18 })).toBeCloseTo(0.48)
		expect(
			resolveAmount({ ...amount, value: "unknown" }, ghostEffect, context),
		).toBeUndefined()
	})

	test("a rank table reads the ability's rank stat at its rank, scaled", () => {
		const amount = { by: "rank", rankStat: "movementSpeedPercent" } as const

		expect(resolveAmount(amount, teemoPassive, context)).toBeCloseTo(0.2)
		expect(
			resolveAmount({ ...amount, scale: 2 }, teemoPassive, context),
		).toBeCloseTo(0.4)
		expect(
			resolveAmount(amount, teemoPassive, {
				...context,
				ranks: { ...RANKS, W: 0 },
			}),
		).toBeUndefined()
	})

	test("a cooldown table reads the bracket of the spell's cooldown", () => {
		const amount = { by: "summonerCooldown", brackets } as const

		expect(resolveAmount(amount, bind(ghost, { spell: FLASH }), context)).toBe(
			0.45,
		)
		expect(resolveAmount(amount, ghostEffect, context)).toBe(0.35)
		expect(
			resolveAmount(
				amount,
				bind(ghost, { spell: { ...GHOST, cooldown: 15 } }),
				context,
			),
		).toBe(0.15)
	})
})

describe("resolveAmount, amounts that read the build", () => {
	test("a rank value reads the ability's synced tooltip line at its rank, scaled", () => {
		expect(resolveAmount(ARMOR_RATIO, malphiteW, context)).toBeCloseTo(0.2)
		expect(
			resolveAmount({ ...ARMOR_RATIO, label: "Renamed" }, malphiteW, context),
		).toBeUndefined()
		expect(
			resolveAmount(ARMOR_RATIO, malphiteW, {
				...context,
				ranks: { ...RANKS, W: 0 },
			}),
		).toBeUndefined()
	})

	test("a stat amount is its ratio of the given totals, and nothing without them", () => {
		const amount = { by: "stat", stat: "armor", ratio: ARMOR_RATIO } as const
		const totals = totalsWith({ armor: 150 })

		expect(resolveAmount(amount, malphiteW, { ...context, totals })).toBe(30)
		expect(resolveAmount(amount, malphiteW, context)).toBeUndefined()
	})

	test("a missing health amount grows with missing health up to its full value", () => {
		// Tryndamere's Q: the most bonus AD at 90% missing health.
		const amount = { by: "missingHealth", max: 80, fullAt: 90 } as const
		const at = (currentHealth?: number) =>
			resolveAmount(amount, malphiteW, { ...context, currentHealth })

		expect(at()).toBe(0)
		expect(at(100)).toBe(0)
		expect(at(55)).toBeCloseTo(40)
		expect(at(10)).toBe(80)
		expect(at(1)).toBe(80)
	})

	test("a triangular game time amount adds one more step every 10 minutes, with no cap", () => {
		// Gathering Storm: 8 × n(n+1)/2 after n full 10-minute steps.
		const amount = {
			by: "gameTime",
			every: 10,
			growth: "triangular",
			step: 8,
		} as const
		const at = (gameTime?: number) =>
			resolveAmount(amount, malphiteW, { ...context, gameTime })

		expect(at()).toBe(0)
		expect(at(9)).toBe(0)
		expect(at(10)).toBe(8)
		expect(at(20)).toBe(24)
		expect(at(30)).toBe(48)
		expect(at(60)).toBe(168)
		expect(at(75)).toBe(224)
	})
})

describe("resolveGrants, Adaptive Force", () => {
	const storm = bind({
		id: "gathering-storm",
		source: { kind: "rune", runeKey: "GatheringStorm" },
		trigger: { kind: "always" },
		grants: [{ kind: "stat", stat: "adaptiveForce", amount: 48 }],
		since: "16.19",
		sourceUrl: `${WIKI}Gathering_Storm`,
	})

	test("becomes ability power or 0.6 attack damage per point, by the build's adaptive type", () => {
		expect(resolveGrants(storm, { ...context, adaptiveType: "ap" })).toEqual([
			{ kind: "stat", stat: "abilityPower", value: 48 },
		])
		expect(resolveGrants(storm, { ...context, adaptiveType: "ad" })).toEqual([
			{ kind: "stat", stat: "attackDamage", value: expect.closeTo(28.8) },
		])
	})

	test("has no value without an adaptive type", () => {
		expect(resolveGrants(storm, context)).toEqual([])
	})
})

describe("resolveGrants", () => {
	test("gives each grant's value at the build's state", () => {
		expect(resolveGrants(ghostEffect, context)).toEqual([
			{
				kind: "stat",
				stat: "movementSpeedPercent",
				value: expect.closeTo(0.24 + (0.24 * 8) / 17),
			},
		])
		expect(
			resolveGrants(bind(barrier, { spell: BARRIER }), { level: 18 }),
		).toEqual([{ kind: "shield", value: 460 }])
	})

	test("leaves out a grant its data lacks, and damage until the combo timeline", () => {
		const spellblade: Effect = {
			id: "sheen-spellblade",
			source: { kind: "item", itemId: "3057" },
			trigger: { kind: "after-ability" },
			grants: [
				{
					kind: "damage",
					damageType: "physical",
					ratios: { baseAttackDamage: 1 },
				},
			],
			since: "16.19",
			sourceUrl: `${WIKI}Sheen`,
		}

		expect(resolveGrants(bind(barrier), context)).toEqual([])
		expect(resolveGrants(bind(spellblade), context)).toEqual([])
	})
})

describe("effectStatsInput", () => {
	test("a stat grant tells the stat and ratio it reads", () => {
		expect(
			resolveGrants(malphiteW, {
				...context,
				totals: totalsWith({ armor: 100 }),
			}),
		).toEqual([
			{
				kind: "stat",
				stat: "armor",
				value: expect.closeTo(20),
				basis: { stat: "armor", ratio: expect.closeTo(0.2) },
			},
		])
	})

	test("the effects step leaves the stat-dependent grants for their own step", () => {
		const totals = totalsWith({ armor: 100 })
		const active = [teemoPassive, malphiteW]

		expect(effectStatsInput(active, { ...context, totals })).toEqual({
			stats: { movementSpeedPercent: expect.closeTo(0.2) },
		})
		expect(
			effectStatsInput(
				active,
				{ ...context, totals },
				{ step: "stat-dependent" },
			),
		).toEqual({ stats: { armor: expect.closeTo(20) } })
	})

	test("sums the active effects' stats; shields stay out", () => {
		const input = effectStatsInput(
			[teemoPassive, ghostEffect, bind(barrier, { spell: BARRIER })],
			{ ...context, level: 18 },
		)

		expect(input).toEqual({
			stats: { movementSpeedPercent: expect.closeTo(0.2 + 0.48) },
		})
	})
})

describe("alwaysOnRankStats", () => {
	const armor: RankStat = { slot: "R", stat: "armor", values: [10, 15, 20] }

	test("a rank stat an available effect reads is that effect's", () => {
		expect(alwaysOnRankStats([TEEMO_W, armor], [teemoPassive])).toEqual([armor])
	})

	test("without effects, every rank stat applies", () => {
		expect(alwaysOnRankStats([TEEMO_W, armor], [ghostEffect])).toEqual([
			TEEMO_W,
			armor,
		])
		expect(alwaysOnRankStats(undefined, [teemoPassive])).toBeUndefined()
	})
})
