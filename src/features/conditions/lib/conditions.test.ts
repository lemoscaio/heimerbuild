import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { conditionList, readConditions, setCondition } from "./conditions"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

function bind(effect: Effect): BuildEffect {
	return { id: effect.id, effect, name: effect.id, icon: "", slot: "W" }
}

const passive = bind({
	id: "teemo-w-passive",
	source: { kind: "ability", championKey: "Teemo", slot: "W" },
	trigger: { kind: "while", condition: "not-damaged-recently" },
	part: "passive",
	stacking: { group: "teemo-w-speed", rule: "replace", priority: 0 },
	grants: [
		{
			kind: "stat",
			stat: "movementSpeedPercent",
			amount: { by: "rank", rankStat: "movementSpeedPercent" },
		},
	],
	since: "16.19",
	sourceUrl: `${WIKI}Teemo`,
})
const barrier = bind({
	id: "barrier",
	source: { kind: "summoner", spellKey: "SummonerBarrier" },
	trigger: { kind: "after-use" },
	duration: 2.5,
	grants: [{ kind: "shield", amount: 280 }],
	since: "16.19",
	sourceUrl: `${WIKI}Barrier`,
})
const active = bind({
	...passive.effect,
	id: "teemo-w-active",
	trigger: { kind: "after-use" },
	part: "active",
	stacking: { group: "teemo-w-speed", rule: "replace", priority: 1 },
})
const bloodlust = bind({
	id: "tryndamere-q-passive",
	source: { kind: "ability", championKey: "Tryndamere", slot: "Q" },
	trigger: { kind: "always" },
	part: "passive",
	grants: [
		{
			kind: "stat",
			stat: "attackDamage",
			amount: { by: "missingHealth", max: 80, fullAt: 90 },
		},
	],
	since: "16.19",
	sourceUrl: `${WIKI}Tryndamere`,
})
const effects = [passive, barrier]
const gatheringStorm: BuildEffect = {
	id: "gathering-storm",
	name: "Gathering Storm",
	icon: "",
	effect: {
		id: "gathering-storm",
		source: { kind: "rune", runeKey: "GatheringStorm" },
		trigger: { kind: "always" },
		grants: [
			{
				kind: "stat",
				stat: "adaptiveForce",
				amount: { by: "gameTime", every: 10, growth: "triangular", step: 8 },
			},
		],
		since: "16.19",
		sourceUrl: `${WIKI}Gathering_Storm`,
	},
}

describe("readConditions", () => {
	test("keeps the choices that differ from an available effect's default", () => {
		expect(
			readConditions({ barrier: true, "teemo-w-passive": false }, effects),
		).toEqual({ "teemo-w-passive": false, barrier: true })
	})

	test("drops a choice equal to the default or for an effect the build lacks", () => {
		expect(
			readConditions(
				{ barrier: false, "teemo-w-passive": true, ghost: true },
				effects,
			),
		).toEqual({})
	})

	test("drops a choice for an always-on effect, which has no switch", () => {
		expect(
			readConditions({ "tryndamere-q-passive": false }, [bloodlust]),
		).toEqual({})
	})

	test("keeps every choice while the effects load", () => {
		expect(readConditions({ ghost: true }, undefined)).toEqual({ ghost: true })
	})
})

describe("conditionList, game time", () => {
	test("gives an effect that grows with the game time its value now and at the next step", () => {
		const [storm] = conditionList(
			[gatheringStorm],
			{},
			{ level: 1, gameTime: 25, adaptiveType: "ap" },
		)

		expect(storm?.usesGameTime).toBe(true)
		expect(storm?.grants).toEqual([
			{ kind: "stat", stat: "abilityPower", value: 24 },
		])
		expect(storm?.next).toEqual({
			gameTime: 30,
			grants: [{ kind: "stat", stat: "abilityPower", value: 48 }],
		})
	})
})

describe("conditionList, forms", () => {
	const dragonForm = bind({
		...bloodlust.effect,
		id: "shyvana-r-dragon-form",
		form: "dragon",
		grants: [{ kind: "stat", stat: "health", amount: 250 }],
	})

	test("lists a form's effect only while the champion is in that form", () => {
		const rows = (form: string) =>
			conditionList([dragonForm, barrier], {}, { level: 6, form }).map(
				({ effect }) => effect.id,
			)

		expect(rows("dragon")).toEqual(["shyvana-r-dragon-form", "barrier"])
		expect(rows("human")).toEqual(["barrier"])
	})
})

describe("setCondition", () => {
	test("records a switch that leaves the default, and forgets one that returns to it", () => {
		const on = setCondition({}, barrier, true)
		expect(on).toEqual({ barrier: true })
		expect(setCondition(on, barrier, false)).toEqual({})
		expect(setCondition(on, passive, false)).toEqual({
			barrier: true,
			"teemo-w-passive": false,
		})
	})
})

describe("conditionList", () => {
	test("gives each effect its switch, values and duration at the build's state", () => {
		const context = {
			level: 9,
			ranks: { Q: 1, W: 2, E: 0, R: 0 },
			rankStats: [
				{
					slot: "W" as const,
					stat: "movementSpeedPercent" as const,
					values: [0.12, 0.16, 0.2, 0.24, 0.28],
				},
			],
		}

		expect(conditionList(effects, { barrier: true }, context)).toEqual([
			{
				effect: passive,
				isOn: true,
				isSwitchable: true,
				usesCurrentHealth: false,
				usesGameTime: false,
				stackSources: [],
				grants: [{ kind: "stat", stat: "movementSpeedPercent", value: 0.16 }],
				duration: undefined,
				next: undefined,
			},
			{
				effect: barrier,
				isOn: true,
				isSwitchable: true,
				usesCurrentHealth: false,
				usesGameTime: false,
				stackSources: [],
				grants: [{ kind: "shield", value: 280 }],
				duration: 2.5,
				next: undefined,
			},
		])
	})

	test("an always-on effect has no switch; one that reads the current health says so", () => {
		const [row] = conditionList(
			[bloodlust],
			{},
			{
				level: 9,
				ranks: { Q: 5, W: 0, E: 0, R: 0 },
				currentHealth: 55,
			},
		)

		expect(row).toMatchObject({
			isOn: true,
			isSwitchable: false,
			usesCurrentHealth: true,
		})
		expect(row?.grants[0]?.value).toBeCloseTo(40)
	})

	test("marks an effect on that another of its stacking group stands in for", () => {
		const context = { level: 9 }
		const [passiveRow, activeRow] = conditionList(
			[passive, active],
			{ "teemo-w-active": true },
			context,
		)

		expect(passiveRow).toMatchObject({ isOn: true, stackedOutBy: active })
		expect(activeRow?.stackedOutBy).toBeUndefined()
		expect(
			conditionList([passive, active], {}, context)[0]?.stackedOutBy,
		).toBeUndefined()
	})
})
