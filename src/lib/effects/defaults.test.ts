import { describe, expect, test } from "bun:test"
import { isOnByDefault } from "./defaults"
import type { Effect, Trigger } from "./effect"

function effect(trigger: Trigger, defaultOn?: boolean): Effect {
	return {
		id: "test",
		source: { kind: "summoner", spellKey: "SummonerHaste" },
		grants: [],
		trigger,
		defaultOn,
		since: "16.19",
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/Ghost",
	}
}

describe("isOnByDefault", () => {
	test("a state the champion holds at rest is on", () => {
		expect(isOnByDefault(effect({ kind: "always" }))).toBe(true)
		expect(
			isOnByDefault(
				effect({ kind: "while", condition: "not-damaged-recently" }),
			),
		).toBe(true)
	})

	test("an effect that follows an action is off", () => {
		for (const kind of [
			"after-use",
			"after-summoner",
			"on-hit",
			"after-ability",
		] as const) {
			expect(isOnByDefault(effect({ kind }))).toBe(false)
		}
	})

	test("an explicit default wins over the trigger's", () => {
		expect(isOnByDefault(effect({ kind: "after-use" }, true))).toBe(true)
		expect(isOnByDefault(effect({ kind: "always" }, false))).toBe(false)
	})
})
