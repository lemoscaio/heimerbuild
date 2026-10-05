import { describe, expect, test } from "bun:test"
import { boostSlots, effectBoosts } from "./boosts"
import type { BuildEffect, Effect } from "./effect"
import { resolveGrants } from "./evaluate"

const BOOSTED: Effect = {
	id: "boosted",
	source: { kind: "ability", championKey: "Test", slot: "W" },
	trigger: { kind: "on-hit" },
	grants: [
		{
			kind: "stat",
			stat: "movementSpeedPercent",
			amount: {
				by: "rankValue",
				label: "Boosted Speed",
				scale: 0.01,
				slot: "R",
				unranked: 0.2,
			},
		},
	],
	since: "16.19",
	sourceUrl: "https://wiki.leagueoflegends.com/en-us/Gnar",
}

const BOUND: BuildEffect = {
	id: "boosted",
	effect: BOOSTED,
	name: "Hyper",
	icon: "",
	slot: "W",
	rankValues: [{ label: "Boosted Speed", values: [1, 2, 3, 4, 5] }],
	boosts: {
		R: {
			name: "GNAR!",
			rankValues: [{ label: "Boosted Speed", values: [40, 60, 80] }],
		},
	},
}

function ranksWithR(R: number) {
	return { Q: 0, W: 1, E: 0, R }
}

describe("an amount that reads another ability's rank", () => {
	test("is its unranked value until that ability has a point, then that ability's line at its rank", () => {
		const speeds = [0, 1, 2, 3].map(
			(R) =>
				resolveGrants(BOUND, { level: 11, ranks: ranksWithR(R) })[0]?.value,
		)

		expect(speeds).toEqual([0.2, 0.4, 0.6, 0.8])
	})

	test("names the other slot, never its own", () => {
		const own: Effect = {
			...BOOSTED,
			grants: [
				{
					kind: "stat",
					stat: "armor",
					amount: { by: "rankValue", label: "Armor", slot: "W" },
				},
			],
		}

		expect(boostSlots(BOOSTED)).toEqual(["R"])
		expect(boostSlots(own)).toEqual([])
	})

	test("says which ability boosts it, only once that ability has a point", () => {
		expect(effectBoosts(BOUND, ranksWithR(0))).toEqual([])
		expect(effectBoosts(BOUND, ranksWithR(2))).toEqual([
			{ name: "GNAR!", slot: "R", rank: 2 },
		])
	})
})
