import { describe, expect, test } from "bun:test"
import type { BuildValues } from "@/features/build-calculator/types/build-source"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { dropUnusedConditionValues } from "./condition-values"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

function bind(effect: Effect): BuildEffect {
	return { id: effect.id, effect, name: effect.id, icon: "" }
}

const barrier = bind({
	id: "barrier",
	source: { kind: "summoner", spellKey: "SummonerBarrier" },
	trigger: { kind: "after-use" },
	duration: 2.5,
	grants: [{ kind: "shield", amount: 280 }],
	since: "16.19",
	sourceUrl: `${WIKI}Barrier`,
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
const gatheringStorm = bind({
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
})

const values: BuildValues = {
	level: 9,
	itemIds: ["3089"],
	form: undefined,
	effects: { barrier: true },
	currentHealth: 40,
	gameTime: 30,
}

describe("dropUnusedConditionValues", () => {
	test("keeps each condition value an available effect uses", () => {
		expect(
			dropUnusedConditionValues(values, [barrier, bloodlust, gatheringStorm]),
		).toEqual(values)
	})

	test("drops the current health and the game time when no effect uses them", () => {
		expect(dropUnusedConditionValues(values, [barrier])).toEqual({
			...values,
			currentHealth: undefined,
			gameTime: undefined,
		})
		expect(dropUnusedConditionValues(values, [bloodlust])).toEqual({
			...values,
			gameTime: undefined,
		})
		expect(dropUnusedConditionValues(values, [gatheringStorm])).toEqual({
			...values,
			currentHealth: undefined,
		})
	})

	test("keeps the count an item's upgrade waits for, though no effect reads it (Garen's Muramana)", () => {
		const muramana = {
			...values,
			itemIds: ["3004"],
			matchStacks: { "manaflow-mana": 360, "mejai-stacks": 10 },
		}

		expect(dropUnusedConditionValues(muramana, [barrier]).matchStacks).toEqual({
			"manaflow-mana": 360,
		})
		expect(
			dropUnusedConditionValues({ ...muramana, itemIds: ["3089"] }, [barrier])
				.matchStacks,
		).toBeUndefined()
	})

	test("keeps the values as given while the effects load", () => {
		expect(dropUnusedConditionValues(values, undefined)).toBe(values)
	})
})
