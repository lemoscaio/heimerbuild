import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "@/lib/effects/effect"
import { gameTimeValue, readGameTime } from "./match-state"

const WIKI = "https://wiki.leagueoflegends.com/en-us/"

function bind(effect: Effect): BuildEffect {
	return { id: effect.id, effect, name: effect.id, icon: "" }
}

const barrier = bind({
	id: "barrier",
	source: { kind: "summoner", spellKey: "SummonerBarrier" },
	trigger: { kind: "after-use" },
	duration: 2.5,
	grants: [{ kind: "shield", amount: 280 }],
	since: "16.19",
	sourceUrl: `${WIKI}Barrier`,
})
const gatheringStorm = bind({
	id: "gathering-storm",
	source: { kind: "rune", runeKey: "GatheringStorm" },
	trigger: { kind: "always" },
	grants: [
		{
			kind: "stat",
			stat: "adaptiveForce",
			amount: { by: "gameTime", every: 10, growth: "triangular", step: 8 },
		},
	],
	since: "16.19",
	sourceUrl: `${WIKI}Gathering_Storm`,
})

describe("readGameTime", () => {
	test("keeps the game time while an effect reads it", () => {
		expect(readGameTime(30, [barrier, gatheringStorm])).toBe(30)
	})

	test("drops it at the game's start or when no effect reads it", () => {
		expect(readGameTime(0, [gatheringStorm])).toBeUndefined()
		expect(readGameTime(30, [barrier])).toBeUndefined()
	})

	test("keeps it as given while the effects load", () => {
		expect(readGameTime(30, undefined)).toBe(30)
	})
})

describe("gameTimeValue", () => {
	test("saves a game time after the start, and no value at the start", () => {
		expect(gameTimeValue(25)).toBe(25)
		expect(gameTimeValue(0)).toBeUndefined()
	})
})
