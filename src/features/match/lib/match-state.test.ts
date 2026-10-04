import { describe, expect, test } from "bun:test"
import { readMatchState } from "./match-state"

describe("readMatchState", () => {
	test("reads the game time, the game's start when absent", () => {
		expect(readMatchState({ gameTime: 25 })).toEqual({ gameTime: 25 })
		expect(readMatchState({})).toEqual({ gameTime: 0 })
	})
})
