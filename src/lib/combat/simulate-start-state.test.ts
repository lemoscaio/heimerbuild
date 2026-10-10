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
	DealtDamage,
} from "./combat"
import {
	type CombatBuild,
	type CombatInput,
	simulateCombat,
} from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (issue 317).
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

const TARGET = { health: 20_000, armor: 70, magicResist: 50, level: 9 }

type Setup = {
	champion: Champion
	level: number
	ranks: AbilityRanks
	runes?: readonly Rune[]
	items?: readonly Item[]
}

type StartInput = Pick<
	CombatInput,
	"startOnCooldown" | "startStacks" | "startRunning"
>

function buildOf({ champion, level, ranks, items = [] }: Setup): CombatBuild {
	return { champion, patch: PATCH, level, items, shards: [], ranks }
}

function simulate(
	setup: Setup,
	actions: readonly CombatItem[],
	start: StartInput = {},
) {
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
		...start,
	})
}

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

function effectHits(result: CombatResult, effectId: string) {
	return result.steps.flatMap((step, index) =>
		step.events.flatMap((event) =>
			event.kind === "hit" &&
			"damage" in event &&
			event.source.kind === "effect" &&
			event.source.effectId === effectId
				? [index]
				: [],
		),
	)
}

/** An effect's stacks after each step, 0 while it doesn't run. */
function stacksOf(result: CombatResult, effectId: string): number[] {
	return result.steps.map(
		(step) =>
			step.active.find((active) => active.effectId === effectId)?.stacks ?? 0,
	)
}

const physical = (raw: number, armor = TARGET.armor) =>
	(raw * 100) / (100 + armor)
const attack: CombatAction = { kind: "attack" }
const wait = (seconds: number): CombatAction => ({ kind: "wait", seconds })

describe("stacks at the start (issue 317)", async () => {
	const garen: Setup = {
		champion: await champion("Garen"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
		runes: [rune("Conqueror")],
		items: [item("Long Sword")],
	}
	// Wiki: 1.8 + (4 − 1.8) / 17 × (level − 1) adaptive force per stack; AD at 0.6 per point.
	const perStack = (level: number) => 1.8 + (2.2 / 17) * (level - 1)
	const ad = computeBuildStats(buildOf(garen)).attackDamage.total

	test("Conqueror at 12: the first attack reads all 12 stacks", () => {
		const result = simulate(garen, [attack], {
			startStacks: [{ id: "conqueror", count: 12 }],
		})
		const [first] = attackHits(result)

		expect(first?.final).toBeCloseTo(physical(ad + 0.6 * 12 * perStack(9)))
		expect(stacksOf(result, "conqueror")).toEqual([12])
	})

	test("any count up to the cap, then gains as in a fight; past the cap is the cap", () => {
		const four = simulate(garen, [attack, attack], {
			startStacks: [{ id: "conqueror", count: 4 }],
		})
		const [first] = attackHits(four)
		const forty = simulate(garen, [attack], {
			startStacks: [{ id: "conqueror", count: 40 }],
		})

		expect(first?.final).toBeCloseTo(physical(ad + 0.6 * 4 * perStack(9)))
		expect(stacksOf(four, "conqueror")).toEqual([6, 8])
		expect(stacksOf(forty, "conqueror")).toEqual([12])
	})

	test("runs its full 5 s from the start, then drops (owner decision 6a)", () => {
		const start = { startStacks: [{ id: "conqueror", count: 12 }] }

		expect(
			stacksOf(simulate(garen, [wait(4), attack], start), "conqueror"),
		).toEqual([12, 12])
		expect(
			stacksOf(simulate(garen, [wait(6), attack], start), "conqueror"),
		).toEqual([0, 2])
	})

	test("Lethal Tempo at 6: the first attack fires its bolt", () => {
		const tempo = { ...garen, runes: [rune("LethalTempo")] }

		expect(effectHits(simulate(tempo, [attack]), "lethal-tempo")).toEqual([])
		expect(
			effectHits(
				simulate(tempo, [attack], {
					startStacks: [{ id: "lethal-tempo", count: 6 }],
				}),
				"lethal-tempo",
			),
		).toEqual([0])
	})

	test("Black Cleaver's Carve at 5: the first hit reads the target's armor 30% lower", () => {
		const cleaver = { ...garen, runes: [], items: [item("Black Cleaver")] }
		const cleaverAd = computeBuildStats(buildOf(cleaver)).attackDamage.total
		const result = simulate(cleaver, [attack], {
			startStacks: [{ id: "black-cleaver-carve", count: 5 }],
		})
		const [first] = attackHits(result)

		expect(first?.final).toBeCloseTo(physical(cleaverAd, TARGET.armor * 0.7))
		expect(result.steps[0]?.resists?.armor).toBeCloseTo(TARGET.armor * 0.7)
	})

	test("an effect the start can't set is ignored: damage over time, an effect the build lacks", async () => {
		const brand: Setup = {
			champion: await champion("Brand"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 0 },
		}
		const plain = simulate(brand, [attack]).total
		const started = simulate(brand, [attack], {
			startStacks: [
				{ id: "brand-blaze", count: 2 },
				{ id: "conqueror", count: 12 },
			],
		}).total

		expect(started).toEqual(plain)
	})
})

describe("buffs running at the start (issue 317)", async () => {
	const yi: Setup = {
		champion: await champion("MasterYi"),
		level: 11,
		ranks: { Q: 3, W: 1, E: 3, R: 2 },
	}
	const running = { startRunning: ["master-yi-r-active"] }
	const threeAttacks = [attack, attack, attack]

	test("Highlander running: its attack speed from the first attack, so attacks come sooner", () => {
		const plain = simulate(yi, threeAttacks)
		const started = simulate(yi, threeAttacks, running)

		expect(started.steps[2]?.time).toBeLessThan(plain.steps[2]?.time ?? 0)
		expect(
			started.steps[0]?.active.some(
				({ effectId }) => effectId === "master-yi-r-active",
			),
		).toBe(true)
	})

	test("puts its ability on its cooldown, as if just cast (owner decision 5b)", () => {
		const cast: CombatAction = { kind: "ability", slot: "R" }

		expect(simulate(yi, [cast]).steps[0]?.refused).toBeUndefined()
		expect(simulate(yi, [cast], running).steps[0]?.refused).toMatch(
			/on cooldown/,
		)
	})

	test("runs its full duration from the start (7 s), then drops", () => {
		const after = simulate(yi, [wait(8)], running)

		expect(
			after.steps[0]?.active.some(
				({ effectId }) => effectId === "master-yi-r-active",
			),
		).toBe(false)
	})

	test("a buff that doesn't change the damage, or one the build lacks, is ignored", () => {
		const plain = simulate(yi, threeAttacks)
		const ignored = simulate(yi, threeAttacks, {
			startRunning: ["ghost", "tristana-q-active"],
		})

		expect(ignored.total).toEqual(plain.total)
		expect(ignored.steps[2]?.time).toBe(plain.steps[2]?.time)
	})
})
