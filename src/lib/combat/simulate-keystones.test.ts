import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { type Rune, runesFileSchema } from "@schemas/rune"
import { combatEffects } from "../effects/available-effects"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatResult,
	CombatTarget,
	DealtDamage,
} from "./combat"
import {
	type CombatBuild,
	type CombatInput,
	simulateCombat,
} from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-08, issue 417).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function patchFile(file: string): Promise<unknown> {
	return Bun.file(new URL(`${PATCH}/${file}`, DATA)).json()
}

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(await patchFile(`champions/${key}.json`))
}

const ITEMS = ItemsFileSchema.parse(await patchFile("items.json")).items
const RUNES = runesFileSchema
	.parse(await patchFile("runes.json"))
	.trees.flatMap((tree) => [tree.keystones, ...tree.rows].flat())

function find<Entry>(
	list: readonly Entry[],
	matches: (entry: Entry) => boolean,
) {
	const found = list.find(matches)
	if (!found) throw new Error("not in the current patch")
	return found
}

const item = (name: string) => find(ITEMS, (entry) => entry.name === name)
const rune = (key: string) => find(RUNES, (entry) => entry.key === key)

// Plenty of health: no combo here kills it.
const TARGET: CombatTarget = {
	health: 20_000,
	armor: 70,
	magicResist: 50,
	level: 9,
}

type Setup = {
	champion: Champion
	level: number
	ranks: AbilityRanks
	runes: readonly Rune[]
	items?: readonly Item[]
}

function buildOf({ champion, level, ranks, items = [] }: Setup): CombatBuild {
	return { champion, patch: PATCH, level, items, shards: [], ranks }
}

function simulate(setup: Setup, actions: readonly CombatAction[]) {
	const input: CombatInput = {
		build: buildOf(setup),
		effects: combatEffects({
			patch: PATCH,
			champion: setup.champion,
			ranks: setup.ranks,
			spells: [],
			runes: setup.runes,
			items: setup.items ?? [],
		}),
		summoners: [],
		target: TARGET,
		actions,
	}
	return simulateCombat(input)
}

type EffectHit = DealtDamage & { time: number; step: number }

/** The hits of one effect over the combo, with the step whose events hold each. */
function effectHits(result: CombatResult, effectId: string): EffectHit[] {
	return result.steps.flatMap((step, index) =>
		step.events.flatMap((event) =>
			event.kind === "hit" &&
			"damage" in event &&
			event.source.kind === "effect" &&
			event.source.effectId === effectId
				? [{ ...event.damage, time: event.time, step: index }]
				: [],
		),
	)
}

/** The basic attacks' hits over the combo, in order. */
function attackHits(result: CombatResult): DealtDamage[] {
	return result.steps.flatMap((step) =>
		step.events.flatMap((event) =>
			event.kind === "hit" &&
			"damage" in event &&
			event.source.kind === "attack"
				? [event.damage]
				: [],
		),
	)
}

function physical(raw: number) {
	return (raw * 100) / (100 + TARGET.armor)
}

function magic(raw: number) {
	return (raw * 100) / (100 + TARGET.magicResist)
}

const attack: CombatAction = { kind: "attack" }
const cast = (slot: "Q" | "W" | "E" | "R"): CombatAction => ({
	kind: "ability",
	slot,
})
const wait = (seconds: number): CombatAction => ({ kind: "wait", seconds })

