import { describe, expect, test } from "bun:test"
import type { OutcomeChoices } from "@/lib/combat/combat"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import type { CombatEntry } from "./combat-sequence"
import {
	type CombatState,
	changedChoices,
	choicesByItem,
	EMPTY_COMBAT,
	removeEntry,
	setFreeChoice,
	setStartReady,
} from "./combat-state"

function bound(fields: Partial<Effect> & Pick<Effect, "id">): BuildEffect {
	return {
		id: fields.id,
		name: fields.id,
		icon: "",
		effect: {
			source: { kind: "rune", runeKey: "Test" },
			trigger: { kind: "on-attack" },
			grants: [],
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
			...fields,
		},
	}
}

const HAIL = bound({ id: "hail", start: { kind: "ready" } })
const HARRIER = bound({
	id: "valor",
	trigger: { kind: "periodic" },
	start: { kind: "marked" },
	applies: { mark: "harrier", duration: 4, consumedBy: ["attack"] },
})
const ATTACK = { kind: "attack" } as const

const ENTRIES: CombatEntry[] = [
	{ id: 1, action: { kind: "situation", effectId: "hail" } },
	{ id: 2, action: ATTACK },
	{ id: 3, action: ATTACK },
	{ id: 4, action: { kind: "situation", effectId: "hail" } },
	{ id: 5, action: ATTACK },
]

describe("setFreeChoice", () => {
	test("sets an outcome at an entry, and drops it and the empty entry when back to computed", () => {
		const set = setFreeChoice({}, 2, "empowered:hail", false)

		expect(set).toEqual({ 2: { "empowered:hail": false } })
		expect(setFreeChoice(set, 2, "empowered:hail", undefined)).toEqual({})
	})
})

describe("choicesByItem and changedChoices", () => {
	const choices = {
		2: { "empowered:hail": false, "mark-consumed:harrier": true },
		5: { "empowered:hail": true },
	}

	test("lays the choices out by item", () => {
		expect(choicesByItem(ENTRIES, choices)).toEqual([
			undefined,
			choices[2],
			undefined,
			undefined,
			choices[5],
		])
	})

	test("counts the choices that differ from the computed outcomes the step can have", () => {
		const seed: OutcomeChoices[] = [
			{},
			{ "empowered:hail": true },
			{ "empowered:hail": true },
			{},
			{ "empowered:hail": true },
		]

		expect(changedChoices(ENTRIES, choices, seed)).toBe(1)
	})
})

describe("removeEntry", () => {
	const state: CombatState = {
		entries: ENTRIES,
		free: true,
		choices: {
			2: { "empowered:hail": false, "mark-consumed:harrier": true },
			3: { "empowered:hail": false },
			5: { "empowered:hail": false },
		},
		onCooldown: [],
	}

	test("a marker's choices go back to computed up to the next marker of its effect; others stay", () => {
		expect(removeEntry(state, 1, [HAIL, HARRIER])).toEqual({
			...state,
			entries: ENTRIES.filter(({ id }) => id !== 1),
			choices: {
				2: { "mark-consumed:harrier": true },
				5: { "empowered:hail": false },
			},
		})
	})

	test("a step takes its own choices with it", () => {
		expect(removeEntry(state, 3, [HAIL]).choices).toEqual({
			2: state.choices[2],
			5: state.choices[5],
		})
	})
})

describe("setStartReady", () => {
	test("× starts the effect on its cooldown, + brings it back ready; the steps stay", () => {
		const removed = setStartReady(EMPTY_COMBAT, "electrocute", false)

		expect(removed.onCooldown).toEqual(["electrocute"])
		expect(setStartReady(removed, "electrocute", true)).toEqual(EMPTY_COMBAT)
	})

	test("names an effect once however often it is removed", () => {
		const twice = setStartReady(
			setStartReady(EMPTY_COMBAT, "electrocute", false),
			"electrocute",
			false,
		)

		expect(twice.onCooldown).toEqual(["electrocute"])
	})
})
