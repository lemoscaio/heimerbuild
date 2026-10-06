import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import {
	type SummonerSpell,
	summonerSpellsFileSchema,
} from "@schemas/summoner-spell"
import { combatEffects } from "../effects/available-effects"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatEvent,
	CombatItem,
	CombatResult,
	CombatTarget,
	DealtDamage,
} from "./combat"
import {
	type CombatInput,
	simulateCombat,
	simulateFreeCombat,
} from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's (2026-10-06).
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
const SPELLS = summonerSpellsFileSchema.parse(
	await patchFile("summoner-spells.json"),
).spells

function item(name: string): Item {
	const found = ITEMS.find((entry) => entry.name === name)
	if (!found) throw new Error(`${name} is not in the current patch`)
	return found
}

function spell(key: string): SummonerSpell {
	const found = SPELLS.find((entry) => entry.key === key)
	if (!found) throw new Error(`${key} is not in the current patch`)
	return found
}

const DUMMY: CombatTarget = {
	health: 1800,
	armor: 70,
	magicResist: 50,
	level: 9,
}

type Setup = {
	champion: Champion
	level: number
	ranks: AbilityRanks
	items?: readonly Item[]
	summoners?: readonly SummonerSpell[]
	target?: CombatTarget
}

function inputOf(setup: Setup, actions: readonly CombatItem[]): CombatInput {
	const items = setup.items ?? []
	return {
		build: {
			champion: setup.champion,
			patch: PATCH,
			level: setup.level,
			items,
			shards: [],
			ranks: setup.ranks,
		},
		effects: combatEffects({
			patch: PATCH,
			champion: setup.champion,
			ranks: setup.ranks,
			spells: setup.summoners ?? [],
			runes: [],
			items,
		}),
		summoners: setup.summoners ?? [],
		target: setup.target ?? DUMMY,
		actions,
	}
}

function simulate(setup: Setup, actions: readonly CombatAction[]) {
	return simulateCombat(inputOf(setup, actions))
}

function magic(raw: number) {
	return (raw * 100) / (100 + DUMMY.magicResist)
}

type Hit = Extract<CombatEvent, { damage: DealtDamage }>

/** Every hit of the combo, whichever step logged it. */
function allHits(result: CombatResult): Hit[] {
	return result.steps.flatMap(({ events }) =>
		events.filter(
			(event): event is Hit => event.kind === "hit" && "damage" in event,
		),
	)
}

function ticksOf(result: CombatResult, effectId: string): Hit[] {
	return allHits(result).filter(
		({ source, tick }) =>
			!!tick && source.kind === "effect" && source.effectId === effectId,
	)
}

const attack: CombatAction = { kind: "attack" }

/** The times of the attacks at the build's resting attack speed, the first at 0. */
function attackTimes(setup: Setup, count: number) {
	const speed = computeBuildStats({
		champion: setup.champion,
		patch: PATCH,
		level: setup.level,
		items: setup.items ?? [],
		shards: [],
		ranks: setup.ranks,
	}).attackSpeed.total
	return Array.from({ length: count }, (_, index) => index / speed)
}

