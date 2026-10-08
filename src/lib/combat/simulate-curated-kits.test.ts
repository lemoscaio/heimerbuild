import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { combatEffects } from "../effects/available-effects"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatEvent,
	CombatResult,
	CombatTarget,
	DealtDamage,
} from "./combat"
import { type CombatBuild, simulateCombat } from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-07).
const DATA = new URL("../../../public/data/", import.meta.url)
const { currentPatch: PATCH } = await Bun.file(
	new URL("manifest.json", DATA),
).json()

async function champion(key: string): Promise<Champion> {
	return championSchema.parse(
		await Bun.file(new URL(`${PATCH}/champions/${key}.json`, DATA)).json(),
	)
}

const DUMMY: CombatTarget = {
	health: 20_000,
	armor: 70,
	magicResist: 50,
	level: 9,
}

type Setup = {
	champion: Champion
	level: number
	ranks: AbilityRanks
	target?: CombatTarget
}

function buildOf({ champion, level, ranks }: Setup): CombatBuild {
	return { champion, patch: PATCH, level, items: [], shards: [], ranks }
}

function simulate(setup: Setup, actions: readonly CombatAction[]) {
	return simulateCombat({
		build: buildOf(setup),
		effects: combatEffects({
			patch: PATCH,
			champion: setup.champion,
			ranks: setup.ranks,
			spells: [],
			runes: [],
			items: [],
		}),
		summoners: [],
		target: setup.target ?? DUMMY,
		actions,
	})
}

type Hit = Extract<CombatEvent, { damage: DealtDamage }>

/** Every hit of the combo, wherever its step shows it, by time. */
function allHits(result: CombatResult): Hit[] {
	return result.steps
		.flatMap(({ events }) => events)
		.filter((event): event is Hit => event.kind === "hit" && "damage" in event)
		.sort((a, b) => a.time - b.time)
}

function hitsFrom(result: CombatResult, name: string): Hit[] {
	return allHits(result).filter(({ source }) =>
		source.kind === "effect"
			? source.effectId === name
			: "name" in source && source.name === name,
	)
}

function attackSpeed(setup: Setup) {
	return computeBuildStats(buildOf(setup)).attackSpeed.total
}

function attackDamage(setup: Setup) {
	return computeBuildStats(buildOf(setup)).attackDamage.total
}

const ATTACK: CombatAction = { kind: "attack" }

function cast(slot: "Q" | "W" | "E" | "R", variant?: string): CombatAction {
	return variant
		? { kind: "ability", slot, variant }
		: { kind: "ability", slot }
}

function wait(seconds: number): CombatAction {
	return { kind: "wait", seconds }
}

describe("Rengar (issue 397)", async () => {
	const rengar: Setup = {
		champion: await champion("Rengar"),
		level: 6,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}

	test("Thrill of the Hunt is instant (wiki: no cast time; the game files give 0.25 s)", () => {
		const result = simulate(rengar, [cast("R"), cast("W")])

		expect(result.steps[1]?.time).toBe(0)
	})

	test("Bola Strike keeps its 0.25 s cast time out of a leap (wiki)", () => {
		const result = simulate(rengar, [cast("E"), cast("W")])

		expect(result.steps[1]?.time).toBeCloseTo(0.25)
	})
})

