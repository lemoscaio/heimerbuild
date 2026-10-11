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

// Real current-patch data (public/data); the timing is the wiki's (Garen, Judgment, 2026-10-09).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

const GAREN: Champion = championSchema.parse(
	await Bun.file(new URL(`${PATCH}/champions/Garen.json`, DATA)).json(),
)

const DUMMY: CombatTarget = {
	health: 20_000,
	armor: 70,
	magicResist: 50,
	level: 9,
}

const RANKS = { Q: 1, W: 1, E: 1, R: 1 }

function inputOf(
	actions: readonly CombatAction[],
	{ level = 6 }: { level?: number } = {},
): CombatInput {
	return {
		build: {
			champion: GAREN,
			patch: PATCH,
			level,
			items: [],
			shards: [],
			ranks: RANKS,
		},
		effects: combatEffects({
			patch: PATCH,
			champion: GAREN,
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

function simulate(
	actions: readonly CombatAction[],
	options?: { level?: number },
) {
	return simulateCombat(inputOf(actions, options))
}

const ATTACK: CombatAction = { kind: "attack" }

function cast(slot: "Q" | "W" | "E" | "R", inArea?: number): CombatAction {
	return inArea === undefined
		? { kind: "ability", slot }
		: { kind: "ability", slot, inArea }
}

function wait(seconds: number): CombatAction {
	return { kind: "wait", seconds }
}

type Hit = Extract<CombatEvent, { damage: DealtDamage }>

function hits(result: CombatResult, name: string): Hit[] {
	return result.steps
		.flatMap(({ events }) => events)
		.filter(
			(event): event is Hit =>
				event.kind === "hit" &&
				"damage" in event &&
				"name" in event.source &&
				event.source.name === name,
		)
		.sort((a, b) => a.time - b.time)
}

const spins = (result: CombatResult) => hits(result, "NearestEnemyBonus")

describe("Judgment's time spinning (issue 427)", () => {
	test("1.5 s lands the spins completed by then, 3 of 7, and its step says so", () => {
		const result = simulate([cast("E", 1.5)])

		expect(spins(result).map(({ time }) => time)).toEqual([
			expect.closeTo(3 / 7),
			expect.closeTo(6 / 7),
			expect.closeTo(9 / 7),
		])
		expect(result.steps[0]?.hits).toEqual({ count: 3, of: 7 })
	})

	test("no time is the full 3 s, all 7 spins", () => {
		expect(simulate([cast("E")]).steps[0]?.hits).toEqual({ count: 7, of: 7 })
	})

	test("it can't end before 1 s (the wiki's recast lock): a shorter time is 1 s", () => {
		expect(simulate([cast("E", 0.5)]).steps[0]?.hits).toEqual({
			count: 2,
			of: 7,
		})
	})

	test("with bonus attack speed the count is of 9: 1.5 s lands 4", () => {
		const level18 = { level: 18 }

		expect(simulate([cast("E")], level18).steps[0]?.hits).toEqual({
			count: 9,
			of: 9,
		})
		expect(simulate([cast("E", 1.5)], level18).steps[0]?.hits).toEqual({
			count: 4,
			of: 9,
		})
	})
})

describe("no basic attacks while Judgment spins (issue 427)", () => {
	test("in strict mode an attack right after it starts once the spin ends, or the time chosen", () => {
		expect(simulate([cast("E"), ATTACK]).steps[1]?.time).toBeCloseTo(3)
		expect(simulate([cast("E", 1.5), ATTACK]).steps[1]?.time).toBeCloseTo(1.5)
	})

	test("in free mode the attack doesn't wait", () => {
		const actions = [cast("E"), ATTACK]
		const { result } = simulateFreeCombat(inputOf(actions), [])

		expect(result.steps[1]?.time).toBe(0)
	})

	test("Decisive Strike is cast during it, its attack after the spin; Courage doesn't end it", () => {
		const result = simulate([cast("E"), cast("W"), cast("Q")])

		expect(result.steps[2]?.time).toBe(0)
		expect(hits(result, "TotalDamage")[0]?.time).toBeGreaterThanOrEqual(3)
		expect(result.steps[0]?.hits).toEqual({ count: 7, of: 7 })
	})
})

describe("Demacian Justice waits for Judgment to end (issue 444)", () => {
	const justice = (result: CombatResult) => hits(result, "BaseDamage")

	test("right after a 3 s Judgment it starts when the spin ends, after all 7 spins", () => {
		const result = simulate([cast("Q"), cast("E", 3), cast("R")])
		const judgment = result.steps[1]

		expect(judgment?.hits).toEqual({ count: 7, of: 7 })
		expect(result.steps[2]?.time).toBeCloseTo((judgment?.time ?? 0) + 3)
		expect(justice(result)[0]?.time).toBeGreaterThanOrEqual(
			spins(result).at(-1)?.time ?? Number.POSITIVE_INFINITY,
		)
	})

	test("a wait between them still counts: past the spin's end it casts at once", () => {
		const within = simulate([cast("E"), wait(1), cast("R")])
		const past = simulate([cast("E", 1.5), wait(2), cast("R")])

		expect(within.steps[2]?.time).toBeCloseTo(3)
		expect(within.steps[0]?.hits).toEqual({ count: 7, of: 7 })
		expect(past.steps[2]?.time).toBeCloseTo(2)
	})

	test("a shorter spin moves it earlier: 1.5 s lands 3 spins, then it casts", () => {
		const result = simulate([cast("E", 1.5), cast("R")])

		expect(result.steps[1]?.time).toBeCloseTo(1.5)
		expect(result.steps[0]?.hits).toEqual({ count: 3, of: 7 })
	})

	test("in free mode it waits too: q.e.r at 3 s lands every spin, then it casts", () => {
		const actions = [cast("Q"), cast("E", 3), cast("R")]
		const { result } = simulateFreeCombat(inputOf(actions), [])
		const judgment = result.steps[1]

		expect(judgment?.hits).toEqual({ count: 7, of: 7 })
		expect(result.steps[2]?.time).toBeCloseTo((judgment?.time ?? 0) + 3)
		expect(justice(result)[0]?.time).toBeGreaterThanOrEqual(
			spins(result).at(-1)?.time ?? Number.POSITIVE_INFINITY,
		)
	})
})
