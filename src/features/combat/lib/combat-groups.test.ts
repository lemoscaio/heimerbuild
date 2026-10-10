import { describe, expect, test } from "bun:test"
import type { CombatItem } from "@/lib/combat/combat"
import {
	actionKey,
	type GroupStep,
	groupRuns,
	groupTiming,
	groupView,
	MIN_GROUP_SIZE,
} from "./combat-groups"
import type { DamageOverTimeView, OutcomeView, StepView } from "./combat-view"

const ATTACK = { kind: "attack" } as const
const MARKER = { kind: "situation", effectId: "quinn-harrier-valor" } as const

/** The runs as their actions' kinds: a group as a list. */
function shape(actions: readonly CombatItem[]) {
	return groupRuns(actions, { key: actionKey }).map((run) =>
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

	test("steps with different times in the area are not identical (issue 427)", () => {
		const short = { kind: "ability", slot: "E", inArea: 1.5 } as const
		const full = { kind: "ability", slot: "E" } as const

		expect(shape([short, short, full])).toEqual([
			"ability",
			"ability",
			"ability",
		])
		expect(shape([short, short, short])).toEqual([
			["ability", "ability", "ability"],
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

/** A shown entry: a step at its place in the combo, or a proc of the step at `owner`. */
type Entry =
	| { kind: "step"; key: string; at: number }
	| { kind: "proc"; owner: number }
	| { kind: "marker" }

const step = (at: number, key = "attack"): Entry => ({ kind: "step", key, at })
const proc = (owner: number): Entry => ({ kind: "proc", owner })

/** The runs as their entries: "a0" a step at 0, "p0" a proc of it, "m" a marker; a group as a list. */
function rowShape(entries: readonly Entry[]) {
	const name = (entry: Entry) =>
		entry.kind === "step"
			? `${entry.key[0]}${entry.at}`
			: entry.kind === "proc"
				? `p${entry.owner}`
				: "m"
	return groupRuns(entries, {
		key: (entry) => (entry.kind === "step" ? entry.key : undefined),
		indexOf: (entry) => (entry.kind === "step" ? entry.at : undefined),
		ownerOf: (entry) => (entry.kind === "proc" ? entry.owner : undefined),
	}).map((run) => (run.kind === "group" ? run.items.map(name) : name(run.item)))
}

describe("groupRuns over the rows as shown (issue 405)", () => {
	test("a group keeps the procs of its steps that land among them, the last one too", () => {
		expect(rowShape([step(0), step(1), proc(1), step(2), proc(2)])).toEqual([
			["a0", "a1", "p1", "a2", "p2"],
		])
	})

	test("another step's proc landing among them splits the run", () => {
		expect(
			rowShape([step(0, "q"), step(1), step(2), proc(0), step(3), step(4)]),
		).toEqual(["q0", "a1", "a2", "p0", "a3", "a4"])
	})

	test("steps shown in a row but apart in the combo don't group: a group moves as one block", () => {
		expect(rowShape([step(0), step(1), step(3), step(2, "wait")])).toEqual([
			"a0",
			"a1",
			"a3",
			"w2",
		])
	})

	test("a proc of a run too short to group stays where it lands", () => {
		expect(rowShape([step(0), proc(0), step(1), step(2, "q")])).toEqual([
			"a0",
			"p0",
			"a1",
			"q2",
		])
	})
})

describe("groupTiming", () => {
	test("from its first start to its last, its first landing to its last, and the total after its last entry", () => {
		const timing = groupTiming(
			[
				{ startsAt: 1.2, lands: { first: 1.45, last: 1.45 }, late: false },
				{ startsAt: 2.33, late: false },
				{ startsAt: 3.39, lands: { first: 3.61, last: 3.7 }, late: true },
			],
			{ dealt: 567, targetHealth: 1233, healthShare: 1233 / 1800 },
		)

		expect(timing).toEqual({
			starts: { first: 1.2, last: 3.39 },
			lands: { first: 1.45, last: 3.7 },
			late: true,
			dealt: 567,
			targetHealth: 1233,
			healthShare: 1233 / 1800,
		})
	})

	test("a group that lands nothing has no landing", () => {
		const timing = groupTiming([{ startsAt: 0, late: false }], {
			dealt: 0,
			targetHealth: 1800,
			healthShare: 1,
		})

		expect(timing?.lands).toBeUndefined()
	})
})

function stepView(overrides: Partial<StepView> = {}): StepView {
	return {
		hits: [{ name: "Attack", type: "physical", raw: 100, final: 60, count: 1 }],
		procs: [],
		damageOverTime: [],
		total: { raw: 100, final: 60 },
		byType: [{ type: "physical", final: 60 }],
		marks: [],
		effects: [],
		resists: [],
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
				byType: [
					{ type: "physical", final: 60 },
					{ type: "true", final: 12 },
				],
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
	})

	test("counts its steps' procs, which a collapsed group lists nowhere else", () => {
		const comet = {
			effectId: "arcane-comet",
			name: "Arcane Comet",
			time: 0.8,
			hits: [],
			total: { raw: 56, final: 40 },
			byType: [{ type: "magic" as const, final: 40 }],
		}
		const view = groupView(
			[0, 1, 2].map((time) => ({
				time,
				view: stepView({ procs: time === 0 ? [comet] : [] }),
				outcomes: [],
			})),
		)

		expect(view.total).toEqual({ raw: 356, final: 220 })
		expect(view.byType).toEqual([
			{ type: "physical", final: 180 },
			{ type: "magic", final: 40 },
		])
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

	test("counts an effect waiting in its state apart from the effect running (issue 372)", () => {
		const steps: GroupStep[] = [true, true, false].map((camouflaged) => ({
			time: 0,
			view: stepView({
				effects: [
					camouflaged
						? { name: "Ambush", until: 11, waiting: { label: "camouflaged" } }
						: { name: "Ambush", until: 8 },
				],
			}),
			outcomes: [],
		}))

		expect(groupView(steps).effects).toEqual([
			{ label: "Ambush · camouflaged", count: 2, of: 3 },
			{ label: "Ambush", count: 1, of: 3 },
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

	test("the steps' damage by type, their ticks' included, adds up", () => {
		const view = groupView(
			[1, 2, 3].map(() => ({
				view: stepView({
					damageOverTime: [poison("refreshed", { ticks: 1, until: 1 })],
					total: { raw: 130, final: 80 },
					byType: [
						{ type: "physical", final: 60 },
						{ type: "magic", final: 20 },
					],
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

	test("shows the target's resistances as its last step left them", () => {
		const carved = { resist: "armor", from: 100, to: 88 } as const
		const view = groupView([
			{
				time: 0,
				view: stepView({ resists: [{ ...carved, to: 94 }] }),
				outcomes: [],
			},
			{ time: 1, view: stepView({ resists: [carved] }), outcomes: [] },
		])

		expect(view.resists).toEqual([carved])
	})
})