describe("Electrocute", async () => {
	// No point in Summon: Tibbers, whose magic penetration would lower the magic resist.
	const annie: Setup = {
		champion: await champion("Annie"),
		level: 9,
		ranks: { Q: 3, W: 3, E: 1, R: 0 },
		runes: [rune("Electrocute")],
		items: [item("Amplifying Tome")],
	}
	// Wiki: 60 + 10 × level (+ 10% bonus AD) (+ 5% AP), 0.25 s after the third stack.
	const strike = (level: number, ap: number, bonusAD = 0) =>
		60 + 10 * level + 0.1 * bonusAD + 0.05 * ap

	test("Annie's Q, W and an attack strike 0.25 s after the third, as magic damage", () => {
		const result = simulate(annie, [cast("Q"), cast("W"), attack])
		const ap = computeBuildStats(buildOf(annie)).abilityPower.total
		const [hit, ...more] = effectHits(result, "electrocute")
		const third = result.steps[2]?.events.find(({ kind }) => kind === "hit")

		expect(more).toHaveLength(0)
		expect(hit?.type).toBe("magic")
		expect(hit?.final).toBeCloseTo(magic(strike(9, ap)))
		expect(hit?.time).toBeCloseTo((third?.time ?? Number.NaN) + 0.25)
	})

	test("two hits don't strike; attacks count as hits too", () => {
		expect(
			effectHits(simulate(annie, [cast("Q"), cast("W")]), "electrocute"),
		).toHaveLength(0)
		expect(
			effectHits(simulate(annie, [attack, cast("Q"), attack]), "electrocute"),
		).toHaveLength(1)
	})

	test("a cast hitting several times is one stack (Brand's Pyroclasm, 3 hits)", async () => {
		const brand: Setup = {
			champion: await champion("Brand"),
			level: 11,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			runes: [rune("Electrocute")],
		}

		expect(
			effectHits(simulate(brand, [cast("R")]), "electrocute"),
		).toHaveLength(0)
		expect(
			effectHits(
				simulate(brand, [cast("R"), cast("Q"), cast("E")]),
				"electrocute",
			),
		).toHaveLength(1)
	})

	test("the 3 s run from the first stack: a later hit doesn't extend them", () => {
		const late = simulate(annie, [attack, wait(2.5), attack, wait(0.5), attack])
		const quick = simulate(annie, [attack, attack, attack])

		expect(effectHits(late, "electrocute")).toHaveLength(0)
		expect(effectHits(quick, "electrocute")).toHaveLength(1)
	})

	test("it doesn't strike twice within its 20 s cooldown, and gathers no stacks meanwhile", () => {
		const twice = [attack, attack, attack, attack, attack, attack]
		const again = simulate(annie, [...twice, wait(20), attack, attack, attack])
		const hits = effectHits(again, "electrocute")

		expect(effectHits(simulate(annie, twice), "electrocute")).toHaveLength(1)
		expect(hits).toHaveLength(2)
		expect((hits[1]?.time ?? 0) - (hits[0]?.time ?? 0)).toBeGreaterThan(20)
	})

	test("deals physical damage when its bonus AD part is the larger", async () => {
		const garen: Setup = {
			champion: await champion("Garen"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			runes: [rune("Electrocute")],
			items: [item("Long Sword")],
		}
		const [hit] = effectHits(
			simulate(garen, [attack, attack, attack]),
			"electrocute",
		)

		expect(hit?.type).toBe("physical")
		expect(hit?.final).toBeCloseTo(physical(strike(9, 0, 10)))
	})
})

describe("Press the Attack", async () => {
	const garen: Setup = {
		champion: await champion("Garen"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
		runes: [rune("PressTheAttack")],
		items: [item("Long Sword")],
	}
	// Wiki: 40 + (160 − 40) / 17 × (level − 1) bonus adaptive damage, then 8% more damage.
	const burst = (level: number) => 40 + (120 / 17) * (level - 1)

	test("the third attack deals its adaptive damage, physical with bonus AD", () => {
		const result = simulate(garen, [attack, attack, attack])
		const [hit, ...more] = effectHits(result, "press-the-attack")

		expect(more).toHaveLength(0)
		expect(hit?.step).toBe(2)
		expect(hit?.type).toBe("physical")
		expect(hit?.final).toBeCloseTo(physical(burst(9)))
	})

	test("then the champion deals 8% more damage for the rest of the combo", () => {
		const attacks = attackHits(
			simulate(garen, [attack, attack, attack, attack]),
		)

		expect(attacks[3]?.final).toBeCloseTo((attacks[2]?.final ?? 0) * 1.08)
		expect(attacks[2]?.final).toBeCloseTo(attacks[0]?.final ?? 0)
	})

	test("deals magic damage for an AP build", async () => {
		const annie: Setup = {
			champion: await champion("Annie"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
			runes: [rune("PressTheAttack")],
			items: [item("Amplifying Tome")],
		}
		const [hit] = effectHits(
			simulate(annie, [attack, attack, attack]),
			"press-the-attack",
		)

		expect(hit?.type).toBe("magic")
		expect(hit?.final).toBeCloseTo(magic(burst(9)))
	})

	test("its stacks last 4 s, refreshed by each attack", () => {
		const late = simulate(garen, [attack, wait(4), attack, attack])
		const steady = simulate(garen, [
			attack,
			wait(2.5),
			attack,
			wait(2.5),
			attack,
		])

		expect(effectHits(late, "press-the-attack")).toHaveLength(0)
		expect(effectHits(steady, "press-the-attack")).toHaveLength(1)
	})

	test("an ability's on-hit adds no stack (Ezreal's Mystic Shot)", async () => {
		const ezreal: Setup = {
			champion: await champion("Ezreal"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			runes: [rune("PressTheAttack")],
		}

		expect(
			effectHits(
				simulate(ezreal, [cast("Q"), attack, attack]),
				"press-the-attack",
			),
		).toHaveLength(0)
	})

	test("no stacks during its 6 s cooldown from the burst", () => {
		const six = [attack, attack, attack, attack, attack, attack]
		const later = simulate(garen, [...six, wait(6), attack, attack, attack])

		expect(effectHits(simulate(garen, six), "press-the-attack")).toHaveLength(1)
		expect(effectHits(later, "press-the-attack")).toHaveLength(2)
	})
})
