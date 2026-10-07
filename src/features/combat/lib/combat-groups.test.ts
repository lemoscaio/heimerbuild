import { describe, expect, test } from "bun:test"
import type { CombatItem } from "@/lib/combat/combat"
import {
	actionKey,
	type GroupStep,
	groupRuns,
	groupView,
	MIN_GROUP_SIZE,
} from "./combat-groups"
import type { DamageOverTimeView, OutcomeView, StepView } from "./combat-view"

const ATTACK = { kind: "attack" } as const
const MARKER = { kind: "situation", effectId: "hail-of-blades" } as const

/** The runs as their actions' kinds: a group as a list. */
function shape(actions: readonly CombatItem[]) {
	return groupRuns(actions, actionKey).map((run) =>
		run.kind === "group" ? run.items.map(({ kind }) => kind) : run.item.kind,
	)
}

describe("groupRuns (issue 331)", () => {
	test(`groups ${MIN_GROUP_SIZE} or more identical steps in a row, never fewer`, () => {
		expect(shape([ATTACK, ATTACK])).toEqual(["attack", "attack"])
		expect(shape([ATTACK, ATTACK, ATTACK])).toEqual([
			["attack", "attack", "attack"],
		])
		expect(
			shape([{ kind: "ability", slot: "Q" }, ATTACK, ATTACK, ATTACK, ATTACK]),
		).toEqual(["ability", ["attack", "attack", "attack", "attack"]])
	})

	test("a marker always splits a group and stays on its own", () => {
		expect(
			shape([ATTACK, ATTACK, MARKER, ATTACK, ATTACK, ATTACK, MARKER, MARKER]),
		).toEqual([
			"attack",
			"attack",
			"situation",
			["attack", "attack", "attack"],
			"situation",
			"situation",
		])
	})

	test("steps with different inputs are not identical: a variant, a wait's length, a summoner slot", () => {
		const outer = { kind: "ability", slot: "Q", variant: "outer" } as const
		const inner = { kind: "ability", slot: "Q", variant: "inner" } as const
		expect(shape([outer, outer, inner, inner])).toEqual([
			"ability",
			"ability",
			"ability",
			"ability",
		])
		expect(shape([outer, outer, outer])).toEqual([
			["ability", "ability", "ability"],
		])
		expect(
			shape([
				{ kind: "wait", seconds: 1 },
				{ kind: "wait", seconds: 1 },
				{ kind: "wait", seconds: 2 },
			]),
		).toEqual(["wait", "wait", "wait"])
		expect(
			shape([
				{ kind: "summoner", slot: 0 },
				{ kind: "summoner", slot: 1 },
				{ kind: "summoner", slot: 0 },
			]),
		).toEqual(["summoner", "summoner", "summoner"])
	})
})

function stepView(overrides: Partial<StepView> = {}): StepView {
	return {
		hits: [{ name: "Attack", type: "physical", raw: 100, final: 60, count: 1 }],
		damageOverTime: [],
		total: { raw: 100, final: 60 },
		mainType: "physical",
		marks: [],
		effects: [],
		healthShare: 0.9,
		...overrides,
	}
}

function outcome(
	id: string,
	happened: boolean,
	overrides: Partial<OutcomeView> = {},
): OutcomeView {
	return {
		id,
		kind: "empowered",
		label: id,
		happened,
		changed: false,
		...overrides,
	}
}

function poison(
	application: DamageOverTimeView["application"],
	{ ticks, until }: { ticks: number; until: number },
): DamageOverTimeView {
	return {
		effectId: "teemo-e",
		name: "Toxic Shot",
		application,
		stacks: 1,
		ticks: Array.from({ length: ticks }, (_, index) => ({
			time: index,
			type: "magic" as const,
			raw: 30,
			final: 20,
		})),
		type: "magic",
		raw: 30 * ticks,
		final: 20 * ticks,
		until,
		notModeled: [],
	}
}

