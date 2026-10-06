import { describe, expect, test } from "bun:test"
import type { BuildEffect, Effect } from "../effects/effect"
import { outcomeId, outcomeKeys } from "./outcomes"

function bound(fields: Partial<Effect> & Pick<Effect, "id">): BuildEffect {
	return {
		id: fields.id,
		name: fields.id,
		icon: "icon.png",
		effect: {
			source: { kind: "ability", championKey: "Test", slot: "passive" },
			trigger: { kind: "always" },
			grants: [],
			since: "16.19",
			sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
			...fields,
		},
	}
}

const MARK = { mark: "harrier", duration: 4, consumedBy: ["attack"] } as const
const EFFECTS = [
	bound({ id: "rush", trigger: { kind: "on-attack" }, charges: 3 }),
	bound({
		id: "harrier-mark",
		trigger: { kind: "on-cast", slots: ["Q", "E"] },
		applies: MARK,
	}),
	bound({ id: "valor", trigger: { kind: "periodic" }, applies: MARK }),
	bound({
		id: "flux",
		trigger: { kind: "on-cast", slots: ["W"] },
		applies: { mark: "flux", duration: 4, consumedBy: ["attack", "ability"] },
	}),
	bound({
		id: "dragon-rush",
		trigger: { kind: "on-attack" },
		form: "dragon",
	}),
]

function ids(...args: Parameters<typeof outcomeKeys>) {
	return outcomeKeys(...args).map(outcomeId)
}

describe("outcomeKeys: which outcomes a step can have, from the effects' triggers", () => {
	test("an attack: the on-attack effects, and the marks attacks consume", () => {
		expect(ids({ kind: "attack" }, EFFECTS, undefined)).toEqual([
			"empowered:rush",
			"mark-consumed:harrier",
			"mark-consumed:flux",
		])
	})

	test("an ability: the marks its cast applies, and those abilities consume", () => {
		expect(ids({ kind: "ability", slot: "E" }, EFFECTS, undefined)).toEqual([
			"mark-applied:harrier",
			"mark-consumed:flux",
		])
		expect(ids({ kind: "ability", slot: "W" }, EFFECTS, undefined)).toEqual([
			"mark-applied:flux",
			"mark-consumed:flux",
		])
	})

	test("summoner spells, waits and markers have none", () => {
		expect(ids({ kind: "summoner", slot: 0 }, EFFECTS, undefined)).toEqual([])
		expect(ids({ kind: "wait", seconds: 1 }, EFFECTS, undefined)).toEqual([])
		expect(
			ids({ kind: "situation", effectId: "rush" }, EFFECTS, undefined),
		).toEqual([])
	})

	test("an effect bound to another form has none", () => {
		expect(ids({ kind: "attack" }, EFFECTS, "dragon")).toContain(
			"empowered:dragon-rush",
		)
		expect(ids({ kind: "attack" }, EFFECTS, undefined)).not.toContain(
			"empowered:dragon-rush",
		)
	})
})

describe("outcomeKeys: damage over time (issue 345)", () => {
	const dot = {
		kind: "damageOverTime",
		tick: { by: "amount", damageType: "magic", amount: 10 },
		every: 1,
	} as const
	const poison = bound({
		id: "poison",
		trigger: { kind: "on-hit" },
		source: { kind: "ability", championKey: "Test", slot: "E" },
		grants: [dot],
	})
	const trap = bound({
		id: "trap",
		trigger: { kind: "after-use" },
		source: { kind: "ability", championKey: "Test", slot: "R" },
		grants: [dot],
	})
	const burn = bound({
		id: "burn",
		trigger: { kind: "on-ability-damage" },
		source: { kind: "item", itemId: "6653" },
		grants: [dot],
	})

	test("an attack: the damage over time its on-hit applies", () => {
		expect(ids({ kind: "attack" }, [poison, trap], undefined)).toEqual([
			"damage-over-time:poison",
		])
	})

	test("a cast: its own, and the ones ability damage applies", () => {
		expect(
			ids({ kind: "ability", slot: "R" }, [poison, trap, burn], undefined),
		).toEqual(["damage-over-time:trap", "damage-over-time:burn"])
	})

	test("ability damage applies on attacks only while an ability's effect deals damage on them", () => {
		expect(ids({ kind: "attack" }, [burn], undefined)).toEqual([])
		expect(ids({ kind: "attack" }, [poison, burn], undefined)).toEqual([
			"damage-over-time:poison",
			"damage-over-time:burn",
		])
	})
})