describe("Teemo's Toxic Shot: applied on-hit by every attack", async () => {
	const teemo: Setup = {
		champion: await champion("Teemo"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 5, R: 1 },
	}
	// Wiki, rank 5 without AP or bonus AD: 65 on impact, then 30 every second for 4 s.
	const impact = magic(65)
	const tick = magic(30)

	test("one attack: the impact on-hit, then 4 ticks a second apart, the last at 4 s", () => {
		const result = simulate(teemo, [attack])
		const [step] = result.steps
		const impactHit = step?.events.find(
			(event): event is Hit =>
				event.kind === "hit" &&
				"damage" in event &&
				event.source.kind === "effect" &&
				!event.tick,
		)

		expect(impactHit?.damage.final).toBeCloseTo(impact)
		expect(step?.damageOverTime).toHaveLength(1)
		expect(step?.damageOverTime[0]).toMatchObject({
			effectId: "teemo-e",
			application: "applied",
			stacks: 1,
			endsAt: 4,
		})
		const ticks = step?.damageOverTime[0]?.ticks ?? []
		expect(ticks.map(({ time }) => time)).toEqual([1, 2, 3, 4])
		for (const entry of ticks) {
			expect("damage" in entry && entry.damage.final).toBeCloseTo(tick)
		}
	})

	test("the combo's time is the last tick's, after the last action", () => {
		expect(simulate(teemo, [attack]).duration).toBe(4)
	})

	test("a tick can kill after the last action: the kill's time is that tick's", () => {
		// Enough health for the attack, the impact and one tick: the second tick, at 2 s, kills.
		const physicalHit = allHits(simulate(teemo, [attack]))[0]?.damage.final ?? 0
		const health = physicalHit + impact + tick * 1.5
		const result = simulate({ ...teemo, target: { ...DUMMY, health } }, [
			attack,
		])

		expect(result.kill).toEqual({ time: 2, step: 0 })
		expect(result.duration).toBe(4)
	})

	test("later attacks refresh it: the tick timer goes on, and each attack owns the ticks it added", () => {
		const times = attackTimes(teemo, 3)
		const result = simulate(teemo, [attack, attack, attack])
		const last = (times[2] ?? 0) + 4
		const expected = Array.from(
			{ length: Math.floor(last) },
			(_, index) => index + 1,
		)

		expect(ticksOf(result, "teemo-e").map(({ time }) => time)).toEqual(expected)
		for (const [index, step] of result.steps.entries()) {
			const summary = step.damageOverTime[0]
			const from = index === 0 ? 0 : (times[index - 1] ?? 0) + 4
			const until = (times[index] ?? 0) + 4
			expect(summary?.application).toBe(index === 0 ? "applied" : "refreshed")
			expect(summary?.endsAt).toBeCloseTo(until)
			expect(summary?.ticks.map(({ time }) => time)).toEqual(
				expected.filter((time) => time > from && time <= until),
			)
		}
		expect(result.duration).toBe(expected.at(-1) ?? Number.NaN)
	})

	test("ticks land among later actions, logged by the step running then and owned by the attack", () => {
		const result = simulate(teemo, [attack, { kind: "wait", seconds: 2.5 }])
		const [hit, wait] = result.steps

		expect(wait?.events.some((event) => event.kind === "hit")).toBe(true)
		for (const event of wait?.events ?? []) {
			if (event.kind === "hit") expect(event.tick).toEqual({ owner: 0 })
		}
		expect(hit?.damageOverTime[0]?.ticks).toHaveLength(4)
		expect(wait?.damageOverTime).toEqual([])
	})

	test("Toxic Shot has no cast: casting E is refused", () => {
		expect(
			simulate(teemo, [{ kind: "ability", slot: "E" }]).steps[0],
		).toMatchObject({
			refused: "Toxic Shot has no active: Teemo's attacks apply it",
		})
	})

	test("Noxious Trap poisons for 4 ticks a second apart, the synced total over 4 s", () => {
		// Wiki, rank 1 without AP: 200 over 4 s.
		const result = simulate(teemo, [{ kind: "ability", slot: "R" }])
		const ticks = ticksOf(result, "teemo-r")

		expect(ticks.map(({ time }) => time)).toEqual([1, 2, 3, 4])
		for (const { damage } of ticks) expect(damage.final).toBeCloseTo(magic(50))
	})
})

