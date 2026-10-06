import { describe, expect, test } from "bun:test"
import type { CombatResult, CombatStep } from "@/lib/combat/combat"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { combatNames, combatTotals, stepView } from "./combat-view"

const TARGET = { health: 1000, armor: 50, magicResist: 50, level: 9 }

function bound(effect: Partial<Effect> & { id: string }, name: string) {
	return {
		id: effect.id,
		name,
		icon: "",
		effect: effect as Effect,
	} as BuildEffect
}

const NAMES = combatNames({
	passiveName: "Harrier",
	spells: [{ slot: "E", name: "Vault" }],
	effects: [
		bound(
			{
				id: "quinn-harrier-mark",
				applies: { mark: "quinn-harrier", duration: 4, consumedBy: ["attack"] },
			},
			"Harrier",
		),
		bound({ id: "quinn-w-passive", part: "passive" }, "Heightened Senses"),
		bound({ id: "trinity-force-spellblade" }, "Trinity Force"),
	],
})

const STEP: CombatStep = {
	action: { kind: "attack" },
	time: 0,
	events: [
		{
			kind: "hit",
			time: 0,
			source: { kind: "attack" },
			damage: { type: "physical", raw: 100, final: 60 },
		},
		{ kind: "mark-consumed", time: 0, mark: "quinn-harrier" },
		{
			kind: "hit",
			time: 0,
			source: { kind: "effect", effectId: "trinity-force-spellblade" },
			damage: { type: "magic", raw: 50, final: 30 },
		},
		{
			kind: "hit",
			time: 0,
			source: { kind: "ability", slot: "passive", name: "BonusDamage" },
			notModeled: ["a buff counter"],
		},
	],
	active: [
		{
			effectId: "quinn-w-passive",
			holder: "attacker",
			startedAt: 0,
			endsAt: 2,
			stacks: 1,
		},
	],
	marks: [],
	targetHealth: 910,
}

describe("stepView", () => {
	const view = stepView(STEP, { names: NAMES, target: TARGET })

	test("lists each hit by name, with not-modeled ones apart, and the step's total", () => {
		expect(view.hits).toEqual([
			{ name: "Attack", type: "physical", raw: 100, final: 60 },
			{ name: "Trinity Force", type: "magic", raw: 50, final: 30 },
			{ name: "Harrier", notModeled: ["a buff counter"] },
		])
		expect(view.total).toEqual({ raw: 150, final: 90 })
		expect(view.mainType).toBe("physical")
	})

	test("names the marks it moved, the effects running after it and the target's health left", () => {
		expect(view.marks).toEqual([{ mark: "Harrier", change: "consumed" }])
		expect(view.effects).toEqual(["Heightened Senses (passive)"])
		expect(view.healthShare).toBe(0.91)
	})
})

describe("combatTotals", () => {
	const result = {
		steps: [STEP],
		total: { raw: 150, final: 90 },
		byType: {} as CombatResult["byType"],
		duration: 1.2,
	} satisfies CombatResult

	test("gives the damage, its share of the target's health, the time and the health left", () => {
		expect(combatTotals(result, TARGET)).toEqual({
			final: 90,
			healthShare: 0.09,
			duration: 1.2,
			healthLeft: 910,
		})
	})

	test("caps the share at the whole target and keeps the kill", () => {
		const kill = { time: 1, step: 0 }

		expect(
			combatTotals(
				{ ...result, total: { raw: 2000, final: 1500 }, kill },
				TARGET,
			),
		).toMatchObject({ healthShare: 1, kill, healthLeft: 0 })
	})
})
