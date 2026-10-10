import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { ItemsFileSchema } from "@schemas/item"
import { combatEffects } from "../effects/available-effects"
import { effectiveItems } from "../item-upgrades"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatEvent,
	CombatResult,
	CombatTarget,
} from "./combat"
import { type CombatInput, simulateCombat } from "./simulate-combat"

// Real current-patch data (public/data); Shock's numbers are the wiki's (Muramana, 2026-10-09, issue 436).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
	)
}

const { items } = ItemsFileSchema.parse(
	await Bun.file(new URL(`${PATCH}/items.json`, DATA)).json(),
)
const itemsById = Object.fromEntries(items.map((item) => [item.id, item]))

// No resistances: every hit's final damage is its raw damage.
const TARGET: CombatTarget = {
	health: 5000,
	armor: 0,
	magicResist: 0,
	level: 9,
}

const SHOCK_ATTACK = "muramana-shock-attack"
const SHOCK_ABILITY = "muramana-shock-ability"
const ONE_EACH: AbilityRanks = { Q: 1, W: 1, E: 1, R: 1 }

/** The champion at level 6 with Manamune at `mana` Manaflow, as the build gives it to the combo. */
function setup(championData: Champion, mana: number, ranks = ONE_EACH) {
	const matchStacks = { "manaflow-mana": mana }
	const held = effectiveItems([itemsById["3004"]], matchStacks, itemsById)
	const build = {
		champion: championData,
		patch: PATCH,
		level: 6,
		items: held,
		shards: [],
		ranks,
		matchStacks,
	}
	const effects = combatEffects({
		patch: PATCH,
		champion: championData,
		ranks,
		spells: [],
		runes: [],
		items: held,
	})
	return { build, effects }
}

function simulate(
	championData: Champion,
	mana: number,
	actions: readonly CombatAction[],
) {
	const input: CombatInput = {
		...setup(championData, mana),
		summoners: [],
		target: TARGET,
		actions,
	}
	return simulateCombat(input)
}

/** Maximum mana with the build at rest: Shock reads it. */
function maxMana(championData: Champion, mana: number) {
	const { build } = setup(championData, mana)
	return computeBuildStats(build).mana.total
}

type DamageHit = Extract<CombatEvent, { kind: "hit"; damage: unknown }>

function shocks(result: CombatResult, step: number, effectId: string) {
	return result.steps[step].events.filter(
		(event): event is DamageHit =>
			event.kind === "hit" &&
			"damage" in event &&
			event.source.kind === "effect" &&
			event.source.effectId === effectId,
	)
}

const ezreal = await champion("Ezreal")
const COMBO: CombatAction[] = [
	{ kind: "ability", slot: "Q" },
	{ kind: "ability", slot: "W" },
	{ kind: "ability", slot: "E" },
	{ kind: "ability", slot: "R" },
	{ kind: "attack" },
]

describe("Muramana's Shock (wiki)", () => {
	const result = simulate(ezreal, 360, COMBO)
	const mana = maxMana(ezreal, 360)

	test("Ezreal's mana is Muramana's: 1000 on his own, no Manaflow on top", () => {
		expect(mana).toBe(
			computeBuildStats({ ...setup(ezreal, 0).build, items: [] }).mana.total +
				1000,
		)
	})

	test("a ranged champion's ability deals 3% of maximum mana, physical, once per cast", () => {
		for (const step of [0, 3]) {
			const [shock, ...others] = shocks(result, step, SHOCK_ABILITY)
			expect(others).toEqual([])
			expect(shock?.damage.type).toBe("physical")
			expect(shock?.damage.raw).toBeCloseTo(0.03 * mana)
		}
	})

	test("Mystic Shot applies on-hit but triggers Shock once, as an ability", () => {
		expect(shocks(result, 0, SHOCK_ATTACK)).toEqual([])
	})

	test("Essence Flux deals nothing on its cast; its detonation on E is a cast instance of its own", () => {
		expect(shocks(result, 1, SHOCK_ABILITY)).toEqual([])
		expect(shocks(result, 2, SHOCK_ABILITY)).toHaveLength(2)
	})

	test("a basic attack deals 1.2% of maximum mana on-hit", () => {
		const [shock, ...others] = shocks(result, 4, SHOCK_ATTACK)

		expect(others).toEqual([])
		expect(shock?.damage.raw).toBeCloseTo(0.012 * mana)
		expect(shocks(result, 4, SHOCK_ABILITY)).toEqual([])
	})

	test("at 359 Manaflow it is still Manamune: no Shock", () => {
		const below = simulate(ezreal, 359, COMBO)

		for (const step of [0, 1, 2, 3, 4]) {
			expect(shocks(below, step, SHOCK_ABILITY)).toEqual([])
			expect(shocks(below, step, SHOCK_ATTACK)).toEqual([])
		}
	})
})

describe("Shock's 6.5 s per cast instance (wiki)", async () => {
	const nasus = await champion("Nasus")

	test("Fury of the Sands' 15 s burn is one cast: Shock at its first tick, then every 6.5 s", () => {
		const result = simulate(nasus, 360, [
			{ kind: "ability", slot: "R", inArea: 15 },
		])
		const times = shocks(result, 0, SHOCK_ABILITY).map(({ time }) => time)
		const mana = maxMana(nasus, 360)

		expect(times).toHaveLength(3)
		expect(times[1] - times[0]).toBeGreaterThanOrEqual(6.5 - 1e-9)
		expect(times[2] - times[1]).toBeGreaterThanOrEqual(6.5 - 1e-9)
		// Melee: 4% of maximum mana.
		expect(shocks(result, 0, SHOCK_ABILITY)[0]?.damage.raw).toBeCloseTo(
			0.04 * mana,
		)
	})
})
