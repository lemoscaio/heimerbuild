import { describe, expect, test } from "bun:test"
import type { RankStat } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import type { BuildEffect, Effect } from "./effect"
import {
	activeEffects,
	alwaysOnRankStats,
	effectStatsInput,
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
	sourceUrl: `${WIKI}Ghost`,
}
const barrier: Effect = {
	id: "barrier",
	source: { kind: "summoner", spellKey: "SummonerBarrier" },
	trigger: { kind: "after-use" },
	grants: [
		{ kind: "shield", amount: { by: "level", value: "shieldstrength" } },
	],
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
			sourceUrl: `${WIKI}Sheen`,
		}

		expect(resolveGrants(bind(barrier), context)).toEqual([])
		expect(resolveGrants(bind(spellblade), context)).toEqual([])
	})
})

describe("effectStatsInput", () => {
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
