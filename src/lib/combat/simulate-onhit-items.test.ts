import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { combatEffects } from "../effects/available-effects"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatEvent,
	CombatResult,
	CombatTarget,
} from "./combat"
import { type CombatInput, simulateCombat } from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-09, issue 418).
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

function item(name: string): Item {
	const found = ITEMS.find((entry) => entry.name === name)
	if (!found) throw new Error(`${name} is not in the current patch`)
	return found
}

// No resistances: every hit's final damage is its raw damage.
const TARGET: CombatTarget = {
	health: 3000,
	armor: 0,
	magicResist: 0,
	level: 9,
}

type Setup = {
	champion: Champion
	level: number
	ranks: AbilityRanks
	items: readonly Item[]
}

function build({ champion, level, ranks, items }: Setup) {
	return { champion, patch: PATCH, level, items, shards: [], ranks }
}

function simulate(setup: Setup, actions: readonly CombatAction[]) {
	const input: CombatInput = {
		build: build(setup),
		// The champion's own effects would add their damage to the attacks.
		effects: combatEffects({
			patch: PATCH,
			champion: setup.champion,
			ranks: setup.ranks,
			spells: [],
			runes: [],
			items: setup.items,
		}).filter(({ effect }) => effect.source.kind === "item"),
		summoners: [],
		target: TARGET,
		actions,
	}
	return simulateCombat(input)
}

type DamageHit = Extract<CombatEvent, { kind: "hit"; damage: unknown }>

/** The hits with a number the step dealt, in order: a delayed one (a phantom hit's) wherever it landed. */
function hits(result: CombatResult, step: number): DamageHit[] {
	return result.steps.flatMap(({ events }, index) =>
		events.flatMap((event) =>
			event.kind === "hit" &&
			"damage" in event &&
			(event.delayed?.owner ?? index) === step
				? [event]
				: [],
		),
	)
}

/** The step's hits from one effect. */
function effectHits(result: CombatResult, step: number, effectId: string) {
	return hits(result, step).filter(
		({ source }) => source.kind === "effect" && source.effectId === effectId,
	)
}

function attackHit(result: CombatResult, step: number) {
	return hits(result, step).find(({ source }) => source.kind === "attack")
}

const ATTACK: CombatAction = { kind: "attack" }
const NO_RANKS: AbilityRanks = { Q: 0, W: 0, E: 0, R: 0 }

const garen = await champion("Garen")
const ezreal = await champion("Ezreal")
const annie = await champion("Annie")

describe("flat on-hit items (wiki)", () => {
	test.each([
		["Recurve Bow", "recurve-bow-sting", "physical", 15],
		["Wit's End", "wits-end-fray", "magic", 45],
		["Guinsoo's Rageblade", "guinsoos-rageblade-wrath", "magic", 30],
	] as const)(
		"%s deals %s's damage with each attack",
		(name, id, type, raw) => {
			const setup = { champion: garen, level: 9, ranks: NO_RANKS }
			const result = simulate({ ...setup, items: [item(name)] }, [
				ATTACK,
				ATTACK,
			])

			for (const step of [0, 1]) {
				const [hit, ...more] = effectHits(result, step, id)
				expect(more).toEqual([])
				expect(hit?.damage).toMatchObject({ type, raw })
			}
		},
	)

	test("Nashor's Tooth deals 15 (+ 15% AP), on attacks and on Mystic Shot's on-hit", () => {
		const setup = {
			champion: ezreal,
			level: 9,
			ranks: { ...NO_RANKS, Q: 1 },
			items: [item("Nashor's Tooth")],
		}
		const ap = computeBuildStats(build(setup)).abilityPower.total
		const result = simulate(setup, [ATTACK, { kind: "ability", slot: "Q" }])

		for (const step of [0, 1]) {
			const [bite] = effectHits(result, step, "nashors-tooth-icathian-bite")
			expect(bite?.damage.type).toBe("magic")
			expect(bite?.damage.raw).toBeCloseTo(15 + 0.15 * ap)
		}
	})

	test("Terminus's Shadow deals 30 (+ 10% bonus AD) (+ 10% AP)", () => {
		const setup = {
			champion: garen,
			level: 9,
			ranks: NO_RANKS,
			items: [item("Terminus"), item("Nashor's Tooth")],
		}
		const stats = computeBuildStats(build(setup))
		const result = simulate(setup, [ATTACK])
		const [shadow] = effectHits(result, 0, "terminus-shadow")

		expect(shadow?.damage.raw).toBeCloseTo(
			30 + 0.1 * stats.attackDamage.bonus + 0.1 * stats.abilityPower.total,
		)
	})

	test("Titanic Hydra's Cleave deals 1% of the user's maximum health (0.5% ranged)", () => {
		for (const [champion, ratio] of [
			[garen, 0.01],
			[ezreal, 0.005],
		] as const) {
			const setup = {
				champion,
				level: 9,
				ranks: NO_RANKS,
				items: [item("Titanic Hydra")],
			}
			const health = computeBuildStats(build(setup)).health.total
			const result = simulate(setup, [ATTACK])
			const [cleave] = effectHits(result, 0, "titanic-hydra-cleave")

			expect(cleave?.damage.raw).toBeCloseTo(ratio * health)
		}
	})
})