describe("groupView (issue 331, option A: totals plus counts)", () => {
	test("sums the steps' damage by type and in all, over the time range of its steps", () => {
		const steps: GroupStep[] = [0, 0.7, 1.4].map((time) => ({
			time,
			view: stepView({
				hits: [
					{ name: "Attack", type: "physical", raw: 100, final: 60, count: 1 },
					{
						name: "Hail of Blades",
						type: "true",
						raw: 12,
						final: 12,
						count: 1,
					},
				],
				total: { raw: 112, final: 72 },
			}),
			outcomes: [],
		}))

		const view = groupView(steps)

		expect(view.size).toBe(3)
		expect(view.time).toEqual({ from: 0, to: 1.4 })
		expect(view.total).toEqual({ raw: 336, final: 216 })
		expect(view.byType).toEqual([
			{ type: "physical", final: 180 },
			{ type: "true", final: 36 },
		])
		expect(view.mainType).toBe("physical")
	})

	test("counts each outcome over the steps that have it, and the effects and marks after them", () => {
		const steps: GroupStep[] = [true, true, true, false].map((empowered) => ({
			time: 0,
			view: stepView({
				effects: empowered ? [] : [{ name: "Heightened Senses", until: 4 }],
				marks: empowered
					? [{ mark: "Harrier", change: "consumed", fromMarker: false }]
					: [],
			}),
			outcomes: [
				outcome("empowered:hail-of-blades", empowered, {
					label: "Hail of Blades",
				}),
				outcome("damage-over-time:teemo-e", true, {
					label: "Toxic Shot: applies",
				}),
			],
		}))

		const view = groupView(steps)

		expect(view.outcomes).toEqual([
			{
				id: "empowered:hail-of-blades",
				label: "Hail of Blades",
				count: 3,
				of: 4,
			},
			{
				id: "damage-over-time:teemo-e",
				label: "Toxic Shot: applies",
				count: 4,
				of: 4,
			},
		])
		expect(view.effects).toEqual([
			{ label: "Heightened Senses", count: 1, of: 4 },
		])
		expect(view.marks).toEqual([
			{ label: "Harrier mark consumed", count: 3, of: 4 },
		])
	})

	test("sums each damage over time from its steps' own lines: applications, ticks, damage and its last tick", () => {
		const steps: GroupStep[] = [
			poison("applied", { ticks: 1, until: 1 }),
			poison("refreshed", { ticks: 1, until: 2 }),
			poison("refreshed", { ticks: 4, until: 5 }),
		].map((dot) => ({
			time: 0,
			view: stepView({ damageOverTime: [dot] }),
			outcomes: [],
		}))

		const [dot] = groupView(steps).damageOverTime

		expect(dot).toMatchObject({
			effectId: "teemo-e",
			name: "Toxic Shot",
			applications: [
				{ application: "applied", count: 1 },
				{ application: "refreshed", count: 2 },
			],
			ticks: 6,
			type: "magic",
			raw: 180,
			final: 120,
			until: 5,
		})
	})

	test("the ticks count toward the damage by type", () => {
		const view = groupView(
			[1, 2, 3].map(() => ({
				view: stepView({
					damageOverTime: [poison("refreshed", { ticks: 1, until: 1 })],
					total: { raw: 130, final: 80 },
				}),
				outcomes: [],
			})),
		)

		expect(view.byType).toEqual([
			{ type: "physical", final: 180 },
			{ type: "magic", final: 60 },
		])
	})

	test("says how many steps were refused and, in free mode, how many answers changed inside", () => {
		const view = groupView([
			{ time: 0, view: stepView(), outcomes: [outcome("a", true)] },
			{
				time: 1,
				refused: "On cooldown",
				view: stepView({ hits: [], total: { raw: 0, final: 0 } }),
				outcomes: [],
			},
			{
				time: 2,
				view: stepView({ healthShare: 0.7 }),
				outcomes: [outcome("a", false, { changed: true })],
			},
		])

		expect(view.refused).toBe(1)
		expect(view.changes).toBe(1)
		expect(view.healthShare).toBe(0.7)
	})
})
