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
import { attackWindupTime } from "./attack-windup"
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

/**
 * When the attacks land at the build's resting attack speed: the first starts at 0, each lands
 * at the end of its windup.
 */
function attackHitTimes(setup: Setup, count: number) {
	const { attackSpeed } = computeBuildStats({
		champion: setup.champion,
		patch: PATCH,
		level: setup.level,
		items: setup.items ?? [],
		shards: [],
		ranks: setup.ranks,
	})
	const windup = attackWindupTime(setup.champion.attackWindup, attackSpeed)
	return Array.from(
		{ length: count },
		(_, index) => index / attackSpeed.total + windup,
	)
}

/** Times compared to 2 decimals, which float sums of windups and timers need. */
function rounded(times: readonly number[]) {
	return times.map((time) => Math.round(time * 100) / 100)
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
	// The attack applies it as it lands, at the end of its windup.
	const [hitAt = Number.NaN] = attackHitTimes(teemo, 1)

	test("one attack: the impact on-hit, then 4 ticks a second apart, the last 4 s after the hit", () => {
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
			endsAt: hitAt + 4,
		})
		const ticks = step?.damageOverTime[0]?.ticks ?? []
		expect(rounded(ticks.map(({ time }) => time))).toEqual(
			rounded([1, 2, 3, 4].map((second) => hitAt + second)),
		)
		for (const entry of ticks) {
			expect("damage" in entry && entry.damage.final).toBeCloseTo(tick)
		}
	})

	test("the combo's time is the last tick's, after the last action", () => {
		expect(simulate(teemo, [attack]).duration).toBeCloseTo(hitAt + 4)
	})

	test("a tick can kill after the last action: the kill's time is that tick's", () => {
		// Enough health for the attack, the impact and one tick: the second tick, 2 s after the hit, kills.
		const physicalHit = allHits(simulate(teemo, [attack]))[0]?.damage.final ?? 0
		const health = physicalHit + impact + tick * 1.5
		const result = simulate({ ...teemo, target: { ...DUMMY, health } }, [
			attack,
		])

		expect(result.kill).toEqual({ time: expect.closeTo(hitAt + 2), step: 0 })
		expect(result.duration).toBeCloseTo(hitAt + 4)
	})

	test("later attacks refresh it: the tick timer goes on, and each attack owns the ticks it added", () => {
		const times = attackHitTimes(teemo, 3)
		const result = simulate(teemo, [attack, attack, attack])
		const last = (times[2] ?? 0) + 4
		// The tick timer runs from the first hit, a second apart.
		const expected = Array.from(
			{ length: Math.floor(last - hitAt) },
			(_, index) => hitAt + index + 1,
		)

		expect(rounded(ticksOf(result, "teemo-e").map(({ time }) => time))).toEqual(
			rounded(expected),
		)
		for (const [index, step] of result.steps.entries()) {
			const summary = step.damageOverTime[0]
			const from = index === 0 ? 0 : (times[index - 1] ?? 0) + 4
			const until = (times[index] ?? 0) + 4
			expect(summary?.application).toBe(index === 0 ? "applied" : "refreshed")
			expect(summary?.endsAt).toBeCloseTo(until)
			expect(rounded(summary?.ticks.map(({ time }) => time) ?? [])).toEqual(
				rounded(
					expected.filter((time) => time > from + 1e-9 && time <= until + 1e-9),
				),
			)
		}
		expect(result.duration).toBeCloseTo(expected.at(-1) ?? Number.NaN)
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

	test("Noxious Trap detonates once armed, 1 s after the cast, then poisons for 4 ticks a second apart", () => {
		// Wiki, rank 1 without AP: 200 over 4 s; the trap arms in 1 s.
		const result = simulate(teemo, [{ kind: "ability", slot: "R" }])
		const ticks = ticksOf(result, "teemo-r")
		const [trap] = result.steps

		expect(trap?.damageOverTime[0]?.delayed).toEqual({
			label: "detonates",
			at: 1,
		})
		expect(ticks.map(({ time }) => time)).toEqual([2, 3, 4, 5])
		for (const { damage } of ticks) expect(damage.final).toBeCloseTo(magic(50))
		expect(trap?.damageOverTime[0]?.endsAt).toBe(5)
		expect(result.duration).toBe(5)
	})

	test("an action during the trap's arming second goes on; the trap still detonates at 1 s, for its own step", () => {
		const result = simulate(teemo, [
			{ kind: "ability", slot: "R" },
			{ kind: "ability", slot: "Q" },
		])
		const [trap, dart] = result.steps

		// Blinding Dart is cast once the trap's 0.25 s cast ends, inside the arming second.
		expect(dart?.time).toBe(0.25)
		expect(
			dart?.events.some(
				(event) => event.kind === "hit" && event.source.kind === "ability",
			),
		).toBe(true)
		expect(dart?.damageOverTime).toEqual([])
		expect(trap?.damageOverTime[0]?.delayed?.at).toBe(1)
		expect(trap?.damageOverTime[0]?.ticks.map(({ time }) => time)).toEqual([
			2, 3, 4, 5,
		])
		expect(result.duration).toBe(5)
	})

	test("a kill by the trap's poison happens at that tick's delayed time", () => {
		const dart =
			allHits(simulate(teemo, [{ kind: "ability", slot: "Q" }]))[0]?.damage
				.final ?? 0
		// Enough health for the dart and one poison tick: the second tick, at 3 s, kills.
		const health = dart + magic(50) * 1.5
		const result = simulate({ ...teemo, target: { ...DUMMY, health } }, [
			{ kind: "ability", slot: "R" },
			{ kind: "ability", slot: "Q" },
		])

		expect(result.kill?.time).toBe(3)
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
		const times = attackHitTimes(twitch, 3)
		const result = simulate(twitch, [attack, attack, attack])
		const ticks = ticksOf(result, "twitch-deadly-venom")
		const stacksAt = (time: number) =>
			times.filter((hitTime) => hitTime < time).length

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

describe("Brand's Blaze: casts stack a burn that detonates at 3 (issue 380)", async () => {
	const brand: Setup = {
		champion: await champion("Brand"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}
	// Wiki: 2% of maximum health per stack over 4 s, every 0.25 s; at 3 stacks a ring detonates 2 s
	// later for 6% to 12% by level (+2% per 100 AP) of maximum health, 8.82% at level 9.
	const perTick = (DUMMY.health * 0.02) / 16
	const explosion = DUMMY.health * 0.0882353
	const cast = (slot: "Q" | "W" | "E" | "R"): CombatAction => ({
		kind: "ability",
		slot,
	})
	const detonations = (result: CombatResult) =>
		allHits(result).filter(
			({ source }) =>
				source.kind === "effect" &&
				source.effectId === "brand-blaze-detonation",
		)

	test("a cast burns for 2% of maximum health over 4 s: 16 ticks 0.25 s apart, the last at 4 s", () => {
		const ticks = ticksOf(simulate(brand, [cast("Q")]), "brand-blaze")

		expect(ticks.map(({ time }) => time)).toEqual(
			Array.from({ length: 16 }, (_, index) => (index + 1) * 0.25),
		)
		for (const { damage } of ticks) {
			expect(damage.type).toBe("magic")
			expect(damage.raw).toBeCloseTo(perTick)
			expect(damage.final).toBeCloseTo(magic(perTick))
		}
	})

	test("each cast adds a stack and refreshes the burn; each tick deals the stacks it has then", () => {
		const result = simulate(brand, [cast("Q"), cast("W")])
		const ticks = ticksOf(result, "brand-blaze")

		expect(
			result.steps.map(({ damageOverTime }) => damageOverTime[0]),
		).toMatchObject([
			{ application: "applied", stacks: 1 },
			{ application: "stacked", stacks: 2, endsAt: 4.25 },
		])
		for (const { time, damage } of ticks) {
			expect(damage.raw).toBeCloseTo(perTick * (time > 0.25 ? 2 : 1))
		}
		expect(ticks.at(-1)?.time).toBe(4.25)
		expect(detonations(result)).toEqual([])
	})

	test("the third stack makes the target unstable: it detonates 2 s later and keeps one stack", () => {
		const result = simulate(brand, [cast("E"), cast("Q"), cast("W")])
		const ticks = ticksOf(result, "brand-blaze")
		const [detonation] = detonations(result)

		expect(result.steps[2]?.waiting).toEqual([
			{ effectId: "brand-blaze-detonation", label: "unstable", until: 2.5 },
		])
		expect(detonation?.time).toBe(2.5)
		expect(detonation?.damage.raw).toBeCloseTo(explosion, 1)
		expect(detonation?.damage.final).toBeCloseTo(magic(explosion), 1)
		for (const { time, damage } of ticks.filter(({ time }) => time > 0.5)) {
			expect(damage.raw).toBeCloseTo(perTick * (time < 2.5 ? 3 : 1))
		}
		expect(ticks.at(-1)?.time).toBe(6.5)
		expect(result.duration).toBe(6.5)
	})

	test("for 4 s after it detonates, a cast only refreshes the one stack", () => {
		const result = simulate(brand, [
			cast("E"),
			cast("Q"),
			cast("W"),
			{ kind: "wait", seconds: 2 },
			cast("R"),
		])

		expect(result.steps[4]?.damageOverTime).toMatchObject([
			{ effectId: "brand-blaze", application: "refreshed", stacks: 1 },
		])
		expect(detonations(result)).toHaveLength(1)
	})

	test("AP and level raise the detonation: 12% plus 2% per 100 AP at level 18", () => {
		const rod = item("Needlessly Large Rod")
		const setup = { ...brand, level: 18, items: [rod] }
		const abilityPower = computeBuildStats({
			champion: brand.champion,
			patch: PATCH,
			level: 18,
			items: [rod],
			shards: [],
			ranks: brand.ranks,
		}).abilityPower.total
		const [detonation] = detonations(
			simulate(setup, [cast("E"), cast("Q"), cast("W")]),
		)

		expect(detonation?.damage.raw).toBeCloseTo(
			DUMMY.health * (0.12 + (0.02 * abilityPower) / 100),
		)
	})

	test("free mode: No on the third cast's Blaze leaves 2 stacks, so nothing detonates", () => {
		const { result } = simulateFreeCombat(
			inputOf(brand, [cast("E"), cast("Q"), cast("W")]),
			[undefined, undefined, { "damage-over-time:brand-blaze": false }],
		)

		expect(result.steps[2]?.damageOverTime).toEqual([])
		expect(detonations(result)).toEqual([])
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
		const [hitAt = Number.NaN] = attackHitTimes(teemo, 1)

		// The impact applies it as the attack lands; the poison's last tick 4 s later refreshes it for 3 s.
		expect(burn?.endsAt).toBeCloseTo(hitAt + 7)
		expect(burn?.ticks.at(-1)?.time).toBeCloseTo(hitAt + 7)
		expect(result.duration).toBeCloseTo(hitAt + 7)
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
	test("Singed's Q, one pass through the trail (0 s): 8 ticks every 0.25 s, the last at 2 s, the wiki's minimum", async () => {
		const singed: Setup = {
			champion: await champion("Singed"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
		}
		const result = simulate(singed, [{ kind: "ability", slot: "Q", inArea: 0 }])
		const ticks = ticksOf(result, "singed-q")

		expect(ticks.map(({ time }) => time)).toEqual([
			0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2,
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
		// Wiki, rank 5 without AP: 35 per tick, on the cast and every 0.5 s for the pool's 5 s.
		let health = DUMMY.health

		expect(ticks).toHaveLength(10)
		expect(ticks[0]?.time).toBe(0)
		for (const { damage } of ticks) {
			expect(damage.raw).toBeCloseTo(35 * (2 - health / DUMMY.health))
			health -= damage.final
		}
		expect(ticks.at(-1)?.damage.raw).toBeGreaterThan(35)
	})

	describe("the time in the area is the step's seconds, the full time by default: the ticks follow it (issues 353, 427)", async () => {
		const singed: Setup = {
			champion: await champion("Singed"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
		}
		const poisonTrail = (inArea?: number) =>
			simulate(singed, [
				{ kind: "ability", slot: "Q", ...(inArea !== undefined && { inArea }) },
			])
		const total = (result: CombatResult) =>
			ticksOf(result, "singed-q").reduce(
				(sum, { damage }) => sum + damage.raw,
				0,
			)

		test("Singed's Q, 2 s in the trail: poisoned 4 s, 16 ticks, the last at 4 s, twice the minimum", () => {
			const result = poisonTrail(2)
			const ticks = ticksOf(result, "singed-q")

			expect(ticks).toHaveLength(16)
			expect(ticks.at(-1)?.time).toBe(4)
			expect(total(result)).toBeCloseTo(80)
			expect(result.duration).toBe(4)
			expect(result.steps[0]?.damageOverTime[0]?.endsAt).toBe(4)
		})

		test("Singed's Q, 4 s in the trail: poisoned 6 s, 24 ticks, three times the minimum", () => {
			expect(ticksOf(poisonTrail(4), "singed-q")).toHaveLength(24)
			expect(total(poisonTrail(4))).toBeCloseTo(120)
			expect(poisonTrail(4).duration).toBe(6)
		})

		test("no time is the full one, 4 s in the trail; a time out of the range or off its 0.25 s steps is brought into them", () => {
			expect(total(poisonTrail())).toBeCloseTo(120)
			expect(total(poisonTrail(9))).toBeCloseTo(120)
			// 1.1 s is 1 s: poisoned 3 s, 12 ticks.
			expect(ticksOf(poisonTrail(1.1), "singed-q")).toHaveLength(12)
		})

		test("only the cast's own effects follow it: Sheen's spellblade keeps its 10 s", () => {
			const result = simulate({ ...singed, items: [item("Sheen")] }, [
				{ kind: "ability", slot: "Q", inArea: 4 },
			])
			const running = (effectId: string) =>
				result.steps[0]?.active.find((effect) => effect.effectId === effectId)

			expect(running("sheen-spellblade")?.endsAt).toBe(10)
			expect(running("singed-q")?.endsAt).toBe(6)
		})

		test("Morgana's W: 1 s in the pool takes the tick at 1 s, 3 from the cast; the whole pool, the default, is 10", async () => {
			const morgana: Setup = {
				champion: await champion("Morgana"),
				level: 9,
				ranks: { Q: 1, W: 5, E: 1, R: 1 },
			}
			const tormentedShadow = (inArea?: number) =>
				ticksOf(
					simulate(morgana, [
						{
							kind: "ability",
							slot: "W",
							...(inArea !== undefined && { inArea }),
						},
					]),
					"morgana-w",
				).map(({ time }) => time)

			expect(tormentedShadow(1)).toEqual([0, 0.5, 1])
			expect(tormentedShadow(3)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3])
			// The pool ends before a tick at 5 s: the wiki's 10.
			const wholePool = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5]
			expect(tormentedShadow(5)).toEqual(wholePool)
			expect(tormentedShadow()).toEqual(wholePool)
			// Its shortest is half a second: the ticks at the cast and at 0.5 s.
			expect(tormentedShadow(0)).toEqual([0, 0.5])
		})

		test("Morgana's W, 1 s in the pool: the combo's time is that last tick, with nothing running after it", async () => {
			const morgana: Setup = {
				champion: await champion("Morgana"),
				level: 9,
				ranks: { Q: 1, W: 5, E: 1, R: 1 },
			}
			const oneSecond = simulate(morgana, [
				{ kind: "ability", slot: "W", inArea: 1 },
			])
			const wholePool = simulate(morgana, [{ kind: "ability", slot: "W" }])

			expect(oneSecond.duration).toBe(1)
			expect(oneSecond.activeUntil).toBe(1)
			expect(wholePool.duration).toBe(4.5)
			expect(wholePool.activeUntil).toBe(5)
		})
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
		// The trap's first tick, at 2 s (armed at 1 s), applies it; its first tick is 0.5 s later.
		expect(burn?.ticks[0]?.time).toBe(2.5)
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
		// Wiki: the first at the cast (the lower bound of its 0 to 0.264 s window), then every 1.056 s.
		expect(
			result.steps[0]?.damageOverTime[0]?.ticks.map(({ time }) =>
				Number(time.toFixed(3)),
			),
		).toEqual([0, 1.056, 2.112, 3.168, 4.224])
	})
})

describe("the combo's damage by type, ticks after the last action included", async () => {
	const teemo: Setup = {
		champion: await champion("Teemo"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 5, R: 1 },
		summoners: [spell("SummonerDot")],
	}
	const actions: CombatAction[] = [attack, { kind: "summoner", slot: 0 }]
	// Wiki, Toxic Shot rank 5: 65 on impact and 4 ticks of 30; Ignite at level 9: 250 true.
	const toxicShot = magic(65) + 4 * magic(30)
	const ignite = 250

	test("splits an attack (physical), Toxic Shot (magic) and Ignite (true), and the parts add up to the total", () => {
		const result = simulate(teemo, actions)
		const { physical, magic: magicPart, true: truePart } = result.byType
		const attackHit = allHits(result).find(
			({ source }) => source.kind === "attack",
		)

		expect(physical.final).toBeCloseTo(attackHit?.damage.final ?? Number.NaN)
		expect(magicPart.final).toBeCloseTo(toxicShot)
		expect(truePart).toEqual({ raw: ignite, final: ignite })
		expect(physical.final + magicPart.final + truePart.final).toBeCloseTo(
			result.total.final,
		)
		expect(physical.raw + magicPart.raw + truePart.raw).toBeCloseTo(
			result.total.raw,
		)
	})

	test("free mode: No on Toxic Shot's poison takes its ticks off the magic part only", () => {
		const strict = simulate(teemo, actions)
		const { result } = simulateFreeCombat(inputOf(teemo, actions), [
			{ "damage-over-time:teemo-e": false },
		])

		expect(result.byType.magic.final).toBeCloseTo(magic(65))
		expect(result.byType.physical).toEqual(strict.byType.physical)
		expect(result.byType.true).toEqual(strict.byType.true)
		expect(result.total.final).toBeCloseTo(strict.total.final - 4 * magic(30))
	})
})
