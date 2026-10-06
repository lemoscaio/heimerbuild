import { describe, expect, test } from "bun:test"
import type { AbilityDamage, ChampionSpell } from "@schemas/champion"
import type { SummonerSpell } from "@schemas/summoner-spell"
import { combatKeys } from "./combat-keys"

function spell(
	slot: ChampionSpell["slot"],
	fields: Partial<ChampionSpell> = {},
): ChampionSpell {
	return {
		slot,
		name: `${slot} spell`,
		description: "",
		icon: `${slot}.png`,
		maxRank: 5,
		cooldown: [1, 1, 1, 1, 1],
		rankValues: [],
		...fields,
	}
}

const IGNITE = { name: "Ignite", icon: "ignite.png" } as SummonerSpell
const MODELED: AbilityDamage = {
	name: "Damage",
	type: "magic",
	parts: [{ value: 50 }],
}
const PERCENT: AbilityDamage = {
	name: "Percent",
	type: "magic",
	parts: [],
	notModeled: ["a percentage, such as a share of the target's health"],
}

describe("combatKeys", () => {
	const keys = combatKeys({
		spells: [
			spell("Q", { damage: [MODELED] }),
			spell("W", { damage: [MODELED, PERCENT] }),
			spell("E", { damage: [PERCENT] }),
			spell("R", { unavailable: { reason: "Unavailable as Mini Gnar" } }),
		],
		ranks: { Q: 1, W: 1, E: 0, R: 1 },
		summoners: [undefined, IGNITE],
	})

	test("lists attack, Q W E R, the chosen summoner spells by slot, then wait", () => {
		expect(keys.map(({ action }) => action)).toEqual([
			{ kind: "attack" },
			{ kind: "ability", slot: "Q" },
			{ kind: "ability", slot: "W" },
			{ kind: "ability", slot: "E" },
			{ kind: "ability", slot: "R" },
			{ kind: "summoner", slot: 1 },
			{ kind: "wait", seconds: 1 },
		])
	})

	test("marks how much damage each ability's key counts, and why one can't be cast", () => {
		const abilities = keys.flatMap((key) =>
			key.kind === "ability" ? [[key.damage, key.unusable]] : [],
		)

		expect(abilities).toEqual([
			["modeled", undefined],
			["partial", undefined],
			["not-modeled", "E spell has no point yet"],
			["none", "Unavailable as Mini Gnar"],
		])
	})
})
