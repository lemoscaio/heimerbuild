import { describe, expect, test } from "bun:test"
import type { Effect } from "./effect"
import { clampGameTime, nextGameTimeStep, readsGameTime } from "./game-time"

function effect(grants: Effect["grants"]): Effect {
	return {
		id: "test",
		source: { kind: "rune", runeKey: "GatheringStorm" },
		trigger: { kind: "always" },
		grants,
		since: "16.19",
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Gathering_Storm",
	}
}

const storm = effect([
	{
		kind: "stat",
		stat: "adaptiveForce",
		amount: { by: "gameTime", every: 10, growth: "triangular", step: 8 },
	},
])
const flat = effect([{ kind: "stat", stat: "armor", amount: 10 }])

describe("readsGameTime", () => {
	test("is true only for an effect with a game time amount", () => {
		expect(readsGameTime(storm)).toBe(true)
		expect(readsGameTime(flat)).toBe(false)
	})
})

describe("nextGameTimeStep", () => {
	test("is the next full step after the given minute", () => {
		expect(nextGameTimeStep(storm, 0)).toBe(10)
		expect(nextGameTimeStep(storm, 20)).toBe(30)
		expect(nextGameTimeStep(storm, 29)).toBe(30)
		expect(nextGameTimeStep(storm, 75)).toBe(80)
	})

	test("is nothing for an effect that does not read the game time", () => {
		expect(nextGameTimeStep(flat, 20)).toBeUndefined()
	})
})

describe("clampGameTime", () => {
	test("keeps whole minutes from 0 to 120", () => {
		expect(clampGameTime(25)).toBe(25)
		expect(clampGameTime(25.6)).toBe(26)
		expect(clampGameTime(-3)).toBe(0)
		expect(clampGameTime(999)).toBe(120)
	})
})