describe("Nasus (issue 397)", async () => {
	const nasus: Setup = {
		champion: await champion("Nasus"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}

	test("Siphoning Strike adds its stacks: 250 stacks at rank 1 is 30 + 250 bonus physical damage (wiki)", () => {
		const [siphon] = hitsFrom(
			simulate(nasus, [cast("Q", "250")]),
			"TotalDamage",
		)

		expect(siphon?.damage).toMatchObject({
			type: "physical",
			raw: expect.closeTo(280),
		})
	})

	test("Siphoning Strike is instant: the attack lands at the cast (wiki: no cast time)", () => {
		const result = simulate(nasus, [cast("Q")])

		expect(hitsFrom(result, "TotalDamage")[0]?.time).toBe(0)
	})

	test("Spirit Fire burns once a second while the target stays in it, and lowers its armor by 30% at rank 1 (wiki)", () => {
		const result = simulate(nasus, [cast("E", "3s"), ATTACK])
		const ticks = hitsFrom(result, "nasus-e")

		expect(hitsFrom(result, "InitialDamage")[0]?.damage.raw).toBeCloseTo(50)
		expect(ticks.map(({ time }) => time)).toEqual([1, 2, 3])
		expect(ticks[0]?.damage.raw).toBeCloseTo(10)
		expect(result.steps[1]?.resists?.armor).toBeCloseTo(70 * 0.7)
	})

	test("Fury of the Sands' aura burns 1.5% of maximum health every 0.5 s at rank 1 for the time in it (wiki)", () => {
		const ticks = hitsFrom(simulate(nasus, [cast("R", "5s")]), "nasus-r")

		expect(ticks).toHaveLength(10)
		expect(ticks[0]?.time).toBeCloseTo(0.5)
		expect(ticks[0]?.damage.raw).toBeCloseTo(0.015 * DUMMY.health)
	})

	test("Fury of the Sands takes 0.2 s and halves Siphoning Strike's cooldown (wiki: 7.5 s at rank 1)", () => {
		const result = simulate(nasus, [cast("R"), cast("Q"), cast("Q")])

		expect(result.steps[1]?.time).toBeCloseTo(0.2)
		expect(result.steps[2]?.refused).toBe(
			"Siphoning Strike is on cooldown until 3.95 s",
		)
	})

	test("without Fury of the Sands, Siphoning Strike keeps its full cooldown", () => {
		const result = simulate(nasus, [cast("Q"), cast("Q")])

		expect(result.steps[1]?.refused).toBe(
			"Siphoning Strike is on cooldown until 7.5 s",
		)
	})
})

describe("Garen (issue 397)", async () => {
	const garen: Setup = {
		champion: await champion("Garen"),
		level: 1,
		ranks: { Q: 0, W: 0, E: 1, R: 0 },
	}

	test("Judgment spins 7 times over 3 s, each 25% more to a lone target (wiki, level 1)", () => {
		const spins = hitsFrom(simulate(garen, [cast("E")]), "NearestEnemyBonus")

		expect(spins).toHaveLength(7)
		expect(spins.at(-1)?.time).toBeCloseTo((6 * 3) / 7)
		expect(spins[0]?.damage.raw).toBeCloseTo(
			1.25 * (4 + 0.4 * attackDamage(garen)),
		)
	})

	test("one more spin per 25% bonus attack speed: 9 at level 18, its growth 62% (wiki)", () => {
		const level18 = { ...garen, level: 18 }
		const spins = hitsFrom(simulate(level18, [cast("E")]), "NearestEnemyBonus")

		expect(spins).toHaveLength(9)
	})

	test("6 spins lower the target's armor by 25%; fewer don't (wiki)", () => {
		const after = simulate(garen, [cast("E"), wait(3), ATTACK])
		const before = simulate(garen, [cast("E"), wait(1), ATTACK])

		expect(after.steps[2]?.resists?.armor).toBeCloseTo(70 * 0.75)
		expect(before.steps[2]?.resists?.armor ?? 70).toBe(70)
	})

	test("Decisive Strike and Courage are instant (wiki)", () => {
		const ranked = { ...garen, level: 3, ranks: { Q: 1, W: 1, E: 1, R: 0 } }
		const result = simulate(ranked, [cast("W"), cast("Q")])

		expect(result.steps[1]?.time).toBe(0)
	})

	test("Demacian Justice deals 125 + 25% of the missing health as true damage at rank 1 (wiki)", () => {
		const ranked = {
			...garen,
			level: 6,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			target: { ...DUMMY, health: 2000 },
		}
		const result = simulate(ranked, [cast("Q"), cast("R")])
		const missing = 2000 - (result.steps[0]?.targetHealth ?? 0)
		const [base, execute] = allHits(result).filter(
			({ source }) => source.kind === "ability" && source.slot === "R",
		)

		expect(base?.damage).toEqual({ type: "true", raw: 125, final: 125 })
		expect(execute?.damage.raw).toBeCloseTo(0.25 * missing)
	})
})

describe("Jax (issue 397)", async () => {
	const jax: Setup = {
		champion: await champion("Jax"),
		level: 1,
		ranks: { Q: 0, W: 0, E: 1, R: 0 },
	}
	const { ratio } = jax.champion.stats.attackSpeed

	test("Relentless Assault: each hit adds 5% attack speed at level 1 (wiki)", () => {
		const result = simulate(jax, [ATTACK, ATTACK, ATTACK])
		const gap = (step: number) =>
			(result.steps[step]?.time ?? 0) - (result.steps[step - 1]?.time ?? 0)
		const base = attackSpeed(jax)

		expect(gap(1)).toBeCloseTo(1 / (base + ratio * 0.05))
		expect(gap(2)).toBeCloseTo(1 / (base + ratio * 0.1))
	})

	test("Relentless Assault: up to 8 stacks, 12.5% each from level 16 (wiki)", () => {
		const level16 = { ...jax, level: 16 }
		const result = simulate(level16, Array(10).fill(ATTACK))
		const gap = (result.steps[9]?.time ?? 0) - (result.steps[8]?.time ?? 0)
		const atRest = attackSpeed(level16)

		expect(gap).toBeCloseTo(1 / (atRest + ratio * 8 * 0.125))
	})

	test("Relentless Assault falls off 2.5 s after the last hit", () => {
		const result = simulate(jax, [ATTACK, wait(3), ATTACK, ATTACK])
		const gap = (result.steps[3]?.time ?? 0) - (result.steps[2]?.time ?? 0)

		expect(gap).toBeCloseTo(1 / (attackSpeed(jax) + ratio * 0.05))
	})

	test("Counter Strike strikes when recast 1 s later: 40 + 4% of maximum health at rank 1 (wiki)", () => {
		const strikes = allHits(simulate(jax, [cast("E"), wait(2)])).filter(
			({ source }) => source.kind === "effect" && source.effectId === "jax-e",
		)

		expect(strikes.map(({ time }) => time)).toEqual([1, 1])
		expect(strikes.map(({ damage }) => damage.raw)).toEqual([
			40,
			0.04 * DUMMY.health,
		])
	})

	test("Leap Strike and Empower are instant (wiki)", () => {
		const ranked = { ...jax, level: 3, ranks: { Q: 1, W: 1, E: 1, R: 0 } }
		const result = simulate(ranked, [cast("Q"), cast("W")])

		expect(result.steps[1]?.time).toBe(0)
	})

	test("Grandmaster-at-Arms: every third hit deals 75 magic damage at rank 1; its swing 100 (wiki)", () => {
		const ranked = { ...jax, level: 6, ranks: { Q: 1, W: 1, E: 1, R: 1 } }
		const result = simulate(ranked, [...Array(6).fill(ATTACK), cast("R")])
		const passive = hitsFrom(result, "jax-r-passive-strike")

		expect(passive.map(({ time }) => time)).toEqual([
			result.steps[2]?.time,
			result.steps[5]?.time,
		])
		expect(passive[0]?.damage).toMatchObject({ type: "magic", raw: 75 })
		expect(hitsFrom(result, "SwingDamageTotal")[0]?.damage.raw).toBe(100)
	})
})
