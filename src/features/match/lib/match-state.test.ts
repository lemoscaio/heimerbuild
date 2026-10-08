import { describe, expect, test } from "bun:test"
import { readMatchState } from "./match-state"

describe("readMatchState", () => {
	test("reads the game time, the game's start when absent", () => {
		expect(readMatchState({ gameTime: 25 }).gameTime).toBe(25)
		expect(readMatchState({}).gameTime).toBe(0)
	})

	test("reads the match stacks, none when absent", () => {
		const matchStacks = { "siphoning-strike": 250 }
		expect(readMatchState({ matchStacks }).matchStacks).toEqual(matchStacks)
		expect(readMatchState({}).matchStacks).toEqual({})
	})
})
