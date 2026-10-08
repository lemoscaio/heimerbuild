import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { type Rune, runesFileSchema } from "@schemas/rune"
import { combatEffects } from "../effects/available-effects"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import { attackWindupTime } from "./attack-windup"
import type {
	CombatAction,
	CombatEvent,
	CombatItem,
	CombatResult,
	CombatTarget,
} from "./combat"
import { type CombatBuild, simulateCombat } from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-07).
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

function item(name: string): Item {
	const found = ITEMS.find((entry) => entry.name === name)
	if (!found) throw new Error(`${name} is not in the current patch`)
	return found
}

function rune(key: string): Rune {
	const found = RUNES.find((entry) => entry.key === key)
	if (!found) throw new Error(`${key} is not in the current patch`)
	return found
}

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
	items?: readonly Item[]
	runes?: readonly Rune[]
}

function buildOf({ champion, level, ranks, items = [] }: Setup): CombatBuild {
	return { champion, patch: PATCH, level, items, shards: [], ranks }
}

function simulate(setup: Setup, actions: readonly CombatItem[]) {
	return simulateCombat({
		build: buildOf(setup),
		effects: combatEffects({
			patch: PATCH,
			champion: setup.champion,
			ranks: setup.ranks,
			spells: [],
			runes: setup.runes ?? [],
			items: setup.items ?? [],
		}),
		summoners: [],
		target: TARGET,
		actions,
	})
}

type Hit = Extract<CombatEvent, { kind: "hit" }>

/** The hits of a step with a number, in order. */
function hits(result: CombatResult, step: number) {
	return (result.steps[step]?.events ?? []).flatMap((event) =>
		event.kind === "hit" && "damage" in event ? [event] : [],
	)
}

function sourceName({ source }: Hit) {
	if (source.kind === "attack") return "attack"
	return source.kind === "effect" ? source.effectId : source.name
}

function running(result: CombatResult, step: number) {
	return (result.steps[step]?.active ?? []).map(({ effectId }) => effectId)
}

const ATTACK: CombatAction = { kind: "attack" }
const Q: CombatAction = { kind: "ability", slot: "Q" }
const W: CombatAction = { kind: "ability", slot: "W" }
const R: CombatAction = { kind: "ability", slot: "R" }

