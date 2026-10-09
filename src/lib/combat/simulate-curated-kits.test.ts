import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { combatEffects } from "../effects/available-effects"
import type { MatchStacks } from "../effects/match-stacks"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import { attackWindupTime } from "./attack-windup"
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
	matchStacks?: MatchStacks
	form?: string
}

function buildOf({
	champion,
	level,
	ranks,
	matchStacks,
	form,
}: Setup): CombatBuild {
	return {
		champion,
		patch: PATCH,
		level,
		items: [],
		shards: [],
		ranks,
		matchStacks,
		form,
	}
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

	test("Siphoning Strike adds the build's stacks: 250 stacks at rank 1 is 30 + 250 bonus physical damage (wiki)", () => {
		const stacked = { ...nasus, matchStacks: { "siphoning-strike": 250 } }
		const siphons = hitsFrom(
			simulate(stacked, [cast("Q"), wait(8), cast("Q")]),
			"TotalDamage",
		)

		expect(siphons.map(({ damage }) => damage.type)).toEqual([
			"physical",
			"physical",
		])
		expect(siphons.map(({ damage }) => damage.raw)).toEqual([
			expect.closeTo(280),
			expect.closeTo(280),
		])
	})

	test("Siphoning Strike is instant: its attack lands at the end of the attack's windup (wiki: no cast time)", () => {
		const result = simulate(nasus, [cast("Q")])
		const windup = attackWindupTime(
			nasus.champion.attackWindup,
			computeBuildStats(buildOf(nasus)).attackSpeed,
		)

		expect(hitsFrom(result, "TotalDamage")[0]?.time).toBeCloseTo(windup)
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

	test("Counter Strike's strike belongs to E's step, though it lands while a later step runs", () => {
		const result = simulate(jax, [cast("E"), ATTACK, ATTACK])
		const strikes = allHits(result).filter(
			({ source }) => source.kind === "effect" && source.effectId === "jax-e",
		)
		const attacks = allHits(result).filter(
			({ source }) => source.kind === "attack",
		)

		expect(strikes.map(({ delayed }) => delayed)).toEqual([
			{ owner: 0 },
			{ owner: 0 },
		])
		expect(result.steps[0]?.events).not.toContainEqual(
			expect.objectContaining({ delayed: { owner: 0 } }),
		)
		expect(attacks.map(({ delayed }) => delayed)).toEqual([
			undefined,
			undefined,
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
		const attacks = allHits(result).filter(
			({ source }) => source.kind === "attack",
		)

		expect(passive.map(({ time }) => time)).toEqual([
			attacks[2]?.time,
			attacks[5]?.time,
		])
		expect(passive[0]?.damage).toMatchObject({ type: "magic", raw: 75 })
		expect(hitsFrom(result, "SwingDamageTotal")[0]?.damage.raw).toBe(100)
	})
})

function stats(setup: Setup) {
	return computeBuildStats(buildOf(setup))
}

describe("Ahri (issue 419)", async () => {
	const ahri: Setup = {
		champion: await champion("Ahri"),
		level: 9,
		ranks: { Q: 5, W: 2, E: 1, R: 1 },
	}

	test("Orb of Deception deals 135 magic damage out and the same as true damage back at rank 5 (wiki)", () => {
		const hits = allHits(simulate(ahri, [cast("Q")]))

		expect(hits.map(({ damage }) => [damage.type, damage.raw])).toEqual([
			["magic", 135],
			["true", 135],
		])
		expect(hits[1]?.damage.final).toBe(135)
	})

	test("Fox-Fire is instant, and its three flames hit a lone target, the second and third for 40% (wiki)", () => {
		const result = simulate(ahri, [cast("W"), cast("E")])

		expect(result.steps[1]?.time).toBe(0)
		expect(
			hitsFrom(result, "SingleFireDamage")
				.concat(hitsFrom(result, "MultiFireDamage"))
				.map(({ damage }) => damage.raw),
		).toEqual([60, 24, 24])
	})

	test("Spirit Rush recasts twice, 1 s apart, each a 75 bolt at rank 1; then its cooldown holds from the first cast (wiki)", () => {
		const result = simulate(ahri, [cast("R"), cast("R"), cast("R"), cast("R")])

		expect(result.steps.slice(0, 3).map(({ time }) => time)).toEqual([0, 1, 2])
		expect(
			hitsFrom(result, "RCalculatedDamage").map(({ damage }) => damage.raw),
		).toEqual([75, 75, 75])
		expect(result.steps[3]?.refused).toBe(
			"Spirit Rush is on cooldown until 140 s",
		)
	})

	test("a recast waits for the 1 s gap, not more: Spirit Rush after a 0.4 s wait recasts at 1 s", () => {
		const result = simulate(ahri, [cast("R"), wait(0.4), cast("R")])

		expect(result.steps[2]?.time).toBe(1)
	})
})

describe("Darius (issue 419)", async () => {
	const darius: Setup = {
		champion: await champion("Darius"),
		level: 9,
		ranks: { Q: 5, W: 1, E: 2, R: 1 },
	}
	const bleedTick = 21 / 4

	test("Decimate swings 0.75 s after the cast, and Darius can't attack before (wiki)", () => {
		const result = simulate(darius, [cast("Q"), ATTACK])

		expect(hitsFrom(result, "BladeDamage")[0]?.time).toBe(0.75)
		expect(result.steps[1]?.time).toBe(0.75)
	})

	test("an attack's Hemorrhage stack bleeds a quarter of 21 every 1.25 s for 5 s at level 9 (wiki)", () => {
		const result = simulate(darius, [ATTACK])
		const landed = allHits(result)[0]?.time ?? 0
		const bleed = hitsFrom(result, "darius-hemorrhage")

		expect(bleed.map(({ time }) => time - landed)).toEqual([
			expect.closeTo(1.25),
			expect.closeTo(2.5),
			expect.closeTo(3.75),
			expect.closeTo(5),
		])
		expect(bleed[0]?.damage.raw).toBeCloseTo(bleedTick)
	})

	test("Decimate's blade adds a stack; its handle deals 35% and doesn't (wiki)", () => {
		const blade = simulate(darius, [cast("Q", "blade")])
		const handle = simulate(darius, [cast("Q", "handle")])
		const bladeRaw = hitsFrom(blade, "BladeDamage")[0]?.damage.raw ?? 0

		expect(hitsFrom(blade, "darius-hemorrhage")).toHaveLength(4)
		expect(hitsFrom(handle, "darius-hemorrhage")).toHaveLength(0)
		expect(hitsFrom(handle, "HandleDamage")[0]?.damage.raw).toBeCloseTo(
			bladeRaw * 0.35,
		)
	})

	test("Noxian Guillotine deals 20% more per stack, then adds its own: 125 alone, 175 on 2 stacks at rank 1 (wiki)", () => {
		const alone = simulate(darius, [cast("R")])
		const stacked = simulate(darius, [ATTACK, ATTACK, cast("R")])

		expect(hitsFrom(alone, "Damage")[0]?.damage).toMatchObject({
			type: "true",
			raw: 125,
		})
		expect(hitsFrom(alone, "darius-hemorrhage")).toHaveLength(4)
		expect(hitsFrom(stacked, "Damage")[0]?.damage.raw).toBeCloseTo(175)
	})

	test("5 stacks: Noxian Might adds 70 AD at level 9 for 5 s, and Noxian Guillotine deals double (wiki)", () => {
		const result = simulate(darius, [...Array(5).fill(ATTACK), cast("R")])
		const might = result.steps[4]?.active.find(
			({ effectId }) => effectId === "darius-noxian-might",
		)

		const fifth = allHits(result).filter(
			({ source }) => source.kind === "attack",
		)[4]

		expect(might?.endsAt).toBeCloseTo((fifth?.time ?? 0) + 5)
		expect(hitsFrom(result, "Damage")[0]?.damage.raw).toBeCloseTo(
			(125 + 0.75 * 70) * 2,
		)
	})
})

describe("Jinx (issue 419)", async () => {
	const jinx: Setup = {
		champion: await champion("Jinx"),
		level: 9,
		ranks: { Q: 5, W: 2, E: 1, R: 1 },
	}

	test("Zap! takes 0.6 s at no bonus attack speed (wiki; the game files give 0.25 s)", () => {
		const level1 = { ...jinx, level: 1, ranks: { Q: 0, W: 1, E: 0, R: 0 } }
		const result = simulate(level1, [cast("W"), ATTACK])

		expect(result.steps[1]?.time).toBeCloseTo(0.6)
	})

	test("Zap!'s cast time shrinks toward 0.4 s at 250% bonus attack speed (wiki)", () => {
		const level18 = { ...jinx, level: 18, ranks: { Q: 0, W: 5, E: 0, R: 0 } }
		const { attackSpeed } = stats(level18)
		const bonus = attackSpeed.bonus / 0.625
		const result = simulate(level18, [cast("W"), ATTACK])

		expect(bonus).toBeGreaterThan(0)
		expect(result.steps[1]?.time).toBeCloseTo(0.6 - (0.2 * bonus) / 2.5)
	})

	test("Switcheroo! is the form switch, never a cast in the combo", () => {
		const result = simulate(jinx, [cast("Q")])

		expect(result.steps[0]?.refused).toContain("Switcheroo!")
	})

	test("Flame Chompers! explode under the target 0.9 s after the cast: 90 magic at rank 1 (wiki)", () => {
		const [explosion] = hitsFrom(simulate(jinx, [cast("E")]), "jinx-e")

		expect(explosion?.time).toBeCloseTo(0.9)
		expect(explosion?.damage).toMatchObject({ type: "magic", raw: 90 })
	})

	test("Rev'd up: the first stack gives half of 130% at rank 5, the second three quarters (wiki)", () => {
		const base = stats(jinx).attackSpeed.total
		const result = simulate(jinx, [ATTACK, ATTACK, ATTACK])
		const [first, second, third] = result.steps.map(({ time }) => time)

		expect(second ?? 0).toBeCloseTo(1 / (base + 0.625 * 1.3 * 0.5))
		expect((third ?? 0) - (second ?? 0)).toBeCloseTo(
			1 / (base + 0.625 * 1.3 * 0.75),
		)
		expect(first).toBe(0)
	})

	test("Fishbones' attacks deal 110% AD (wiki)", () => {
		const rockets = { ...jinx, form: "rockets" }
		const [attack] = allHits(simulate(rockets, [ATTACK]))

		expect(attack?.damage.raw).toBeCloseTo(attackDamage(rockets) * 1.1)
	})

	test("Pow-Pow's attacks deal their AD", () => {
		const [attack] = allHits(simulate(jinx, [ATTACK]))

		expect(attack?.damage.raw).toBeCloseTo(attackDamage(jinx))
	})
})

describe("Vayne (issue 419)", async () => {
	const vayne: Setup = {
		champion: await champion("Vayne"),
		level: 9,
		ranks: { Q: 5, W: 2, E: 1, R: 1 },
	}

	test("Tumble resets the attack timer and adds 115% AD at rank 5 (wiki)", () => {
		const result = simulate(vayne, [ATTACK, cast("Q")])
		const [first] = allHits(result)
		const [bonus] = hitsFrom(result, "ADRatioBonus")

		expect(result.steps[1]?.time).toBe(first?.time ?? -1)
		expect(bonus?.damage.raw).toBeCloseTo(attackDamage(vayne) * 1.15)
	})

	test("Silver Bolts: every third hit deals 5.5% of maximum health as true damage at rank 2 (wiki)", () => {
		const result = simulate(vayne, Array(6).fill(ATTACK))
		const bolts = hitsFrom(result, "vayne-w-bolt")

		expect(bolts.map(({ damage }) => [damage.type, damage.raw])).toEqual([
			["true", 1100],
			["true", 1100],
		])
	})

	test("Condemn adds a Silver Bolts stack: attack, attack, Condemn procs it (wiki)", () => {
		const result = simulate(vayne, [ATTACK, ATTACK, cast("E")])

		expect(
			result.steps[2]?.events.some(
				(event) =>
					event.kind === "hit" &&
					event.source.kind === "effect" &&
					event.source.effectId === "vayne-w-bolt",
			),
		).toBe(true)
	})

	test("Silver Bolts can't be cast", () => {
		expect(simulate(vayne, [cast("W")]).steps[0]?.refused).toContain(
			"Silver Bolts",
		)
	})

	test("Condemn into a wall deals 250%: 50 + 75 at rank 1 with no bonus AD (wiki)", () => {
		const open = hitsFrom(simulate(vayne, [cast("E")]), "TotalDamage")
		const wall = allHits(simulate(vayne, [cast("E", "wall")]))

		expect(open.map(({ damage }) => damage.raw)).toEqual([50])
		expect(wall.map(({ damage }) => damage.raw)).toEqual([50, 75])
	})

	test("Final Hour is instant, grants 35 AD at rank 1 and shortens Tumble's 2 s cooldown by 30% (wiki)", () => {
		const result = simulate(vayne, [cast("R"), cast("Q"), wait(1.5), cast("Q")])
		const without = simulate(vayne, [cast("Q"), wait(1.5), cast("Q")])
		const [attack] = allHits(result)

		expect(result.steps[1]?.time).toBe(0)
		expect(attack?.damage.raw).toBeCloseTo(attackDamage(vayne) + 35)
		expect(result.steps[3]?.refused).toBeUndefined()
		expect(without.steps[2]?.refused).toContain("on cooldown")
	})
})
