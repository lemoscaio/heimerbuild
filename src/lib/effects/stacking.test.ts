import { describe, expect, test } from "bun:test"
import type { BuildEffect, Stacking } from "./effect"
import { resolveStacking } from "./stacking"

function effect(id: string, value: number, stacking?: Stacking) {
	const bound: BuildEffect = {
		id,
		name: id,
		icon: "",
		effect: {
			id,
			source: { kind: "rune", runeKey: "Test" },
			trigger: { kind: "after-use" },
			grants: [{ kind: "stat", stat: "movementSpeedPercent", amount: value }],
			stacking,
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/Movement_speed",
		},
	}
	return { bound, value }
}

function resolve(...effects: ReturnType<typeof effect>[]) {
	const values = new Map(effects.map(({ bound, value }) => [bound, value]))
	const result = resolveStacking(
		effects.map(({ bound }) => bound),
		(bound) => values.get(bound) ?? 0,
	)
	return {
		active: result.active.map(({ id }) => id),
		stackedOut: Object.fromEntries(
			[...result.stackedOut].map(([id, winner]) => [id, winner.id]),
		),
	}
}

describe("resolveStacking", () => {
	test("effects without a group all apply: they add up", () => {
		expect(resolve(effect("a", 0.3), effect("b", 0.2))).toEqual({
			active: ["a", "b"],
			stackedOut: {},
		})
	})

	test("replace: the highest priority applies, whatever its value", () => {
		const passive = effect("passive", 0.28, {
			group: "w",
			rule: "replace",
			priority: 0,
		})
		const active = effect("active", 0.1, {
			group: "w",
			rule: "replace",
			priority: 1,
		})

		expect(resolve(passive, active)).toEqual({
			active: ["active"],
			stackedOut: { passive: "active" },
		})
		expect(resolve(passive)).toEqual({ active: ["passive"], stackedOut: {} })
	})

	test("highest: the largest value applies", () => {
		const highest = { group: "speed", rule: "highest" } as const

		expect(
			resolve(
				effect("small", 0.15, highest),
				effect("large", 0.45, highest),
				effect("other", 0.1),
			),
		).toEqual({
			active: ["large", "other"],
			stackedOut: { small: "large" },
		})
	})

	test("unique: it applies once", () => {
		const unique = { group: "spellblade", rule: "unique" } as const

		expect(
			resolve(effect("first", 1, unique), effect("second", 2, unique)),
		).toEqual({ active: ["first"], stackedOut: { second: "first" } })
	})

	test("each group resolves on its own", () => {
		expect(
			resolve(
				effect("a1", 1, { group: "a", rule: "unique" }),
				effect("b1", 1, { group: "b", rule: "unique" }),
				effect("a2", 1, { group: "a", rule: "unique" }),
			).active,
		).toEqual(["a1", "b1"])
	})
})