describe("Blade of the Ruined King's Mist's Edge (wiki: 9% melee, 6% ranged of current health)", () => {
	const id = "blade-of-the-ruined-king-mists-edge"

	test("each attack deals its share of the health the target had as the attack began", () => {
		const setup = {
			champion: garen,
			level: 9,
			ranks: NO_RANKS,
			items: [item("Blade of The Ruined King")],
		}
		const result = simulate(setup, [ATTACK, ATTACK])
		const first = effectHits(result, 0, id)[0]?.damage.raw
		const healthAfterFirst = result.steps[0]?.targetHealth ?? 0

		expect(first).toBeCloseTo(0.09 * TARGET.health)
		expect(effectHits(result, 1, id)[0]?.damage.raw).toBeCloseTo(
			0.09 * healthAfterFirst,
		)
	})

	test("a ranged champion deals 6%", () => {
		const setup = {
			champion: ezreal,
			level: 9,
			ranks: NO_RANKS,
			items: [item("Blade of The Ruined King")],
		}
		const result = simulate(setup, [ATTACK])

		expect(effectHits(result, 0, id)[0]?.damage.raw).toBeCloseTo(
			0.06 * TARGET.health,
		)
	})
})

describe("Kraken Slayer's Bring It Down (wiki: every third attack, more on a hurt target)", () => {
	const id = "kraken-slayer-bring-it-down"

	function kraken(champion: Champion, level: number) {
		return { champion, level, ranks: NO_RANKS, items: [item("Kraken Slayer")] }
	}

	test("only every third attack deals it, up to 75% more by the target's missing health", () => {
		const result = simulate(kraken(garen, 9), Array(6).fill(ATTACK))
		const struck = [0, 1, 2, 3, 4, 5].map(
			(step) => effectHits(result, step, id).length,
		)
		const healthBefore = result.steps[1]?.targetHealth ?? 0
		const missing = 1 - healthBefore / TARGET.health

		expect(struck).toEqual([0, 0, 1, 0, 0, 1])
		// 155 at level 9, as the third attack began.
		expect(effectHits(result, 2, id)[0]?.damage.raw).toBeCloseTo(
			155 * (1 + 0.75 * missing),
		)
	})

	test("deals 150 up to level 8 and 200 at 18 (melee), 80% of it ranged", () => {
		for (const [champion, level, base] of [
			[garen, 8, 150],
			[garen, 18, 200],
			[ezreal, 18, 160],
		] as const) {
			const target = { ...TARGET, health: 1_000_000 }
			const input: CombatInput = {
				build: build(kraken(champion, level)),
				effects: combatEffects({
					patch: PATCH,
					champion,
					ranks: NO_RANKS,
					spells: [],
					runes: [],
					items: [item("Kraken Slayer")],
				}),
				summoners: [],
				target,
				actions: [ATTACK, ATTACK, ATTACK],
			}
			const result = simulateCombat(input)
			// A target this large is barely hurt: the missing health bonus is a sliver.
			expect(effectHits(result, 2, id)[0]?.damage.raw).toBeCloseTo(base, 0)
		}
	})

	test("its stacks run out 4 s after the last attack", () => {
		const result = simulate(kraken(garen, 9), [
			ATTACK,
			ATTACK,
			{ kind: "wait", seconds: 5 },
			ATTACK,
		])

		expect(effectHits(result, 3, id)).toEqual([])
	})
})

