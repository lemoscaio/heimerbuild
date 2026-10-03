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
	grants: [
		{
			kind: "stat",
			stat: "movementSpeedPercent",
			amount: { by: "rank", rankStat: "movementSpeedPercent" },
		},
	],
	sourceUrl: `${WIKI}Teemo`,
})
const barrier = bind({
	id: "barrier",
	source: { kind: "summoner", spellKey: "SummonerBarrier" },
	trigger: { kind: "after-use" },
	duration: 2.5,
	grants: [{ kind: "shield", amount: 280 }],
	sourceUrl: `${WIKI}Barrier`,
})
const effects = [passive, barrier]

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

	test("keeps every choice while the effects load", () => {
		expect(readConditions({ ghost: true }, undefined)).toEqual({ ghost: true })
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
				grants: [{ kind: "stat", stat: "movementSpeedPercent", value: 0.16 }],
				duration: undefined,
			},
			{
				effect: barrier,
				isOn: true,
				grants: [{ kind: "shield", value: 280 }],
				duration: 2.5,
			},
		])
	})
})
