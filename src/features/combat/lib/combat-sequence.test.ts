import { describe, expect, test } from "bun:test"
import {
	addStep,
	type CombatEntry,
	clampWaitSeconds,
	MAX_COMBAT_STEPS,
	moveStep,
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

describe("moveStep", () => {
	test("moves a step to a position, clamped to the list", () => {
		const steps = combo(ATTACK, Q, { kind: "summoner", slot: 0 })

		expect(moveStep(steps, 3, 0).map(({ id }) => id)).toEqual([3, 1, 2])
		expect(moveStep(steps, 1, 9).map(({ id }) => id)).toEqual([2, 3, 1])
		expect(moveStep(steps, 7, 0)).toEqual(steps)
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
