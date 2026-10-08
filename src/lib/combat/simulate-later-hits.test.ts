import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { combatEffects } from "../effects/available-effects"
import type {
	CombatAction,
	CombatEvent,
	CombatResult,
	CombatTarget,
	DealtDamage,
} from "./combat"
import {
	type CombatInput,
	simulateCombat,
	simulateFreeCombat,
} from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-07).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

const BRAND = championSchema.parse(
	await Bun.file(new URL(`${PATCH}/champions/Brand.json`, DATA)).json(),
)

const DUMMY: CombatTarget = {
	health: 1800,
	armor: 70,
	magicResist: 50,
	level: 9,
}

const RANKS = { Q: 1, W: 1, E: 1, R: 1 }

function inputOf(
	champion: Champion,
	actions: readonly CombatAction[],
): CombatInput {
	return {
		build: {
			champion,
			patch: PATCH,
			level: 9,
			items: [],
			shards: [],
			ranks: RANKS,
		},
		effects: combatEffects({
			patch: PATCH,
			champion,
			ranks: RANKS,
			spells: [],
			runes: [],
			items: [],
		}),
		summoners: [],
		target: DUMMY,
		actions,
	}
}

function simulate(actions: readonly CombatAction[]) {
	return simulateCombat(inputOf(BRAND, actions))
}

function cast(slot: "Q" | "W" | "E" | "R", variant?: string): CombatAction {
	return variant
		? { kind: "ability", slot, variant }
		: { kind: "ability", slot }
}

type Hit = Extract<CombatEvent, { damage: DealtDamage }>

function hitsOf(
	events: readonly CombatEvent[],
	slot: "Q" | "W" | "E" | "R",
): Hit[] {
	return events.filter(
		(event): event is Hit =>
			event.kind === "hit" &&
			"damage" in event &&
			event.source.kind === "ability" &&
			event.source.slot === slot,
	)
}

function allEvents(result: CombatResult) {
	return result.steps.flatMap(({ events }) => events)
}

function detonations(result: CombatResult) {
	return allEvents(result).filter(
		(event) =>
			event.kind === "hit" &&
			event.source.kind === "effect" &&
			event.source.effectId === "brand-blaze-detonation",
	)
}

describe("Brand's Pyroclasm: the hits the user picks, each at its own time (issue 389)", () => {
	// Wiki: 100 (+ 30% AP) magic damage per hit at rank 1; a 0.15 s delay between bounces, two
	// bounces (via Brand) between hits on a lone target.
	test("3 hits land 0.3 s apart, each dealing R's damage, all on R's step", () => {
		const result = simulate([cast("R", "3")])
		const hits = hitsOf(result.steps[0]?.events ?? [], "R")

		expect(hits.map(({ time }) => time)).toEqual([0, 0.3, 0.6])
		for (const { damage } of hits) {
			expect(damage.raw).toBeCloseTo(100)
			expect(damage.type).toBe("magic")
		}
	})

	test("without a pick (a plain `r` in the link), R hits 3 times: its default, not the first", () => {
		const result = simulate([cast("R")])

		expect(hitsOf(allEvents(result), "R").map(({ time }) => time)).toEqual([
			0, 0.3, 0.6,
		])
		expect(detonations(result)).toHaveLength(1)
	})

	test("1 hit deals R's damage once and adds one stack", () => {
		const result = simulate([cast("R", "1")])

		expect(hitsOf(allEvents(result), "R")).toHaveLength(1)
		expect(result.steps[0]?.damageOverTime).toMatchObject([{ stacks: 1 }])
		expect(detonations(result)).toEqual([])
	})

	test("each hit adds a Blaze stack: 3 hits detonate Blaze from zero, 2 s after the third", () => {
		const result = simulate([cast("R", "3")])

		expect(result.steps[0]?.damageOverTime).toMatchObject([
			{ effectId: "brand-blaze", application: "applied", stacks: 3 },
		])
		expect(detonations(result).map(({ time }) => time)).toEqual([2.6])
	})

	test("the detonation belongs to R's step, though it lands while a later step runs", () => {
		const result = simulate([cast("R", "3"), cast("Q"), cast("E")])

		expect(detonations(result)).toMatchObject([{ delayed: { owner: 0 } }])
		expect(result.steps[0]?.events).not.toContainEqual(
			expect.objectContaining({ delayed: expect.anything() }),
		)
	})

	test("2 hits leave 2 stacks and no detonation", () => {
		const result = simulate([cast("R", "2")])

		expect(hitsOf(allEvents(result), "R").map(({ time }) => time)).toEqual([
			0, 0.3,
		])
		expect(result.steps[0]?.damageOverTime).toMatchObject([{ stacks: 2 }])
		expect(detonations(result)).toEqual([])
	})

	test("hits landing after the next action started stay on R's step", () => {
		const result = simulate([cast("R", "3"), cast("Q")])
		const [rStep, qStep] = result.steps

		expect(hitsOf(rStep?.events ?? [], "R")).toHaveLength(3)
		expect(hitsOf(qStep?.events ?? [], "R")).toEqual([])
		expect(hitsOf(qStep?.events ?? [], "Q").map(({ time }) => time)).toEqual([
			0.25,
		])
	})

	test("free mode: No on R's Blaze keeps every hit from stacking it", () => {
		const { result } = simulateFreeCombat(inputOf(BRAND, [cast("R", "3")]), [
			{ "damage-over-time:brand-blaze": false },
		])

		expect(hitsOf(allEvents(result), "R")).toHaveLength(3)
		expect(result.steps[0]?.damageOverTime).toEqual([])
		expect(detonations(result)).toEqual([])
	})
})

describe("Brand's Pillar of Flame against an Ablaze target (issue 389)", () => {
	// Wiki: 75 (+ 70% AP) at rank 1; "The target takes 25% increased damage" while Ablaze: 93.75.
	test("after E and Q, W lands on a burning target and deals its empowered damage", () => {
		const result = simulate([cast("E"), cast("Q"), cast("W")])
		const [hit] = hitsOf(result.steps[2]?.events ?? [], "W")

		expect(hit?.source).toMatchObject({ name: "EmpoweredDamage" })
		expect(hit?.damage.raw).toBeCloseTo(93.75)
	})

	test("W alone deals its normal damage: its own Blaze stack doesn't count", () => {
		const [hit] = hitsOf(allEvents(simulate([cast("W")])), "W")

		expect(hit?.source).toMatchObject({ name: "TotalDamage" })
		expect(hit?.damage.raw).toBeCloseTo(75)
	})
})
