import { describe, expect, test } from "bun:test"
import { isListed, isOnByDefault, isSwitchable } from "./defaults"
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
		expect(isOnByDefault(effect({ kind: "on-cast" }))).toBe(false)
		expect(
			isOnByDefault(effect({ kind: "on-mark-consumed", mark: "test" })),
		).toBe(false)
	})

	test("an explicit default wins over the trigger's", () => {
		expect(isOnByDefault(effect({ kind: "after-use" }, true))).toBe(true)
		expect(isOnByDefault(effect({ kind: "always" }, false))).toBe(false)
	})
})

describe("isSwitchable", () => {
	test("an always-on effect has no switch; every conditional one has", () => {
		expect(isSwitchable(effect({ kind: "always" }))).toBe(false)
		expect(
			isSwitchable(
				effect({ kind: "while", condition: "not-damaged-recently" }),
			),
		).toBe(true)
		expect(isSwitchable(effect({ kind: "after-use" }))).toBe(true)
	})
})

describe("isListed", () => {
	test("the stats panel leaves out what only a combat sequence fires, and what the target holds", () => {
		expect(isListed(effect({ kind: "after-use" }))).toBe(true)
		expect(isListed(effect({ kind: "on-cast", slots: ["Q"] }))).toBe(false)
		expect(isListed(effect({ kind: "on-mark-consumed", mark: "test" }))).toBe(
			false,
		)
		expect(
			isListed({ ...effect({ kind: "after-use" }), holder: "target" }),
		).toBe(false)
	})
})