describe("Guinsoo's Rageblade (wiki: 8% attack speed per stack up to 4, then a phantom hit every third attack)", () => {
	const setup = {
		champion: garen,
		level: 9,
		ranks: NO_RANKS,
		items: [item("Guinsoo's Rageblade"), item("Wit's End")],
	}
	const wrath = "guinsoos-rageblade-wrath"

	test("from the 7th attack on, every third applies on-hit twice, 0.15 s after it lands", () => {
		const result = simulate(setup, Array(10).fill(ATTACK))
		const wraths = result.steps.map(
			(_, step) => effectHits(result, step, wrath).length,
		)
		const frays = result.steps.map(
			(_, step) => effectHits(result, step, "wits-end-fray").length,
		)
		const landed = attackHit(result, 6)?.time ?? 0
		const [, phantom] = effectHits(result, 6, wrath)

		console.warn(
			JSON.stringify({
				wraths,
				frays,
				times: result.steps.map((s) => [
					s.time,
					s.active.map(
						(a) => a.effectId + ":" + a.stacks + ":" + a.endsAt.toFixed(2),
					),
				]),
			}),
		)
		expect(wraths).toEqual([1, 1, 1, 1, 1, 1, 2, 1, 1, 2])
		expect(frays).toEqual(wraths)
		expect(phantom?.time).toBeCloseTo(landed + 0.15)
	})

	test("each attack adds 8% attack speed up to 32%, so the attacks come faster", () => {
		const result = simulate(setup, Array(6).fill(ATTACK))
		const starts = result.steps.map(({ time }) => time)
		const gaps = starts
			.slice(1)
			.map((time, index) => time - (starts[index] ?? 0))
		const stacks = result.steps.map(
			({ active }) =>
				active.find(
					({ effectId }) => effectId === "guinsoos-rageblade-seething-strike",
				)?.stacks,
		)

		// The timer reads the attack speed after the attack's own stack.
		expect(stacks).toEqual([1, 2, 3, 4, 4, 4])
		for (const index of [1, 2, 3]) {
			expect(gaps[index]).toBeLessThan(gaps[index - 1] ?? 0)
		}
		expect(gaps[4]).toBeCloseTo(gaps[3] ?? 0)
	})

	test("an ability's on-hit grants no stack (Seething Strike counts attacks)", () => {
		const result = simulate(
			{ ...setup, champion: ezreal, ranks: { ...NO_RANKS, Q: 1 } },
			[{ kind: "ability", slot: "Q" }],
		)

		expect(effectHits(result, 0, wrath)).toHaveLength(1)
		expect(
			result.steps[0]?.active.some(({ effectId }) =>
				effectId.startsWith("guinsoos-rageblade-"),
			),
		).toBe(false)
	})
})

describe("Spear of Shojin's Focused Will (wiki: 3% more ability damage per stack, up to 4)", () => {
	const setup = {
		champion: annie,
		level: 9,
		ranks: { Q: 1, W: 1, E: 0, R: 0 },
		items: [item("Spear of Shojin")],
	}
	const Q: CombatAction = { kind: "ability", slot: "Q" }
	const W: CombatAction = { kind: "ability", slot: "W" }

	function abilityDamage(result: CombatResult, step: number) {
		return hits(result, step)
			.filter(({ source }) => source.kind === "ability")
			.reduce((sum, { damage }) => sum + damage.final, 0)
	}

	test("the first cast gains a stack; the next deals 3% more", () => {
		const alone = simulate(setup, [W])
		const after = simulate(setup, [Q, W])

		expect(abilityDamage(alone, 0)).toBeGreaterThan(0)
		expect(abilityDamage(after, 1)).toBeCloseTo(abilityDamage(alone, 0) * 1.03)
	})

	test("attacks neither gain a stack nor deal more", () => {
		const result = simulate(setup, [ATTACK, Q, ATTACK])
		const [first, second] = [0, 2].map((step) => attackHit(result, step))

		expect(result.steps[0]?.active).toEqual([])
		expect(second?.damage.final).toBeCloseTo(first?.damage.final ?? 0)
	})
})
