import { describe, expect, test } from "bun:test"
import { EMPTY_COMBO_START } from "@/lib/combat/combo-link"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { combatStartView } from "./combat-start"

function effect(
	id: string,
	name: string,
	fields: Partial<Effect> = {},
): BuildEffect {
	return {
		id,
		name,
		icon: `${id}.png`,
		effect: {
			id,
			source: { kind: "rune", runeKey: name },
			trigger: { kind: "on-attack" },
			grants: [],
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
			...fields,
		},
	}
}

const ELECTROCUTE = effect("electrocute", "Electrocute", { cooldown: 20 })
const SHEEN = effect("sheen-spellblade", "Sheen", { cooldown: 1.5 })
const CONQUEROR = effect("conqueror", "Conqueror", { stacks: { max: 12 } })
const CARVE = effect("black-cleaver-carve", "Black Cleaver", {
	label: "Carve",
	stacks: { max: 5 },
})
const HIGHLANDER = effect("master-yi-r-active", "Highlander")
const EFFECTS = {
	cooldowns: [ELECTROCUTE, SHEEN],
	stacks: [CONQUEROR, CARVE],
	running: [HIGHLANDER],
}

describe("combatStartView", () => {
	test("by default every cooldown is a ready chip, and + offers the stacks and the running buffs", () => {
		const { chips, additions } = combatStartView(EFFECTS, EMPTY_COMBO_START)

		expect(chips).toEqual([
			{ kind: "ready", id: "electrocute", label: "Electrocute ready" },
			{ kind: "ready", id: "sheen-spellblade", label: "Sheen ready" },
		])
		expect(additions).toEqual({
			ready: [],
			stacks: [
				{ id: "conqueror", name: "Conqueror", max: 12 },
				{ id: "black-cleaver-carve", name: "Black Cleaver (Carve)", max: 5 },
			],
			running: [{ id: "master-yi-r-active", label: "Highlander running" }],
		})
	})

	test("a removed cooldown moves to +; the stacks and buffs the start holds become chips in their order", () => {
		const { chips, additions } = combatStartView(EFFECTS, {
			onCooldown: ["sheen-spellblade"],
			stacks: [
				{ id: "black-cleaver-carve", count: 3 },
				{ id: "conqueror", count: 12 },
			],
			running: ["master-yi-r-active"],
		})

		expect(chips).toEqual([
			{ kind: "ready", id: "electrocute", label: "Electrocute ready" },
			{
				kind: "stacks",
				id: "black-cleaver-carve",
				name: "Black Cleaver (Carve)",
				count: 3,
				max: 5,
			},
			{
				kind: "stacks",
				id: "conqueror",
				name: "Conqueror",
				count: 12,
				max: 12,
			},
			{
				kind: "running",
				id: "master-yi-r-active",
				label: "Highlander running",
			},
		])
		expect(additions).toEqual({
			ready: [{ id: "sheen-spellblade", label: "Sheen ready" }],
			stacks: [],
			running: [],
		})
	})

	test("no chip for a start the build can't set, and a count past the cap shows the cap", () => {
		const { chips } = combatStartView(
			{ cooldowns: [], stacks: [CONQUEROR], running: [] },
			{
				onCooldown: [],
				stacks: [
					{ id: "conqueror", count: 40 },
					{ id: "lethal-tempo", count: 6 },
				],
				running: ["master-yi-r-active"],
			},
		)

		expect(chips).toEqual([
			{
				kind: "stacks",
				id: "conqueror",
				name: "Conqueror",
				count: 12,
				max: 12,
			},
		])
	})
})
