import { describe, expect, test } from "bun:test"
import type { SummonerSpell } from "@schemas/summoner-spell"
import sharedBin from "../../../../scripts/sync-data/fixtures/summoners/shared.bin.json"
import summonerJson from "../../../../scripts/sync-data/fixtures/summoners/summoner.json"
import { normalizeSummonerSpells } from "../../../../scripts/sync-data/normalize-summoner-spells"
import { availableEffects, combatEffects } from "../available-effects"
import type { BuildEffect } from "../effect"
import { resolveAmount, resolveGrants } from "../evaluate"

const PATCH = "16.19.1"

const { spells } = normalizeSummonerSpells(summonerJson, sharedBin, "16.19.1")

function spell(name: string): SummonerSpell {
	const found = spells.find((entry) => entry.name === name)
	if (!found) throw new Error(`No spell ${name} in the fixture`)
	return found
}

function effectOf(name: string): BuildEffect {
	const [effect] = availableEffects({
		patch: PATCH,
		champion: { key: "Teemo", resource: "MANA", abilities: { spells: [] } },
		ranks: { Q: 0, W: 0, E: 0, R: 0 },
		spells: [spell(name)],
		runes: [],
	})
	if (!effect) throw new Error(`${name} has no effect`)
	return effect
}

function grantsAt(name: string, level: number) {
	return resolveGrants(effectOf(name), { level })
}

function durationOf(name: string) {
	const effect = effectOf(name)
	return effect.effect.duration === undefined
		? undefined
		: resolveAmount(effect.effect.duration, effect, { level: 1 })
}

// The wiki gives each value up to level 20 (Ghost 50.82%); level 18 is the game's last on the Rift.
describe("summoner spell effects", () => {
	test("Ghost: 24% to 48% movement speed by level, for 10 s", () => {
		expect(grantsAt("Ghost", 1)).toEqual([
			{ kind: "stat", stat: "movementSpeedPercent", value: 0.24 },
		])
		expect(grantsAt("Ghost", 18)).toEqual([
			{ kind: "stat", stat: "movementSpeedPercent", value: 0.48 },
		])
		expect(durationOf("Ghost")).toBe(10)
	})

	test("Heal: 80 to 318 health and 30% movement speed for 1 s", () => {
		expect(grantsAt("Heal", 1)).toEqual([
			{ kind: "heal", value: 80 },
			{ kind: "stat", stat: "movementSpeedPercent", value: 0.3 },
		])
		expect(grantsAt("Heal", 18)[0]).toEqual({ kind: "heal", value: 318 })
		expect(durationOf("Heal")).toBe(1)
	})

	test("Barrier: a 100 to 460 shield for 2.5 s", () => {
		expect(grantsAt("Barrier", 1)).toEqual([{ kind: "shield", value: 100 }])
		expect(grantsAt("Barrier", 18)).toEqual([{ kind: "shield", value: 460 }])
		expect(durationOf("Barrier")).toBe(2.5)
	})

	test("spells without a modeled effect add none", () => {
		for (const name of ["Flash", "Ignite", "Smite", "Teleport"]) {
			expect(() => effectOf(name)).toThrow()
		}
	})
})

describe("ignite", () => {
	test("each of its 5 ticks, 1.056 s apart from the cast, deals a fifth of the total: 70 to 475 true damage (wiki)", () => {
		const [ignite] = combatEffects({
			patch: PATCH,
			champion: { key: "Teemo", resource: "MANA", abilities: { spells: [] } },
			ranks: { Q: 0, W: 0, E: 0, R: 0 },
			spells: [spell("Ignite")],
			runes: [],
		})
		const [grant] = ignite?.effect.grants ?? []
		if (
			!ignite ||
			grant?.kind !== "damageOverTime" ||
			grant.tick.by !== "amount"
		) {
			throw new Error("Ignite has no damage over time")
		}
		const { amount } = grant.tick
		const tick = (level: number) => resolveAmount(amount, ignite, { level })

		expect(ignite.effect.holder).toBe("target")
		expect(
			resolveAmount(ignite.effect.duration ?? 0, ignite, { level: 1 }),
		).toBe(5)
		expect(grant.every).toBe(1.056)
		expect(grant.firstTick).toBeUndefined()
		expect(tick(1)).toBeCloseTo(70 / 5)
		expect(tick(18)).toBeCloseTo(475 / 5)
	})
})
