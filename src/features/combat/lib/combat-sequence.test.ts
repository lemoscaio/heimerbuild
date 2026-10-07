import { describe, expect, test } from "bun:test"
import { MAX_COMBAT_STEPS } from "@/lib/combat/combat"
import {
	addStep,
	blockMove,
	type CombatEntry,
	clampWaitSeconds,
	insertStep,
	moveEntries,
	removeStep,
	setWaitSeconds,
} from "./combat-sequence"

const ATTACK = { kind: "attack" } as const
const Q = { kind: "ability", slot: "Q" } as const

function combo(...actions: CombatEntry["action"][]) {
	return actions.reduce<CombatEntry[]>(addStep, [])
}

describe("addStep", () => {
	test("adds at the end with a new id each time", () => {
		const steps = combo(ATTACK, Q, ATTACK)

		expect(steps.map(({ id }) => id)).toEqual([1, 2, 3])
		expect(steps.map(({ action }) => action.kind)).toEqual([
			"attack",
			"ability",
			"attack",
		])
	})

	test("stops adding once the combo is full", () => {
		const full = combo(...Array(MAX_COMBAT_STEPS).fill(ATTACK))

		expect(addStep(full, Q)).toHaveLength(MAX_COMBAT_STEPS)
	})

	test("a removed step's id is never reused while a later one remains", () => {
		const steps = removeStep(combo(ATTACK, Q, ATTACK), 2)

		expect(addStep(steps, Q).map(({ id }) => id)).toEqual([1, 3, 4])
	})
})

describe("insertStep (issue 344)", () => {
	const MARKER = { kind: "situation", effectId: "hail-of-blades" } as const

	test("puts a marker at the start or between steps, with a new id", () => {
		const steps = combo(ATTACK, Q, ATTACK)

		expect(insertStep(steps, MARKER, 0).map(({ id }) => id)).toEqual([
			4, 1, 2, 3,
		])
		expect(insertStep(steps, MARKER, 2).map(({ id }) => id)).toEqual([
			1, 2, 4, 3,
		])
		expect(insertStep(steps, MARKER, 99).at(-1)?.id).toBe(4)
	})

	test("stops adding once the combo is full", () => {
		const full = combo(...Array(MAX_COMBAT_STEPS).fill(ATTACK))

		expect(insertStep(full, MARKER, 0)).toEqual(full)
	})
})

describe("moveEntries", () => {
	test("moves several entries together, in their order, clamped to the list", () => {
		const steps = combo(Q, ATTACK, ATTACK, ATTACK, Q)

		expect(moveEntries(steps, [2, 3, 4], 0).map(({ id }) => id)).toEqual([
			2, 3, 4, 1, 5,
		])
		expect(moveEntries(steps, [2, 3, 4], 9).map(({ id }) => id)).toEqual([
			1, 5, 2, 3, 4,
		])
	})
})

describe("blockMove (issue 331)", () => {
	// Q, a group of three attacks, a marker, then E: as the list shows them.
	const ids = [1, 2, 3, 4, 5, 6]
	const blocks = [[1], [2, 3, 4], [5], [6]]

	test("a group moves past its whole neighbour", () => {
		expect(blockMove(ids, blocks, { position: 1, direction: "up" })).toEqual({
			ids: [2, 3, 4],
			to: 0,
			position: 0,
		})
		expect(blockMove(ids, blocks, { position: 1, direction: "down" })).toEqual({
			ids: [2, 3, 4],
			to: 2,
			position: 2,
		})
	})

	test("a step next to a group moves past the whole group", () => {
		const steps = combo(Q, ATTACK, ATTACK, ATTACK)
		const move = blockMove(ids, blocks, { position: 0, direction: "down" })

		expect(move).toEqual({ ids: [1], to: 3, position: 1 })
		expect(
			moveEntries(steps, move?.ids ?? [], move?.to ?? 0).map(({ id }) => id),
		).toEqual([2, 3, 4, 1])
	})

	test("nothing moves past the edges", () => {
		expect(
			blockMove(ids, blocks, { position: 0, direction: "up" }),
		).toBeUndefined()
		expect(
			blockMove(ids, blocks, { position: 3, direction: "down" }),
		).toBeUndefined()
	})

	test("a marker moves to the start, before a group there (issue 344)", () => {
		const groupFirst = [[2, 3, 4], [1], [5], [6]]
		const entryIds = groupFirst.flat()

		expect(
			blockMove(entryIds, groupFirst, { position: 2, direction: "start" }),
		).toEqual({ ids: [5], to: 0, position: 0 })
		expect(
			blockMove(entryIds, groupFirst, { position: 0, direction: "start" }),
		).toBeUndefined()
	})

	test("inside a group, a step moves among the group's steps", () => {
		const inside = [[2], [3], [4]]

		expect(blockMove(ids, inside, { position: 1, direction: "up" })).toEqual({
			ids: [3],
			to: 1,
			position: 0,
		})
		expect(
			blockMove(ids, inside, { position: 2, direction: "down" }),
		).toBeUndefined()
	})
})

describe("waits", () => {
	test("last 0.25 to 30 s, in quarter seconds", () => {
		expect(clampWaitSeconds(0)).toBe(0.25)
		expect(clampWaitSeconds(1.1)).toBe(1)
		expect(clampWaitSeconds(99)).toBe(30)
	})

	test("setWaitSeconds changes only that wait", () => {
		const steps = combo(ATTACK, { kind: "wait", seconds: 1 })

		expect(setWaitSeconds(steps, 2, 2.6)[1]?.action).toEqual({
			kind: "wait",
			seconds: 2.5,
		})
		expect(setWaitSeconds(steps, 1, 3)[0]?.action).toEqual(ATTACK)
	})
})