describe("Twitch's Deadly Venom: stacks from attacks", async () => {
	const twitch: Setup = {
		champion: await champion("Twitch"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}
	// Wiki: 3 true damage per stack every second at level 9 (no AP), 6 s, up to 6 stacks.
	const perStack = 3

	test("each attack adds a stack and refreshes it; each tick deals the stacks it has then", () => {
		const times = attackTimes(twitch, 3)
		const result = simulate(twitch, [attack, attack, attack])
		const ticks = ticksOf(result, "twitch-deadly-venom")
		const stacksAt = (time: number) =>
			times.filter((attackTime) => attackTime < time).length

		expect(
			result.steps.map(({ damageOverTime }) => damageOverTime[0]),
		).toMatchObject([
			{ application: "applied", stacks: 1 },
			{ application: "stacked", stacks: 2 },
			{ application: "stacked", stacks: 3 },
		])
		expect(ticks.at(-1)?.time).toBeLessThanOrEqual((times[2] ?? 0) + 6)
		for (const { time, damage } of ticks) {
			expect(damage).toEqual({
				type: "true",
				raw: perStack * stacksAt(time),
				final: perStack * stacksAt(time),
			})
		}
	})

	test("past 6 stacks, an attack only refreshes it", () => {
		const result = simulate(twitch, Array(7).fill(attack))
		const applications = result.steps.map(
			({ damageOverTime }) => damageOverTime[0],
		)

		expect(applications.map((summary) => summary?.stacks)).toEqual([
			1, 2, 3, 4, 5, 6, 6,
		])
		expect(applications.at(-1)?.application).toBe("refreshed")
	})
})

describe("Liandry's Torment: ability damage burns for a share of maximum health", async () => {
	const annie: Setup = {
		champion: await champion("Annie"),
		level: 9,
		ranks: { Q: 5, W: 2, E: 1, R: 1 },
		items: [item("Liandry's Torment")],
	}

	test("Annie's Q burns the target: 6 ticks every 0.5 s, each 1% of its maximum health", () => {
		const result = simulate(annie, [{ kind: "ability", slot: "Q" }])
		const ticks = ticksOf(result, "liandrys-torment-burn")

		expect(ticks.map(({ time }) => time)).toEqual([0.5, 1, 1.5, 2, 2.5, 3])
		for (const { damage } of ticks) {
			expect(damage.raw).toBeCloseTo(DUMMY.health * 0.01)
		}
		expect(result.steps[0]?.outcomes).toContainEqual({
			kind: "damage-over-time",
			effectId: "liandrys-torment-burn",
			happened: true,
		})
	})

	test("a tank's maximum health makes each tick larger", () => {
		const tank = { ...DUMMY, health: 4000 }
		const result = simulate({ ...annie, target: tank }, [
			{ kind: "ability", slot: "Q" },
		])

		for (const { damage } of ticksOf(result, "liandrys-torment-burn")) {
			expect(damage.raw).toBeCloseTo(40)
		}
	})

	test("Teemo's poison is ability damage: each tick refreshes the burn, which outlasts the poison", async () => {
		const teemo: Setup = {
			champion: await champion("Teemo"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 5, R: 1 },
			items: [item("Liandry's Torment")],
		}
		const result = simulate(teemo, [attack])
		const burn = result.steps[0]?.damageOverTime.find(
			({ effectId }) => effectId === "liandrys-torment-burn",
		)

		// The impact at 0 applies it; the poison's last tick at 4 s refreshes it to 7 s.
		expect(burn?.endsAt).toBe(7)
		expect(burn?.ticks.at(-1)?.time).toBe(7)
		expect(result.duration).toBe(7)
	})

	test("free mode: No on a cast's burn prevents it; Yes on a cast that deals no damage applies it", () => {
		const actions: CombatAction[] = [
			{ kind: "ability", slot: "E" },
			{ kind: "ability", slot: "Q" },
		]
		const { result, seed } = simulateFreeCombat(inputOf(annie, actions), [
			{ "damage-over-time:liandrys-torment-burn": true },
			{ "damage-over-time:liandrys-torment-burn": false },
		])
		const [shield, disintegrate] = result.steps

		expect(
			seed.map((choices) => choices["damage-over-time:liandrys-torment-burn"]),
		).toEqual([false, true])
		expect(shield?.damageOverTime[0]?.effectId).toBe("liandrys-torment-burn")
		expect(disintegrate?.damageOverTime).toEqual([])
	})
})

describe("damage over time from ability casts", async () => {
	test("Singed's Q, one pass through the trail: 8 ticks every 0.25 s from the cast, the wiki's minimum", async () => {
		const singed: Setup = {
			champion: await champion("Singed"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
		}
		const result = simulate(singed, [{ kind: "ability", slot: "Q" }])
		const ticks = ticksOf(result, "singed-q")

		expect(ticks.map(({ time }) => time)).toEqual([
			0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75,
		])
		// Wiki, rank 1 without AP: a minimum of 40 magic damage.
		expect(ticks.reduce((sum, { damage }) => sum + damage.raw, 0)).toBeCloseTo(
			40,
		)
	})

	test("Morgana's W reads the target's missing health at each tick: up to twice its damage", async () => {
		const morgana: Setup = {
			champion: await champion("Morgana"),
			level: 9,
			ranks: { Q: 1, W: 5, E: 1, R: 1 },
		}
		const result = simulate(morgana, [{ kind: "ability", slot: "W" }])
		const ticks = ticksOf(result, "morgana-w")
		// Wiki, rank 5 without AP: 35 per tick, every 0.5 s for 5 s, from the cast.
		let health = DUMMY.health

		expect(ticks).toHaveLength(10)
		expect(ticks[0]?.time).toBe(0)
		for (const { damage } of ticks) {
			expect(damage.raw).toBeCloseTo(35 * (2 - health / DUMMY.health))
			health -= damage.final
		}
		expect(ticks.at(-1)?.damage.raw).toBeGreaterThan(35)
	})

	test("free mode: No on a cast's damage over time leaves only its other damage", async () => {
		const teemo: Setup = {
			champion: await champion("Teemo"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 5, R: 1 },
		}
		const { result } = simulateFreeCombat(inputOf(teemo, [attack, attack]), [
			undefined,
			{ "damage-over-time:teemo-e": false },
		])
		const [first, second] = result.steps

		expect(first?.damageOverTime[0]?.ticks).toHaveLength(4)
		expect(second?.damageOverTime).toEqual([])
		expect(second?.outcomes).toContainEqual({
			kind: "damage-over-time",
			effectId: "teemo-e",
			happened: false,
		})
	})

	test("free mode keeps a burn its cast's ticks apply when it was computed: no earlier burn at the cast", async () => {
		const teemo: Setup = {
			champion: await champion("Teemo"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			items: [item("Liandry's Torment")],
		}
		// A change on the attack reruns with every seeded outcome, the trap's burn (seeded yes) included.
		const { result, seed } = simulateFreeCombat(
			inputOf(teemo, [{ kind: "ability", slot: "R" }, attack]),
			[
				undefined,
				{
					"damage-over-time:teemo-e": false,
					"damage-over-time:liandrys-torment-burn": false,
				},
			],
		)
		const burn = result.steps[0]?.damageOverTime.find(
			({ effectId }) => effectId === "liandrys-torment-burn",
		)

		expect(seed[0]?.["damage-over-time:liandrys-torment-burn"]).toBe(true)
		// The trap's first tick, at 1 s, applies it; its first tick is 0.5 s later.
		expect(burn?.ticks[0]?.time).toBe(1.5)
	})
})

describe("Ignite, summarized on its cast", () => {
	test("the summoner spell's step owns its 5 ticks", async () => {
		const result = simulate(
			{
				champion: await champion("Annie"),
				level: 9,
				ranks: { Q: 1, W: 1, E: 1, R: 1 },
				summoners: [spell("SummonerDot")],
			},
			[{ kind: "summoner", slot: 0 }],
		)

		expect(result.steps[0]?.damageOverTime).toMatchObject([
			{ effectId: "ignite", application: "applied", endsAt: 5 },
		])
		expect(
			result.steps[0]?.damageOverTime[0]?.ticks.map(({ time }) => time),
		).toEqual([0, 1, 2, 3, 4])
	})
})
