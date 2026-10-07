import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { type Rune, runesFileSchema } from "@schemas/rune"
import { combatEffects } from "../effects/available-effects"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
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
	const atRest = computeBuildStats(buildOf(rengar)).attackSpeed.total
	const ratio = rengar.champion.stats.attackSpeed.ratio

	test("Rengar's Q alone is his attack plus Savagery's bonus, physical, at the cast", () => {
		const result = simulate(rengar, [Q])
		const [attack, savagery] = hits(result, 0)
		if (!attack || !savagery) throw new Error("missing hits")
		const ad = attack.damage.raw

		expect(hits(result, 0).map(sourceName)).toEqual(["attack", "QTotalDamage"])
		expect(attack.time).toBe(0)
		expect(savagery.time).toBe(0)
		// Wiki, rank 3: 90 (+ 5% AD) bonus physical damage.
		expect(savagery.damage).toEqual({
			type: "physical",
			raw: expect.closeTo(90 + 0.05 * ad),
			final: expect.closeTo(((90 + 0.05 * ad) * 100) / 170),
		})
		expect(result.steps[0]?.events.map(({ kind }) => kind)).toContain("on-hit")
	})

	test("the attack after it waits a full attack timer from its hit, at Savagery's 40% attack speed", () => {
		const result = simulate(rengar, [Q, ATTACK])

		expect(result.steps[1]?.time).toBeCloseTo(1 / (atRest + ratio * 0.4))
	})

	test("after an attack it waits for the attack timer, like an attack", () => {
		const result = simulate(rengar, [ATTACK, Q])
		const [attack] = hits(result, 1)

		expect(result.steps[1]?.time).toBeCloseTo(1 / atRest)
		expect(attack?.time).toBeCloseTo(1 / atRest)
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