describe("empowered attacks: a cast that is its champion's next attack (issue 388)", async () => {
	const rengar: Setup = {
		champion: await champion("Rengar"),
		level: 9,
		ranks: { Q: 3, W: 1, E: 1, R: 1 },
	}
	const { base, total: atRest } = computeBuildStats(buildOf(rengar)).attackSpeed
	const ratio = rengar.champion.stats.attackSpeed.ratio
	const savageSpeed = atRest + ratio * 0.4
	/** Rengar's windup (wiki: 20%) at an attack speed. */
	const windup = (total: number) =>
		attackWindupTime(rengar.champion.attackWindup, { base, total })

	test("Rengar's Q alone is his attack plus Savagery's bonus, physical, at the end of its windup", () => {
		const result = simulate(rengar, [Q])
		const [attack, savagery] = hits(result, 0)
		if (!attack || !savagery) throw new Error("missing hits")
		const ad = attack.damage.raw

		expect(hits(result, 0).map(sourceName)).toEqual(["attack", "QTotalDamage"])
		// The cast starts Savagery's 40% attack speed before its attack winds up.
		expect(attack.time).toBeCloseTo(windup(savageSpeed))
		expect(savagery.time).toBe(attack.time)
		// Wiki, rank 3: 90 (+ 5% AD) bonus physical damage.
		expect(savagery.damage).toEqual({
			type: "physical",
			raw: expect.closeTo(90 + 0.05 * ad),
			final: expect.closeTo(((90 + 0.05 * ad) * 100) / 170),
		})
		expect(result.steps[0]?.events.map(({ kind }) => kind)).toContain("on-hit")
	})

	test("the attack after it waits a full attack timer from its start, at Savagery's 40% attack speed", () => {
		const result = simulate(rengar, [Q, ATTACK])

		expect(result.steps[1]?.time).toBeCloseTo(1 / savageSpeed)
	})

	test("after an attack it resets the attack timer: it starts as the attack's windup ends", () => {
		const result = simulate(rengar, [ATTACK, Q])
		const [attack] = hits(result, 1)

		expect(result.steps[1]?.time).toBeCloseTo(windup(atRest))
		expect(attack?.time).toBeCloseTo(windup(atRest) + windup(savageSpeed))
	})

	test("AA, Q, AA is faster than AA, AA, AA (the reset saves the rest of the first attack's timer)", () => {
		const reset = simulate(rengar, [ATTACK, Q, ATTACK])
		const plain = simulate(rengar, [ATTACK, ATTACK, ATTACK])

		// The third attack waits for the timer the Savagery attack started.
		expect(reset.steps[2]?.time).toBeCloseTo(windup(atRest) + 1 / savageSpeed)
		expect(plain.steps[2]?.time).toBeCloseTo(2 / atRest)
		expect(reset.duration).toBeLessThan(plain.duration)
	})

	test("it is the first of Savagery's two faster attacks: the one after it is the last", () => {
		const result = simulate(rengar, [Q, ATTACK, ATTACK])
		const gap = (step: number) =>
			(result.steps[step]?.time ?? 0) - (result.steps[step - 1]?.time ?? 0)

		expect(running(result, 0)).toContain("rengar-q-active")
		expect(running(result, 1)).not.toContain("rengar-q-active")
		// The last charge's attack still times the next one at its speed.
		expect(gap(2)).toBeCloseTo(1 / (atRest + ratio * 0.4))
	})

	test("Savagery can't be recast before its cooldown: 5 s at rank 3 (wiki: 6 to 4 s)", () => {
		const result = simulate(rengar, [Q, Q, { kind: "wait", seconds: 5 }, Q])

		expect(result.steps[1]?.refused).toBe("Savagery is on cooldown until 5 s")
		expect(result.steps[3]?.refused).toBeUndefined()
		expect(hits(result, 3).map(sourceName)).toEqual(["attack", "QTotalDamage"])
	})

	test("it ends Thrill of the Hunt as an attack", () => {
		const result = simulate(rengar, [R, Q])
		const expired = result.steps[1]?.events.find(
			(event) =>
				event.kind === "expire" &&
				"effectId" in event &&
				event.effectId === "rengar-r-active",
		)

		expect(expired?.time).toBe(result.steps[1]?.time)
		expect(running(result, 1)).not.toContain("rengar-r-active")
	})

	test("Black Cleaver: its attack adds a Carve stack, which its own hit doesn't read", () => {
		const result = simulate({ ...rengar, items: [item("Black Cleaver")] }, [Q])
		const [attack] = hits(result, 0)
		if (!attack) throw new Error("no attack hit")

		expect(attack.damage.final).toBeCloseTo((attack.damage.raw * 100) / 170)
		expect(result.steps[0]?.resists?.armor).toBeCloseTo(70 * 0.94)
	})

	test("a spellblade the cast primes is spent by its attack's on-hit", () => {
		const result = simulate({ ...rengar, items: [item("Sheen")] }, [Q])

		expect(hits(result, 0).map(sourceName)).toEqual([
			"attack",
			"QTotalDamage",
			"sheen-spellblade",
		])
	})

	test("Hail of Blades empowers it as its first attack", () => {
		const result = simulate({ ...rengar, runes: [rune("HailOfBlades")] }, [
			{ kind: "situation", effectId: "hail-of-blades" },
			Q,
		])
		const hail = result.steps[1]?.outcomes.find(
			(outcome) =>
				outcome.kind === "empowered" && outcome.effectId === "hail-of-blades",
		)

		expect(hail).toMatchObject({ happened: true, charge: { used: 1, max: 3 } })
		expect(hits(result, 1).map(sourceName)).toContain("hail-of-blades")
	})

	test("Nasus's Q: his attack plus Siphoning Strike's base bonus, without stacks", async () => {
		const nasus: Setup = {
			champion: await champion("Nasus"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
		}
		const result = simulate(nasus, [Q, Q])
		const [attack, siphon] = hits(result, 0)

		expect(attack?.source.kind).toBe("attack")
		// Wiki, rank 1: 30 (+ stacks) bonus physical damage.
		expect(siphon?.damage.raw).toBeCloseTo(30)
		expect(result.steps[1]?.refused).toContain("on cooldown")
	})

	test("Darius's W: the bonus is what the whole attack adds, 40% AD at rank 1", async () => {
		const darius: Setup = {
			champion: await champion("Darius"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 0, R: 0 },
		}
		const [attack, strike] = hits(simulate(darius, [W]), 0)
		if (!attack || !strike) throw new Error("missing hits")

		expect(strike.damage.raw).toBeCloseTo(0.4 * attack.damage.raw)
	})

	test("Jax's W: his attack plus a magic bonus", async () => {
		const jax: Setup = {
			champion: await champion("Jax"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
		}
		const [attack, empower] = hits(simulate(jax, [W]), 0)

		expect(attack?.damage.type).toBe("physical")
		// Wiki, rank 1: 50 (+ 60% AP) bonus magic damage.
		expect(empower?.damage).toMatchObject({
			type: "magic",
			raw: expect.closeTo(50),
		})
	})
})

describe("attack windup: an attack keeps the champion busy only until it lands (issue 395)", async () => {
	const darius: Setup = {
		champion: await champion("Darius"),
		level: 9,
		ranks: { Q: 5, W: 2, E: 1, R: 1 },
	}
	const { attackSpeed } = computeBuildStats(buildOf(darius))
	// Wiki: 20% windup with a 0.5 modifier, so bonus attack speed shortens it half as much.
	const windup = attackWindupTime({ percent: 0.2, modifier: 0.5 }, attackSpeed)
	const period = 1 / attackSpeed.total

	test("the attack's hit lands at the end of its windup, and the combo's time is that hit", () => {
		const result = simulate(darius, [ATTACK])

		expect(darius.champion.attackWindup).toEqual({
			percent: 0.2,
			modifier: 0.5,
		})
		expect(result.steps[0]?.time).toBe(0)
		expect(hits(result, 0)[0]?.time).toBeCloseTo(windup)
		expect(result.duration).toBeCloseTo(windup)
	})

	test("a cast after an attack starts once the windup ends", () => {
		const result = simulate(darius, [ATTACK, Q])

		expect(result.steps[1]?.time).toBeCloseTo(windup)
	})

	test("the next plain attack still waits for the attack timer", () => {
		const result = simulate(darius, [ATTACK, ATTACK])

		expect(result.steps[1]?.time).toBeCloseTo(period)
		expect(result.duration).toBeCloseTo(period + windup)
	})

	test("AA, W, AA is faster than AA, AA, AA: Crippling Strike starts right after the first windup", () => {
		const reset = simulate(darius, [ATTACK, W, ATTACK])
		const plain = simulate(darius, [ATTACK, ATTACK, ATTACK])

		expect(reset.steps.map(({ time }) => time)).toEqual([
			0,
			expect.closeTo(windup),
			expect.closeTo(windup + period),
		])
		expect(reset.duration).toBeCloseTo(windup + period + windup)
		expect(plain.duration).toBeCloseTo(2 * period + windup)
		expect(reset.duration).toBeLessThan(plain.duration)
	})

	test("Leona's Shield of Daybreak doesn't put her attack on cooldown: the next attack starts after its windup", async () => {
		const leona: Setup = {
			champion: await champion("Leona"),
			level: 9,
			ranks: { Q: 5, W: 2, E: 1, R: 1 },
		}
		const leonaWindup = attackWindupTime(
			leona.champion.attackWindup,
			computeBuildStats(buildOf(leona)).attackSpeed,
		)
		const result = simulate(leona, [ATTACK, Q, ATTACK])
		const [attack, shield] = hits(result, 1)

		expect(result.steps.map(({ time }) => time)).toEqual([
			0,
			expect.closeTo(leonaWindup),
			expect.closeTo(2 * leonaWindup),
		])
		expect(attack?.source.kind).toBe("attack")
		// Wiki, rank 5: 110 (+ 30% AP) bonus magic damage.
		expect(shield?.damage).toMatchObject({
			type: "magic",
			raw: expect.closeTo(110),
		})
	})
})
