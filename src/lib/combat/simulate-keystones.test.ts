import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { type Rune, runesFileSchema } from "@schemas/rune"
import { combatEffects } from "../effects/available-effects"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatItem,
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
	target?: CombatTarget
	matchStacks?: Record<string, number>
}

function buildOf(setup: Setup): CombatBuild {
	const { champion, level, ranks, items = [], matchStacks } = setup
	return {
		champion,
		patch: PATCH,
		level,
		items,
		shards: [],
		ranks,
		matchStacks,
	}
}

function simulate(
	setup: Setup,
	actions: readonly CombatItem[],
	{ startOnCooldown }: Pick<CombatInput, "startOnCooldown"> = {},
) {
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
		target: setup.target ?? TARGET,
		actions,
		startOnCooldown,
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

	test("started on its cooldown (issue 317), it gains no stacks and doesn't strike", () => {
		const result = simulate(annie, [cast("Q"), cast("W"), attack], {
			startOnCooldown: ["electrocute"],
		})

		expect(effectHits(result, "electrocute")).toHaveLength(0)
		expect(stacksOf(result, "electrocute-stacks")).toEqual([0, 0, 0])
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

	test("Judgment's spins are one stack: its Conqueror special case doesn't apply", async () => {
		const garen: Setup = {
			champion: await champion("Garen"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			runes: [rune("Electrocute")],
		}

		expect(
			effectHits(simulate(garen, [cast("E"), wait(3)]), "electrocute"),
		).toHaveLength(0)
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

/** A step's own hits that no effect dealt (its attack's or its cast's). */
function effectlessHits(result: CombatResult, step: number): DealtDamage[] {
	return (result.steps[step]?.events ?? []).flatMap((event) =>
		event.kind === "hit" && "damage" in event && event.source.kind !== "effect"
			? [event.damage]
			: [],
	)
}

/** An effect's stacks on the attacker after each step, 0 while it doesn't run. */
function stacksOf(result: CombatResult, effectId: string): number[] {
	return result.steps.map(
		(step) =>
			step.active.find((active) => active.effectId === effectId)?.stacks ?? 0,
	)
}

describe("Conqueror", async () => {
	const garen: Setup = {
		champion: await champion("Garen"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
		runes: [rune("Conqueror")],
		items: [item("Long Sword")],
	}
	// Wiki: 1.8 + (4 − 1.8) / 17 × (level − 1) adaptive force per stack; AD at 0.6 per point.
	const perStack = (level: number) => 1.8 + (2.2 / 17) * (level - 1)

	test("a melee attack adds 2 stacks, up to 12, refreshed for 5 s", () => {
		const seven = Array.from({ length: 7 }, () => attack)
		const result = simulate(garen, seven)
		const late = simulate(garen, [attack, wait(5), attack])

		expect(stacksOf(result, "conqueror")).toEqual([2, 4, 6, 8, 10, 12, 12])
		expect(stacksOf(late, "conqueror")).toEqual([2, 0, 2])
	})

	test("its adaptive force shows in the next hits' damage", () => {
		const [first, second] = attackHits(simulate(garen, [attack, attack]))
		const ad = computeBuildStats(buildOf(garen)).attackDamage.total

		expect(first?.final).toBeCloseTo(physical(ad))
		expect(second?.final).toBeCloseTo(physical(ad + 0.6 * 2 * perStack(9)))
	})

	test("a ranged attack adds 1 stack; an ability 2, as ability power for an AP build", async () => {
		const jinx: Setup = {
			champion: await champion("Jinx"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			runes: [rune("Conqueror")],
		}
		const annie: Setup = {
			champion: await champion("Annie"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
			runes: [rune("Conqueror")],
			items: [item("Amplifying Tome")],
		}
		const result = simulate(annie, [cast("Q"), cast("W")])
		const [w] = effectlessHits(result, 1)
		const alone = simulate(annie, [cast("W")]).total.raw

		expect(stacksOf(simulate(jinx, [attack, attack]), "conqueror")).toEqual([
			1, 2,
		])
		expect(stacksOf(result, "conqueror")).toEqual([2, 4])
		// Incinerate: 70 (+ 80% AP), with Q's 2 stacks as AP.
		expect(w?.raw).toBeCloseTo(alone + 0.8 * 2 * perStack(9))
	})

	test("each of Judgment's spins adds 2 stacks (wiki special case), 0.43 s apart at level 9", () => {
		const spins = simulate(garen, [cast("E"), wait(1), wait(2)])

		// 7 spins over 3 s, each as it completes: none at the cast, 2 by 1 s, all 7 by 3 s, capped at 12.
		expect(stacksOf(spins, "conqueror")).toEqual([0, 4, 12])
	})

	test("a Judgment ended early stacks only the spins that landed (issue 427): 3 by 1.5 s", () => {
		const short = simulate(garen, [
			{ kind: "ability", slot: "E", inArea: 1.5 },
			wait(3),
		])

		expect(stacksOf(short, "conqueror")).toEqual([0, 6])
	})

	test("another cast hitting several times still adds one action's stacks (Brand's Pyroclasm, 3 hits)", async () => {
		const brand: Setup = {
			champion: await champion("Brand"),
			level: 11,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			runes: [rune("Conqueror")],
		}

		expect(
			stacksOf(simulate(brand, [cast("R"), wait(2)]), "conqueror"),
		).toEqual([2, 2])
	})
})

describe("Lethal Tempo", async () => {
	const garen: Setup = {
		champion: await champion("Garen"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
		runes: [rune("LethalTempo")],
		items: [item("Long Sword")],
	}
	const seven = Array.from({ length: 7 }, () => attack)

	test("each attack adds a stack as it starts, up to 6, for 6 s", () => {
		const result = simulate(garen, seven)
		const stacks = result.steps.map(
			(step) =>
				step.outcomes.find(
					(outcome) =>
						outcome.kind === "empowered" && outcome.effectId === "lethal-tempo",
				)?.stacks?.count,
		)

		expect(stacks).toEqual([1, 2, 3, 4, 5, 6, 6])
		expect(
			stacksOf(simulate(garen, [attack, wait(6.5), attack]), "lethal-tempo"),
		).toEqual([1, 0, 1])
	})

	test("its attack speed is 6% a stack melee: the second attack comes sooner", () => {
		const result = simulate(garen, [attack, attack])
		const { attackSpeed } = computeBuildStats(buildOf(garen))
		const ratio = garen.champion.stats.attackSpeed.ratio

		// The first attack's timer reads its own stack (on-attack).
		expect(result.steps[1]?.time).toBeCloseTo(
			1 / (attackSpeed.total + ratio * 0.06),
		)
	})

	test("at 6 stacks each attack fires its bolt: 9 to 30 adaptive, 1% more per 1% bonus attack speed", () => {
		const result = simulate(garen, seven)
		const bolts = effectHits(result, "lethal-tempo")
		const { attackSpeed } = computeBuildStats(buildOf(garen))
		const ratio = garen.champion.stats.attackSpeed.ratio
		const bonus = attackSpeed.bonus / ratio + 0.36
		// Wiki: 9 + (30 − 9) / 17 × (level − 1).
		const base = 9 + (21 / 17) * 8

		expect(bolts.map(({ step }) => step)).toEqual([5, 6])
		expect(bolts[0]?.type).toBe("physical")
		expect(bolts[0]?.raw).toBeCloseTo(base * (1 + bonus))
	})

	test("a ranged champion gets 4.8% a stack and two thirds of the bolt", async () => {
		const quinn: Setup = {
			champion: await champion("Quinn"),
			level: 9,
			ranks: { Q: 0, W: 0, E: 0, R: 0 },
			runes: [rune("LethalTempo")],
			items: [item("Long Sword")],
		}
		const result = simulate(quinn, seven)
		const { attackSpeed } = computeBuildStats(buildOf(quinn))
		const ratio = quinn.champion.stats.attackSpeed.ratio
		const bonus = attackSpeed.bonus / ratio + 0.288
		const base = (9 + (21 / 17) * 8) * 0.667
		const [bolt] = effectHits(result, "lethal-tempo")

		expect(result.steps[1]?.time).toBeCloseTo(
			1 / (attackSpeed.total + ratio * 0.048),
		)
		expect(bolt?.raw).toBeCloseTo(base * (1 + bonus))
	})
})

describe("Summon Aery", async () => {
	const annie: Setup = {
		champion: await champion("Annie"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 0 },
		runes: [rune("SummonAery")],
		items: [item("Amplifying Tome")],
	}
	const ap = computeBuildStats(buildOf(annie)).abilityPower.total
	// Wiki: 10 + 40 / 17 × (level − 1) (+ 10% bonus AD) (+ 5% AP) adaptive, 0.45 s after the hit.
	const pounce = (level: number) => 10 + (40 / 17) * (level - 1) + 0.05 * ap

	test("an ability's damage sends her: adaptive damage 0.45 s later", () => {
		const [hit, ...more] = effectHits(
			simulate(annie, [cast("Q")]),
			"summon-aery",
		)

		expect(more).toHaveLength(0)
		expect(hit?.time).toBeCloseTo(0.45)
		expect(hit?.type).toBe("magic")
		expect(hit?.final).toBeCloseTo(magic(pounce(9)))
	})

	test("she goes again only 2.45 s after she was sent, back from lingering", () => {
		const quick = simulate(annie, [cast("Q"), cast("W"), attack])
		// Q's 0.25 s cast time, then 2.25 s: W at 2.50 s, just after she's back.
		const later = simulate(annie, [cast("Q"), wait(2.25), cast("W")])
		const sooner = simulate(annie, [cast("Q"), wait(2.1), cast("W")])

		expect(effectHits(quick, "summon-aery")).toHaveLength(1)
		expect(effectHits(sooner, "summon-aery")).toHaveLength(1)
		expect(effectHits(later, "summon-aery").map(({ time }) => time)).toEqual([
			expect.closeTo(0.45),
			expect.closeTo(2.95),
		])
	})
})

describe("Arcane Comet", async () => {
	const annie: Setup = {
		champion: await champion("Annie"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 0 },
		runes: [rune("ArcaneComet")],
		items: [item("Amplifying Tome")],
	}
	const ap = computeBuildStats(buildOf(annie)).abilityPower.total

	test("ability damage hurls it: it lands 0.8 s later with its least damage, magic for AP", () => {
		const [hit, ...more] = effectHits(
			simulate(annie, [cast("Q"), cast("W")]),
			"arcane-comet",
		)
		// Wiki: 15 + (100 − 15) / 17 × (level − 1) (+ 10% bonus AD) (+ 5% AP).
		const comet = 15 + (85 / 17) * 8 + 0.05 * ap

		expect(more).toHaveLength(0)
		expect(hit?.time).toBeCloseTo(0.8)
		expect(hit?.type).toBe("magic")
		expect(hit?.final).toBeCloseTo(magic(comet))
	})

	test("attacks don't hurl it, and its cooldown is 20 to 8 s by level", () => {
		// Wiki: 20 − (20 − 8) / 17 × (level − 1): 14.35 s at level 9.
		const cooldown = 20 - (12 / 17) * 8
		const early = simulate(annie, [cast("Q"), wait(cooldown - 0.5), cast("Q")])
		const late = simulate(annie, [cast("Q"), wait(cooldown + 0.5), cast("Q")])

		expect(
			effectHits(simulate(annie, [attack, attack]), "arcane-comet"),
		).toHaveLength(0)
		expect(effectHits(early, "arcane-comet")).toHaveLength(1)
		expect(effectHits(late, "arcane-comet")).toHaveLength(2)
	})
})

describe("First Strike", async () => {
	const annie: Setup = {
		champion: await champion("Annie"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 0 },
		runes: [rune("FirstStrike")],
	}

	test("the first hit starts it: 7% of each hit after mitigation as true damage for 3 s, that hit's too", () => {
		const result = simulate(annie, [cast("Q"), cast("W"), wait(3), cast("Q")])
		const bonus = effectHits(result, "first-strike")
		const [q, w] = [0, 1].map((step) => effectlessHits(result, step)[0])

		expect(bonus).toHaveLength(2)
		expect(bonus[0]).toMatchObject({ type: "true", step: 0 })
		expect(bonus[0]?.final).toBeCloseTo((q?.final ?? 0) * 0.07)
		expect(bonus[1]?.final).toBeCloseTo((w?.final ?? 0) * 0.07)
	})
})

describe("Dark Harvest", async () => {
	const annie: Setup = {
		champion: await champion("Annie"),
		level: 9,
		ranks: { Q: 3, W: 3, E: 1, R: 0 },
		runes: [rune("DarkHarvest")],
		items: [item("Amplifying Tome")],
		target: { ...TARGET, health: 400 },
	}
	const ap = computeBuildStats(buildOf(annie)).abilityPower.total
	// Wiki: 30 (+ 11 per soul) (+ 10% bonus AD) (+ 5% AP) adaptive.
	const harvest = (souls: number) => 30 + 11 * souls + 0.05 * ap

	test("the hit that leaves the target under 50% health deals its damage, then 35 s of cooldown", () => {
		const result = simulate(annie, [cast("Q"), cast("W"), wait(1), cast("Q")])
		const [hit, ...more] = effectHits(result, "dark-harvest")
		const afterQ = result.steps[0]?.targetHealth ?? 0

		expect(afterQ).toBeGreaterThan(200)
		expect(more).toHaveLength(0)
		expect(hit).toMatchObject({ type: "magic", step: 1 })
		expect(hit?.final).toBeCloseTo(magic(harvest(0)))
	})

	test("each soul the build sets adds 11 damage", () => {
		const souled = simulate(
			{ ...annie, matchStacks: { "dark-harvest-souls": 10 } },
			[cast("Q"), cast("W")],
		)
		const [hit] = effectHits(souled, "dark-harvest")

		expect(hit?.final).toBeCloseTo(magic(harvest(10)))
	})
})

describe("Grasp of the Undying", async () => {
	const garen: Setup = {
		champion: await champion("Garen"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
		runes: [rune("GraspOfTheUndying")],
	}
	const health = computeBuildStats(buildOf(garen)).health.total
	const five = [attack, attack, attack, attack, attack]

	test("ready at the start: the first attack deals 3.5% of maximum health as magic damage, then every 4 s", () => {
		const procs = effectHits(simulate(garen, five), "grasp-of-the-undying-proc")

		expect(procs[0]).toMatchObject({ step: 0, type: "magic" })
		expect(procs[0]?.final).toBeCloseTo(magic(0.035 * health))
		expect(procs).toHaveLength(2)
		expect(
			(procs[1]?.time ?? 0) - (procs[0]?.time ?? 0),
		).toBeGreaterThanOrEqual(4)
	})

	test("started on its cooldown: after 4 s in combat the next attack deals it", () => {
		const result = simulate(garen, five, {
			startOnCooldown: ["grasp-of-the-undying-proc"],
		})
		const [hit, ...more] = effectHits(result, "grasp-of-the-undying-proc")
		const firstAfter4 = result.steps.findIndex(({ time }) => time >= 4 - 0.3)

		expect(more).toHaveLength(0)
		expect(hit?.type).toBe("magic")
		expect(hit?.final).toBeCloseTo(magic(0.035 * health))
		expect(hit?.time).toBeGreaterThanOrEqual(4)
		expect(hit?.step).toBe(firstAfter4)
	})

	test("a ranged champion's deals 1.4%", async () => {
		const quinn: Setup = {
			champion: await champion("Quinn"),
			level: 9,
			ranks: { Q: 0, W: 0, E: 0, R: 0 },
			runes: [rune("GraspOfTheUndying")],
		}
		const result = simulate(quinn, [attack])
		const quinnHealth = computeBuildStats(buildOf(quinn)).health.total

		expect(
			effectHits(result, "grasp-of-the-undying-proc")[0]?.final,
		).toBeCloseTo(magic(0.014 * quinnHealth))
	})
})
