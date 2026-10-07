import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { type Rune, runesFileSchema } from "@schemas/rune"
import {
	type SummonerSpell,
	summonerSpellsFileSchema,
} from "@schemas/summoner-spell"
import { combatEffects } from "../effects/available-effects"
import type { BuildEffect, Effect } from "../effects/effect"
import { computeBuildStats } from "../stats/compute-build-stats"
import type { AbilityRanks } from "../stats/rank-stats"
import type {
	CombatAction,
	CombatEvent,
	CombatItem,
	CombatResult,
	CombatTarget,
	DealtDamage,
	OutcomeChoices,
} from "./combat"
import { outcomeChoices } from "./outcomes"
import {
	type CombatBuild,
	simulateCombat,
	simulateFreeCombat,
} from "./simulate-combat"

// Real current-patch data (public/data); the expected numbers are the wiki's formulas.
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
const RUNES = runesFileSchema
	.parse(await patchFile("runes.json"))
	.trees.flatMap((tree) => [tree.keystones, ...tree.rows].flat())

function find<Entry>(
	list: readonly Entry[],
	matches: (entry: Entry) => boolean,
): Entry {
	const found = list.find(matches)
	if (!found) throw new Error("not in the current patch")
	return found
}

const item = (name: string) => find(ITEMS, (entry) => entry.name === name)
const spell = (key: string) => find(SPELLS, (entry) => entry.key === key)
const rune = (key: string) => find(RUNES, (entry) => entry.key === key)

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
	runes?: readonly Rune[]
	target?: CombatTarget
	/** Markers before the first action, by effect id (the starting situation). */
	start?: readonly string[]
}

function buildOf({ champion, level, ranks, items = [] }: Setup): CombatBuild {
	return { champion, patch: PATCH, level, items, shards: [], ranks }
}

function effectsOf(setup: Setup): BuildEffect[] {
	return combatEffects({
		patch: PATCH,
		champion: setup.champion,
		ranks: setup.ranks,
		spells: setup.summoners ?? [],
		runes: setup.runes ?? [],
		items: setup.items ?? [],
	})
}

function inputOf(setup: Setup, actions: readonly CombatItem[]) {
	return {
		build: buildOf(setup),
		effects: effectsOf(setup),
		summoners: setup.summoners ?? [],
		target: setup.target ?? DUMMY,
		actions,
	}
}

function marker(effectId: string): CombatItem {
	return { kind: "situation", effectId }
}

/** The combo after the setup's starting markers, with the actions' steps only. */
function simulate(
	setup: Setup,
	actions: readonly CombatAction[],
): CombatResult {
	const markers = (setup.start ?? []).map(marker)
	const result = simulateCombat(inputOf(setup, [...markers, ...actions]))
	return { ...result, steps: result.steps.slice(markers.length) }
}

/** The damage dealt in a step, in order. */
function hits(result: CombatResult, step: number): DealtDamage[] {
	return (result.steps[step]?.events ?? []).flatMap((event) =>
		event.kind === "hit" && "damage" in event ? [event.damage] : [],
	)
}

function kinds(events: readonly CombatEvent[] | undefined) {
	return (events ?? []).map((event) => event.kind)
}

function physical(raw: number, armor = DUMMY.armor) {
	return (raw * 100) / (100 + armor)
}

function magic(raw: number) {
	return (raw * 100) / (100 + DUMMY.magicResist)
}

describe("Quinn: Harrier and Heightened Senses (worked example 1)", async () => {
	const setup: Setup = {
		champion: await champion("Quinn"),
		level: 9,
		ranks: { Q: 4, W: 1, E: 3, R: 1 },
		items: [item("Long Sword"), item("Long Sword"), item("Long Sword")],
	}
	const atRest = computeBuildStats(buildOf(setup))
	const bonusAD = 30
	// Wiki: Harrier deals 15 + 105 / 17 × (level − 1) (+ 40% bonus AD); Heightened Senses rank 1 +28% attack speed.
	const harrier = physical(15 + (105 / 17) * 8 + 0.4 * bonusAD)
	const result = simulate(setup, [
		{ kind: "ability", slot: "E" },
		{ kind: "attack" },
		{ kind: "attack" },
		{ kind: "ability", slot: "Q" },
		{ kind: "attack" },
	])
	const [vault, marked, plain, assault, remarked] = result.steps

	test("Vault deals its damage, then marks the target with Harrier, and has no cast time", () => {
		expect(kinds(vault?.events)).toEqual(["cast", "hit", "mark-applied"])
		// Vault rank 3: 90 (+ 20% bonus AD).
		expect(hits(result, 0)[0]?.final).toBeCloseTo(physical(90 + 0.2 * bonusAD))
		expect(vault?.marks).toEqual([{ mark: "quinn-harrier", endsAt: 4 }])
		expect(marked?.time).toBe(0)
	})

	test("the next attack consumes the mark: Harrier's bonus damage, then the W passive for 2 s", () => {
		const [attackHit, harrierHit] = hits(result, 1)

		expect(kinds(marked?.events).slice(0, 4)).toEqual([
			"hit",
			"on-hit",
			"mark-consumed",
			"hit",
		])
		expect(attackHit?.final).toBeCloseTo(physical(atRest.attackDamage.total))
		expect(harrierHit?.final).toBeCloseTo(harrier)
		expect(marked?.marks).toEqual([])
		expect(marked?.active).toContainEqual({
			effectId: "quinn-w-passive",
			holder: "attacker",
			startedAt: 0,
			endsAt: 2,
			stacks: 1,
		})
	})

	test("the W passive's attack speed sets the next attack's time, and it runs out at 2 s", () => {
		// Bonus attack speed adds to the total scaled by the champion's ratio.
		const hastened =
			atRest.attackSpeed.total + setup.champion.stats.attackSpeed.ratio * 0.28

		expect(plain?.time).toBeCloseTo(1 / hastened)
		expect(hits(result, 2)).toHaveLength(1)
		expect(plain?.events.at(-1)).toEqual({
			kind: "expire",
			time: 2,
			effectId: "quinn-w-passive",
			holder: "attacker",
		})
	})

	test("Blinding Assault marks again after its 0.25 s cast, and the attack after it consumes the new mark", () => {
		// Blinding Assault rank 4: 170 (+ 95% bonus AD) (+ 50% AP).
		expect(hits(result, 3)[0]?.final).toBeCloseTo(
			physical(170 + 0.95 * bonusAD),
		)
		expect(assault?.marks.map(({ mark }) => mark)).toEqual(["quinn-harrier"])
		expect(remarked?.time).toBeCloseTo((assault?.time ?? 0) + 0.25)
		expect(hits(result, 4)[1]?.final).toBeCloseTo(harrier)
	})

	test("adds up the damage and follows the target's health", () => {
		const dealt = result.steps
			.flatMap(({ events }) => events)
			.reduce(
				(sum, event) =>
					event.kind === "hit" && "damage" in event
						? sum + event.damage.final
						: sum,
				0,
			)

		expect(result.total.final).toBeCloseTo(dealt)
		expect(result.byType.physical.final).toBeCloseTo(dealt)
		expect(remarked?.targetHealth).toBeCloseTo(DUMMY.health - dealt)
		expect(result.kill).toBeUndefined()
	})

	test("Skystrike is listed as not modeled instead of a number", () => {
		const skystrike = simulate(setup, [{ kind: "ability", slot: "R" }])

		expect(skystrike.steps[0]?.events[1]).toMatchObject({
			kind: "hit",
			notModeled: [
				"Skystrike, the recast after the 2 s channel, is not simulated yet",
			],
		})
		expect(skystrike.total.final).toBe(0)
	})
})

/** The marks applied in a step, with when. */
function marksApplied(result: CombatResult, step: number) {
	return (result.steps[step]?.events ?? []).flatMap((event) =>
		event.kind === "mark-applied" ? [event.time] : [],
	)
}

describe("Quinn's starting situation and Valor's periodic mark (issue 330)", async () => {
	const setup: Setup = {
		champion: await champion("Quinn"),
		level: 9,
		ranks: { Q: 4, W: 1, E: 3, R: 1 },
		items: [item("Long Sword"), item("Long Sword"), item("Long Sword")],
	}
	const marked: Setup = { ...setup, start: ["quinn-harrier-valor"] }
	// Wiki: Harrier deals 15 + 105 / 17 × (level − 1) (+ 40% bonus AD); Valor's cooldown is 7 × 0.99 per 1% crit chance.
	const harrier = physical(15 + (105 / 17) * 8 + 0.4 * 30)

	test("without a starting mark, the first attack deals no Harrier damage", () => {
		const result = simulate(setup, [{ kind: "attack" }])

		expect(hits(result, 0)).toHaveLength(1)
		expect(result.steps[0]?.marks).toEqual([])
	})

	test("a starting mark is consumed by the first attack, from the start, with Harrier's damage and the W passive", () => {
		const result = simulate(marked, [{ kind: "attack" }])

		expect(result.steps[0]?.events).toContainEqual({
			kind: "mark-consumed",
			time: 0,
			mark: "quinn-harrier",
			fromSituation: true,
		})
		expect(hits(result, 0)[1]?.final).toBeCloseTo(harrier)
		expect(result.steps[0]?.active.map(({ effectId }) => effectId)).toContain(
			"quinn-w-passive",
		)
	})

	test("after a wait, Valor marks again 7 s after the mark was consumed, and the next attack consumes it", () => {
		const result = simulate(marked, [
			{ kind: "attack" },
			{ kind: "wait", seconds: 8 },
			{ kind: "attack" },
		])

		expect(marksApplied(result, 1)).toEqual([7])
		expect(result.steps[1]?.marks).toEqual([
			{ mark: "quinn-harrier", endsAt: 11 },
		])
		const consumed = result.steps[2]?.events.find(
			(event) => event.kind === "mark-consumed",
		)
		expect(consumed).toEqual({
			kind: "mark-consumed",
			time: result.steps[2]?.time ?? 0,
			mark: "quinn-harrier",
		})
		expect(hits(result, 2)[1]?.final).toBeCloseTo(harrier)
	})

	test("from a clean start, Valor's cooldown runs from 0: the mark comes at 7 s", () => {
		const result = simulate(setup, [{ kind: "wait", seconds: 7.5 }])

		expect(marksApplied(result, 0)).toEqual([7])
	})

	test("an unused starting mark runs out at 4 s, and Valor marks again 7 s later", () => {
		const result = simulate(marked, [{ kind: "wait", seconds: 12 }])

		expect(result.steps[0]?.events).toContainEqual({
			kind: "expire",
			time: 4,
			mark: "quinn-harrier",
		})
		expect(marksApplied(result, 0)).toEqual([11])
	})

	test("once an ability's mark leaves, Valor waits 1 s with no mark on the target", () => {
		const result = simulate(marked, [
			{ kind: "attack" },
			{ kind: "wait", seconds: 5 },
			{ kind: "ability", slot: "E" },
			{ kind: "attack" },
			{ kind: "wait", seconds: 1 },
		])
		const consumedAt = result.steps[3]?.time ?? 0
		const applied = result.steps
			.slice(3)
			.flatMap((_, index) => marksApplied(result, index + 3))

		// Valor's own cooldown ends at 7 s; Vault's mark, consumed after 6 s, pushes it to 1 s later.
		expect(consumedAt).toBeGreaterThan(6)
		expect(applied).toEqual([consumedAt + 1])
	})

	test("an ability's mark overwrites the starting one, and Valor's cooldown starts then", () => {
		const result = simulate(marked, [
			{ kind: "ability", slot: "E" },
			{ kind: "attack" },
			{ kind: "wait", seconds: 7.5 },
		])

		expect(
			result.steps[1]?.events.find((event) => event.kind === "mark-consumed"),
		).toEqual({ kind: "mark-consumed", time: 0, mark: "quinn-harrier" })
		expect(marksApplied(result, 2)).toEqual([7])
	})

	test("critical strike chance shortens Valor's cooldown", () => {
		const critical = {
			...marked,
			items: [item("Cloak of Agility"), item("Cloak of Agility")],
		}
		const crit = computeBuildStats(buildOf(critical)).critChance.total
		const result = simulate(critical, [
			{ kind: "attack" },
			{ kind: "wait", seconds: 7 },
		])

		expect(crit).toBeCloseTo(0.3)
		expect(marksApplied(result, 1)[0]).toBeCloseTo(7 * 0.99 ** 30)
	})

	test("after the last action, Valor marks nothing more", () => {
		const result = simulate(marked, [{ kind: "attack" }])

		expect(result.steps[0]?.events.map(({ kind }) => kind)).not.toContain(
			"mark-applied",
		)
	})
})

describe("Ziggs's Short Fuse: ready at the start, periodic, shortened by casts (issue 330)", async () => {
	const setup: Setup = {
		champion: await champion("Ziggs"),
		level: 9,
		ranks: { Q: 5, W: 1, E: 3, R: 1 },
	}
	const ready: Setup = { ...setup, start: ["ziggs-short-fuse"] }
	// Wiki: 20 + 4 per level to 6, then 8 per level to 12, then 12 (+ 50% AP): 64 at level 9, no AP.
	const shortFuse = magic(64)

	test("without it ready, the first attack is a plain one", () => {
		expect(hits(simulate(setup, [{ kind: "attack" }]), 0)).toHaveLength(1)
	})

	test("ready from the start, the first attack spends it for its bonus magic damage", () => {
		const result = simulate(ready, [{ kind: "attack" }, { kind: "attack" }])

		expect(hits(result, 0)[1]).toEqual({
			type: "magic",
			raw: 64,
			final: shortFuse,
		})
		expect(result.steps[0]?.events).toContainEqual(
			expect.objectContaining({
				kind: "hit",
				source: {
					kind: "effect",
					effectId: "ziggs-short-fuse",
					fromSituation: true,
				},
			}),
		)
		expect(hits(result, 1)).toHaveLength(1)
	})

	test("comes back 12 s after the attack that spent it", () => {
		const result = simulate(ready, [
			{ kind: "attack" },
			{ kind: "wait", seconds: 12 },
			{ kind: "attack" },
		])

		expect(
			result.steps[1]?.active.find(
				({ effectId }) => effectId === "ziggs-short-fuse",
			)?.startedAt,
		).toBe(12)
		expect(hits(result, 2)[1]?.final).toBeCloseTo(shortFuse)
	})

	test("each ability cast takes 5 s off its cooldown at level 9", () => {
		const result = simulate(ready, [
			{ kind: "attack" },
			{ kind: "ability", slot: "Q" },
			{ kind: "wait", seconds: 8 },
		])

		expect(
			result.steps[2]?.active.find(
				({ effectId }) => effectId === "ziggs-short-fuse",
			)?.startedAt,
		).toBe(7)
	})
})

describe("Ezreal: Mystic Shot with Trinity Force (worked example 2)", async () => {
	const setup: Setup = {
		champion: await champion("Ezreal"),
		level: 9,
		ranks: { Q: 5, W: 2, E: 1, R: 1 },
		items: [item("Trinity Force")],
	}
	const stats = computeBuildStats(buildOf(setup))
	const bonusAD = stats.attackDamage.bonus

	test("Mystic Shot primes the spellblade at its cast and spends it with its own on-hit (wiki)", () => {
		const result = simulate(setup, [{ kind: "ability", slot: "Q" }])
		const [shot, spellblade] = hits(result, 0)

		expect(kinds(result.steps[0]?.events)).toEqual([
			"cast",
			"hit",
			"on-hit",
			"hit",
			"expire",
		])
		// Mystic Shot rank 5: 120 (+ 130% AD); Trinity Force: 200% base AD.
		expect(shot?.final).toBeCloseTo(
			physical(120 + 1.3 * stats.attackDamage.total),
		)
		expect(spellblade?.final).toBeCloseTo(physical(2 * stats.attackDamage.base))
	})

	test("the spellblade's 1.5 s cooldown starts when spent, so an ability before then doesn't prime it", () => {
		const result = simulate(setup, [
			{ kind: "ability", slot: "Q" },
			{ kind: "attack" },
			{ kind: "ability", slot: "W" },
			{ kind: "attack" },
		])
		const [, firstAttack, flux, detonating] = result.steps

		expect(firstAttack?.time).toBe(0.25)
		expect(hits(result, 1)).toHaveLength(1)
		expect(flux?.time).toBeLessThan(1.5)
		expect(flux?.active.map(({ effectId }) => effectId)).not.toContain(
			"trinity-force-spellblade",
		)
		// Essence Flux holds its damage until the mark detonates: rank 2, 135 (+ 100% bonus AD) (+ 90% AP).
		expect(hits(result, 2)).toEqual([])
		expect(flux?.marks.map(({ mark }) => mark)).toEqual(["ezreal-w"])
		const [, detonation] = hits(result, 3)
		expect(detonation).toEqual({
			type: "magic",
			raw: 135 + bonusAD,
			final: expect.closeTo(magic(135 + bonusAD)),
		})
		expect(detonating?.marks).toEqual([])
	})

	test("an ability on cooldown is refused with when it is ready, and the combo goes on", () => {
		const result = simulate(setup, [
			{ kind: "ability", slot: "Q" },
			{ kind: "ability", slot: "Q" },
			{ kind: "wait", seconds: 4 },
			{ kind: "ability", slot: "Q" },
		])
		// Mystic Shot rank 5: 4.5 s × 100 / (100 + 15 ability haste) = 3.91 s.
		expect(stats.abilityHaste.total).toBe(15)

		expect(result.steps[1]?.refused).toBe(
			"Mystic Shot is on cooldown until 3.91 s",
		)
		expect(result.steps[1]?.events).toEqual([])
		expect(result.steps[3]?.refused).toBeUndefined()
		expect(hits(result, 3)).toHaveLength(2)
	})

	test("an ability's hit detonates Essence Flux as well", () => {
		const result = simulate({ ...setup, items: [] }, [
			{ kind: "ability", slot: "W" },
			{ kind: "ability", slot: "Q" },
		])

		expect(kinds(result.steps[1]?.events)).toEqual([
			"cast",
			"hit",
			"on-hit",
			"mark-consumed",
			"hit",
		])
	})
})

describe("Ignite with Nimbus Cloak (worked example 3)", async () => {
	const annie = await champion("Annie")
	const ignite = spell("SummonerDot")
	const setup: Setup = {
		champion: annie,
		level: 9,
		ranks: { Q: 5, W: 2, E: 1, R: 1 },
		summoners: [ignite, spell("SummonerFlash")],
		runes: [rune("NimbusCloak")],
	}
	const result = simulate(setup, [{ kind: "summoner", slot: 0 }])
	const [cast] = result.steps
	// Wiki: 70 + 20 per level to 5, then + 25 per level: 250 at level 9.
	const total = 250

	test("burns the target for true damage in five ticks a second apart, the first at the cast", () => {
		const ticks = (cast?.events ?? []).filter(
			(event): event is Extract<CombatEvent, { damage: DealtDamage }> =>
				event.kind === "hit" && "damage" in event,
		)

		expect(ticks.map(({ time }) => time)).toEqual([0, 1, 2, 3, 4])
		expect(ticks.map(({ damage }) => damage)).toEqual(
			Array(5).fill({ type: "true", raw: total / 5, final: total / 5 }),
		)
		expect(result.total.final).toBeCloseTo(total)
		expect(result.byType.true.final).toBeCloseTo(total)
		// The combo's time is its last damage: the fifth tick, not the burn running out at 5 s.
		expect(result.duration).toBe(4)
		expect(result.activeUntil).toBe(5)
	})

	test("Nimbus Cloak runs on the attacker for 2 s and Ignite on the target for 5 s", () => {
		expect(cast?.active).toEqual([
			{
				effectId: "ignite",
				holder: "target",
				startedAt: 0,
				endsAt: 5,
				stacks: 1,
			},
			{
				effectId: "nimbus-cloak-ignite",
				holder: "attacker",
				startedAt: 0,
				endsAt: 2,
				stacks: 1,
			},
		])
		const expiries = (cast?.events ?? []).filter(
			(event) => event.kind === "expire",
		)
		expect(expiries.map(({ time }) => time)).toEqual([2, 5])
	})

	test("a summoner spell on cooldown, or an empty slot, is refused", () => {
		const again = simulate({ ...setup, summoners: [ignite] }, [
			{ kind: "summoner", slot: 0 },
			{ kind: "summoner", slot: 0 },
			{ kind: "summoner", slot: 1 },
		])

		expect(again.steps[1]?.refused).toBe("Ignite is on cooldown until 180 s")
		expect(again.steps[2]?.refused).toBe("No summoner spell in this slot")
	})
})

describe("simulateCombat rules", async () => {
	const annie = await champion("Annie")
	const setup: Setup = {
		champion: annie,
		level: 1,
		ranks: { Q: 1, W: 0, E: 0, R: 0 },
	}

	test("refuses an ability without a point, and one a form can't cast, with the reason", async () => {
		const gnar = await champion("Gnar")
		const unranked = simulate(setup, [{ kind: "ability", slot: "W" }])
		const mini = simulate(
			{ champion: gnar, level: 6, ranks: { Q: 1, W: 1, E: 1, R: 1 } },
			[{ kind: "ability", slot: "R" }],
		)

		expect(unranked.steps[0]?.refused).toBe("Incinerate has no point yet")
		expect(mini.steps[0]?.refused).toBe(
			gnar.abilities.spells[3]?.unavailable?.reason,
		)
	})

	test("records the kill: the time and the step the target's health reached 0", () => {
		const result = simulate(
			{ ...setup, target: { ...DUMMY, health: 100, magicResist: 0 } },
			[{ kind: "attack" }, { kind: "ability", slot: "Q" }],
		)

		expect(result.kill).toEqual({ time: result.steps[1]?.time ?? -1, step: 1 })
		expect(result.steps[1]?.targetHealth).toBe(0)
	})

	test("lethality and armor penetration lower the armor a basic attack meets", () => {
		const target = { ...DUMMY, armor: 100 }
		const withLethality = simulate(
			{ ...setup, items: [item("Serrated Dirk")], target },
			[{ kind: "attack" }],
		)
		const stats = computeBuildStats(
			buildOf({ ...setup, items: [item("Serrated Dirk")] }),
		)

		expect(hits(withLethality, 0)[0]?.final).toBeCloseTo(
			physical(stats.attackDamage.total, 100 - stats.lethality.total),
		)
	})

	test("an effect's stacks scale what it grants, and stop at its max (Rev'd up)", async () => {
		const jinx = await champion("Jinx")
		const jinxSetup: Setup = {
			champion: jinx,
			level: 1,
			ranks: { Q: 1, W: 0, E: 0, R: 0 },
		}
		const result = simulate(
			jinxSetup,
			Array(4).fill({ kind: "attack" } satisfies CombatAction),
		)
		const stacks = result.steps.map(
			(step) =>
				step.active.find(({ effectId }) => effectId === "jinx-q-revd-up")
					?.stacks,
		)

		expect(stacks).toEqual([1, 2, 3, 3])
		const intervals = result.steps
			.slice(1)
			.map((step, index) => step.time - (result.steps[index]?.time ?? 0))
		expect(intervals[1]).toBeLessThan(intervals[0] ?? 0)
	})

	test("an effect that ends on an attack or a cast stops there (endsOn)", () => {
		const camouflage: Effect = {
			id: "test-ends-on-attack",
			source: { kind: "ability", championKey: "Annie", slot: "passive" },
			trigger: { kind: "on-cast" },
			duration: 10,
			endsOn: "attack",
			grants: [{ kind: "stat", stat: "attackDamage", amount: 50 }],
			since: "16.19",
			sourceUrl: "https://example.com",
		}
		const result = simulateCombat({
			build: buildOf(setup),
			effects: combatEffects(
				{
					patch: PATCH,
					champion: annie,
					ranks: setup.ranks,
					spells: [],
					runes: [],
				},
				[[camouflage]],
			),
			summoners: [],
			target: DUMMY,
			actions: [{ kind: "ability", slot: "Q" }, { kind: "attack" }],
		})

		expect(result.steps[0]?.active.map(({ effectId }) => effectId)).toEqual([
			"test-ends-on-attack",
		])
		expect(kinds(result.steps[1]?.events)[0]).toBe("expire")
		expect(hits(result, 1)[0]?.raw).toBeCloseTo(
			computeBuildStats(buildOf(setup)).attackDamage.total,
		)
	})

	test("starts from each effect's trigger default: a state effect is on, an event one is off", async () => {
		const teemo = await champion("Teemo")
		const result = simulate(
			{ champion: teemo, level: 1, ranks: { Q: 0, W: 1, E: 0, R: 0 } },
			[{ kind: "wait", seconds: 1 }],
		)

		expect(result.steps[0]?.active.map(({ effectId }) => effectId)).toEqual([
			"teemo-w-passive",
		])
	})
})

describe("early endings: Rengar's R and Viego's E (issue 329)", async () => {
	const rengar: Setup = {
		champion: await champion("Rengar"),
		level: 6,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}
	const viego: Setup = {
		champion: await champion("Viego"),
		level: 6,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}

	function running(result: CombatResult, step: number) {
		return (result.steps[step]?.active ?? []).map(({ effectId }) => effectId)
	}

	function expiredAt(result: CombatResult, step: number, effectId: string) {
		return result.steps[step]?.events.find(
			(event) =>
				event.kind === "expire" &&
				"effectId" in event &&
				event.effectId === effectId,
		)?.time
	}

	test("Thrill of the Hunt ends on Rengar's next attack, as it starts", () => {
		const result = simulate(rengar, [
			{ kind: "ability", slot: "R" },
			{ kind: "attack" },
		])

		expect(running(result, 0)).toContain("rengar-r-active")
		expect(expiredAt(result, 1, "rengar-r-active")).toBe(result.steps[1]?.time)
		expect(running(result, 1)).not.toContain("rengar-r-active")
	})

	test("Thrill of the Hunt ends on Rengar's next cast, as it starts", () => {
		const result = simulate(rengar, [
			{ kind: "ability", slot: "R" },
			{ kind: "wait", seconds: 1 },
			{ kind: "ability", slot: "E" },
		])

		expect(running(result, 1)).toContain("rengar-r-active")
		expect(expiredAt(result, 2, "rengar-r-active")).toBe(result.steps[2]?.time)
		expect(running(result, 2)).not.toContain("rengar-r-active")
	})

	test("Harrowed Path keeps its attack speed through attacks and casts, and ends after its 8 s", () => {
		const result = simulate(viego, [
			{ kind: "ability", slot: "E" },
			{ kind: "attack" },
			{ kind: "ability", slot: "Q" },
			{ kind: "wait", seconds: 8 },
		])

		expect(running(result, 1)).toContain("viego-e-active")
		expect(running(result, 2)).toContain("viego-e-active")
		expect(expiredAt(result, 3, "viego-e-active")).toBeCloseTo(
			(result.steps[0]?.time ?? Number.NaN) + 8,
		)
	})
})

describe("pauses: part of an effect off for a while after an event (issue 351)", async () => {
	const annie = await champion("Annie")
	const annieSetup: Setup = {
		champion: annie,
		level: 1,
		ranks: { Q: 1, W: 0, E: 0, R: 0 },
	}
	const viego: Setup = {
		champion: await champion("Viego"),
		level: 6,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}

	function pausedOf(result: CombatResult, step: number, effectId: string) {
		return result.steps[step]?.active.find(
			(effect) => effect.effectId === effectId,
		)?.paused
	}

	test("a cast switches the paused grants off for its seconds, then they come back", () => {
		const focus: Effect = {
			id: "test-paused-on-cast",
			source: { kind: "ability", championKey: "Annie", slot: "passive" },
			trigger: { kind: "always" },
			pauses: { on: ["cast"], grants: ["attackDamage"], seconds: 2 },
			grants: [{ kind: "stat", stat: "attackDamage", amount: 50 }],
			since: "16.19",
			sourceUrl: "https://example.com",
		}
		const result = simulateCombat({
			build: buildOf(annieSetup),
			effects: combatEffects(
				{
					patch: PATCH,
					champion: annie,
					ranks: annieSetup.ranks,
					spells: [],
					runes: [],
				},
				[[focus]],
			),
			summoners: [],
			target: DUMMY,
			actions: [
				{ kind: "attack" },
				{ kind: "ability", slot: "Q" },
				{ kind: "attack" },
				{ kind: "wait", seconds: 2 },
				{ kind: "attack" },
			],
		})
		const base = computeBuildStats(buildOf(annieSetup)).attackDamage.total

		expect(hits(result, 0)[0]?.raw).toBeCloseTo(base + 50)
		expect(hits(result, 2)[0]?.raw).toBeCloseTo(base)
		expect(hits(result, 4)[0]?.raw).toBeCloseTo(base + 50)
		expect(pausedOf(result, 1, "test-paused-on-cast")).toEqual({
			until: (result.steps[1]?.time ?? Number.NaN) + 2,
			grants: ["attackDamage"],
		})
		expect(pausedOf(result, 4, "test-paused-on-cast")).toBeUndefined()
	})

	test("Harrowed Path pauses only its movement speed for 1 s after an attack or a cast", () => {
		const result = simulate(viego, [
			{ kind: "ability", slot: "E" },
			{ kind: "attack" },
			{ kind: "wait", seconds: 1 },
			{ kind: "ability", slot: "Q" },
		])
		const attackAt = result.steps[1]?.time ?? Number.NaN
		const castAt = result.steps[3]?.time ?? Number.NaN

		// The E cast starts it, so it isn't paused by its own cast.
		expect(pausedOf(result, 0, "viego-e-active")).toBeUndefined()
		expect(pausedOf(result, 1, "viego-e-active")).toEqual({
			until: attackAt + 1,
			grants: ["movementSpeedPercent"],
		})
		expect(pausedOf(result, 2, "viego-e-active")).toBeUndefined()
		expect(pausedOf(result, 3, "viego-e-active")).toEqual({
			until: castAt + 1,
			grants: ["movementSpeedPercent"],
		})
	})

	test("Harrowed Path's attack speed holds while its movement speed is paused", () => {
		const effects = effectsOf(viego)
		const running = (paused: ReadonlySet<string>) =>
			computeBuildStats({
				...buildOf(viego),
				effects: {
					available: effects,
					overrides: { "viego-e-active": true },
					paused,
				},
			})
		const held = running(new Set())
		const paused = running(new Set(["viego-e-active"]))
		const without = computeBuildStats(buildOf(viego))

		expect(paused.attackSpeed.total).toBeCloseTo(held.attackSpeed.total)
		expect(paused.attackSpeed.total).toBeGreaterThan(without.attackSpeed.total)
		expect(paused.movementSpeed.total).toBeCloseTo(without.movementSpeed.total)
		expect(held.movementSpeed.total).toBeGreaterThan(paused.movementSpeed.total)
	})
})

describe("buffs after casting in the combo (issue 318)", async () => {
	const yi: Setup = {
		champion: await champion("MasterYi"),
		level: 11,
		ranks: { Q: 3, W: 1, E: 4, R: 2 },
	}
	const attack: CombatAction = { kind: "attack" }

	test("Highlander's 45% attack speed times the attacks after it, for 7 s", () => {
		const atRest = computeBuildStats(buildOf(yi)).attackSpeed.total
		const boosted = atRest + yi.champion.stats.attackSpeed.ratio * 0.45
		const plain = simulate(yi, [attack, attack])
		const highlander = simulate(yi, [
			{ kind: "ability", slot: "R" },
			attack,
			attack,
		])
		const castAt = highlander.steps[0]?.time ?? Number.NaN

		expect(plain.steps[1]?.time).toBeCloseTo(1 / atRest)
		expect(
			(highlander.steps[2]?.time ?? 0) - (highlander.steps[1]?.time ?? 0),
		).toBeCloseTo(1 / boosted)
		expect(highlander.steps[2]?.active).toContainEqual(
			expect.objectContaining({
				effectId: "master-yi-r-active",
				endsAt: expect.closeTo(castAt + 7),
			}),
		)
	})

	test("Shadow Assault's movement speed ends on Talon's next attack", async () => {
		const talon: Setup = {
			champion: await champion("Talon"),
			level: 6,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
		}
		const result = simulate(talon, [{ kind: "ability", slot: "R" }, attack])
		const effectIds = (step: number) =>
			(result.steps[step]?.active ?? []).map(({ effectId }) => effectId)

		expect(effectIds(0)).toContain("talon-r-active")
		expect(effectIds(1)).not.toContain("talon-r-active")
	})
})

describe("buffs that hold for some attacks or some hits (issue 318)", async () => {
	const attack: CombatAction = { kind: "attack" }
	const fiora: Setup = {
		champion: await champion("Fiora"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 5, R: 1 },
	}
	const udyr: Setup = {
		champion: await champion("Udyr"),
		level: 9,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
	}
	const vi: Setup = {
		champion: await champion("Vi"),
		level: 9,
		ranks: { Q: 1, W: 5, E: 1, R: 1 },
	}
	const atRest = (setup: Setup) =>
		computeBuildStats(buildOf(setup)).attackSpeed.total
	const interval = (result: CombatResult, step: number) =>
		(result.steps[step]?.time ?? 0) - (result.steps[step - 1]?.time ?? 0)
	const running = (result: CombatResult, step: number) =>
		(result.steps[step]?.active ?? []).map(({ effectId }) => effectId)

	test("Bladework's attack speed times Fiora's next 2 attacks, then ends", () => {
		const result = simulate(fiora, [
			{ kind: "ability", slot: "E" },
			attack,
			attack,
			attack,
			attack,
		])
		const boosted = atRest(fiora) + fiora.champion.stats.attackSpeed.ratio * 0.9

		expect(running(result, 1)).toContain("fiora-e-active")
		expect(interval(result, 2)).toBeCloseTo(1 / boosted)
		// Each empowered attack's timer reads the boosted speed, like Hail of Blades.
		expect(interval(result, 3)).toBeCloseTo(1 / boosted)
		expect(running(result, 2)).not.toContain("fiora-e-active")
		expect(interval(result, 4)).toBeCloseTo(1 / atRest(fiora))
	})

	test("Monk Training comes back with 2 attacks after each of Udyr's casts", () => {
		const result = simulate(udyr, [
			{ kind: "ability", slot: "Q" },
			attack,
			attack,
			{ kind: "ability", slot: "E" },
			attack,
		])

		expect(running(result, 1)).toContain("udyr-monk-training")
		expect(running(result, 2)).not.toContain("udyr-monk-training")
		expect(running(result, 3)).toContain("udyr-monk-training")
		expect(running(result, 4)).toContain("udyr-monk-training")
	})

	test("Denting Blows' attack speed comes with Vi's third hit, not before", () => {
		const result = simulate(vi, [attack, attack, attack, attack])
		const boosted = atRest(vi) + vi.champion.stats.attackSpeed.ratio * 0.5

		expect(interval(result, 1)).toBeCloseTo(1 / atRest(vi))
		expect(interval(result, 2)).toBeCloseTo(1 / atRest(vi))
		expect(interval(result, 3)).toBeCloseTo(1 / boosted)
	})
})

describe("a share of the target's health", async () => {
	const zac: Setup = {
		champion: await champion("Zac"),
		level: 9,
		ranks: { Q: 1, W: 2, E: 1, R: 0 },
	}

	test("Unstable Matter deals its base and a share of the target's maximum health, so a bigger target takes more", () => {
		const tank = { ...DUMMY, health: 3800 }
		const onDummy = simulate(zac, [{ kind: "ability", slot: "W" }])
		const onTank = simulate({ ...zac, target: tank }, [
			{ kind: "ability", slot: "W" },
		])

		// Wiki: rank 2 deals 50 (+ 5% (+ 3% per 100 AP) of the target's maximum health); Zac has no AP.
		expect(hits(onDummy, 0).map(({ raw }) => raw)).toEqual([
			50,
			expect.closeTo(0.05 * 1800),
		])
		expect(hits(onTank, 0)[1]?.raw).toBeCloseTo(0.05 * 3800)
		expect(hits(onTank, 0)[1]?.final).toBeCloseTo(magic(0.05 * 3800))
	})

	test("a share of the current or missing health reads the target's health when the hit lands", async () => {
		const camille = await champion("Camille")
		const garen = await champion("Garen")
		const hitRules = [
			{
				championKey: "Camille",
				slot: "R",
				damage: "RPercentCurrentHPDamage",
				since: "16.19",
				sourceUrl: "test",
			},
			{
				championKey: "Garen",
				slot: "R",
				damage: ["BaseDamage", "ExecuteDamage"],
				since: "16.19",
				sourceUrl: "test",
			},
		] as const
		const run = (setup: Setup) =>
			simulateCombat(
				{
					build: buildOf(setup),
					effects: effectsOf(setup),
					summoners: [],
					target: DUMMY,
					actions: [
						{ kind: "ability", slot: "E" },
						{ kind: "ability", slot: "Q" },
						{ kind: "ability", slot: "R" },
					],
				},
				{ hitRules },
			)
		const ranks = { Q: 1, W: 0, E: 1, R: 1 }
		const ultimatum = run({ champion: camille, level: 6, ranks })
		const justice = run({ champion: garen, level: 6, ranks })
		const healthBefore = (result: CombatResult) =>
			result.steps[1]?.targetHealth ?? Number.NaN

		// Wiki: The Hextech Ultimatum rank 1, 4% of the target's current health.
		expect(hits(ultimatum, 2)[0]?.raw).toBeCloseTo(
			0.04 * healthBefore(ultimatum),
		)
		// Wiki: Demacian Justice rank 1, 125 (+ 25% of the target's missing health) true damage.
		expect(hits(justice, 2).map(({ final }) => final)).toEqual([
			125,
			expect.closeTo(0.25 * (1800 - healthBefore(justice))),
		])
		expect(healthBefore(justice)).toBeLessThan(1800)
	})
})

/** An attack-empowering effect shaped like Hail of Blades, so these rules don't depend on its data. */
const RUSH: BuildEffect = {
	id: "rush",
	name: "Rush",
	icon: "rush.png",
	effect: {
		id: "rush",
		source: { kind: "rune", runeKey: "Rush" },
		trigger: { kind: "on-attack" },
		charges: 3,
		duration: 3,
		cooldown: 10,
		cooldownFrom: "end",
		start: { kind: "ready" },
		grants: [
			{
				kind: "stat",
				stat: "attackSpeedPercent",
				amount: { by: "attackType", melee: 0.9, ranged: 0.6 },
			},
			{
				kind: "onAttackDamage",
				damageType: "true",
				base: 10,
				ratios: { bonusAttackDamage: 0.5 },
			},
		],
		since: "16.19",
		sourceUrl: "https://wiki.leagueoflegends.com/en-us/",
	},
}

function outcomeOf(result: CombatResult, step: number, id: string) {
	return result.steps[step]?.outcomes.find(
		(outcome) =>
			("effectId" in outcome ? outcome.effectId : outcome.mark) === id,
	)
}

describe("situation markers anywhere in the combo (issue 338)", async () => {
	const setup: Setup = {
		champion: await champion("Quinn"),
		level: 9,
		ranks: { Q: 4, W: 1, E: 3, R: 1 },
		items: [item("Long Sword"), item("Long Sword"), item("Long Sword")],
	}
	const run = (items: readonly CombatItem[]) =>
		simulateCombat({
			...inputOf(setup, items),
			effects: [...effectsOf(setup), RUSH],
		})
	const rushed = (result: CombatResult) =>
		result.steps.map((step) =>
			outcomeOf(result, result.steps.indexOf(step), "rush"),
		)
	const attack: CombatItem = { kind: "attack" }
	const rush = marker("rush")
	const harrier = marker("quinn-harrier-valor")
	// Ranged: +60% bonus attack speed, scaled by the champion's ratio like any bonus.
	const atRest = computeBuildStats(buildOf(setup)).attackSpeed.total
	const hastened = atRest + setup.champion.stats.attackSpeed.ratio * 0.6

	test("without a marker, a situational effect starts on its cooldown, as if just used", () => {
		const result = run([attack])

		expect(outcomeOf(result, 0, "rush")).toEqual({
			kind: "empowered",
			effectId: "rush",
			happened: false,
			readyAt: 10,
		})
	})

	test("a marker at the top empowers the next 3 attacks, 1/3 to 3/3, faster and with its damage", () => {
		const result = run([rush, attack, attack, attack, attack])

		expect(result.steps[0]?.situation).toEqual({ status: "applied" })
		expect(
			[1, 2, 3, 4].map((step) => outcomeOf(result, step, "rush")?.charge),
		).toEqual([
			{ used: 1, max: 3 },
			{ used: 2, max: 3 },
			{ used: 3, max: 3 },
			undefined,
		])
		expect(result.steps[2]?.time).toBeCloseTo(1 / hastened)
		// 10 + 50% of the 30 bonus AD, true damage.
		expect(hits(result, 1)[1]).toEqual({ type: "true", raw: 25, final: 25 })
		expect(hits(result, 4)).toHaveLength(1)
	})

	test("once its charges are used, its cooldown starts from the last one", () => {
		const result = run([rush, attack, attack, attack, attack])
		const third = result.steps[3]?.time ?? 0

		expect(outcomeOf(result, 4, "rush")).toMatchObject({
			happened: false,
			readyAt: expect.closeTo(third + 10),
		})
	})

	test("unused for 3 s, it ends and its cooldown starts then", () => {
		const result = run([rush, attack, { kind: "wait", seconds: 5 }, attack])

		expect(outcomeOf(result, 3, "rush")).toMatchObject({
			happened: false,
			readyAt: 13,
		})
	})

	test("a second marker after its cooldown is the rune coming back: the next attack is 1/3 again", () => {
		const result = run([
			rush,
			attack,
			attack,
			attack,
			{ kind: "wait", seconds: 11 },
			rush,
			attack,
		])
		const readyAt = (result.steps[3]?.time ?? 0) + 10

		expect(result.steps[5]?.situation).toEqual({
			status: "applied",
			readyAt: expect.closeTo(readyAt),
		})
		expect(outcomeOf(result, 6, "rush")?.charge).toEqual({ used: 1, max: 3 })
	})

	test("a marker while a use in the combo still has its effect on cooldown is ignored, and says until when", () => {
		const result = run([rush, attack, attack, attack, rush, attack])
		const readyAt = (result.steps[3]?.time ?? 0) + 10

		expect(result.steps[4]?.situation).toEqual({
			status: "ignored",
			readyAt: expect.closeTo(readyAt),
		})
		expect(outcomeOf(result, 5, "rush")).toMatchObject({
			happened: false,
			readyAt: expect.closeTo(readyAt),
		})
	})

	test("the cooldown assumed at the start blocks no marker: the rune ready after the first attack applies", () => {
		const result = run([attack, rush, attack])

		expect(result.steps[1]?.situation).toEqual({ status: "applied" })
		expect(outcomeOf(result, 2, "rush")?.charge).toEqual({ used: 1, max: 3 })
	})

	test("reordering across a marker moves the effect to the steps after it", () => {
		const before = run([rush, attack, attack])
		const after = run([attack, rush, attack])

		expect(rushed(before).map((outcome) => outcome?.happened)).toEqual([
			undefined,
			true,
			true,
		])
		expect(rushed(after).map((outcome) => outcome?.happened)).toEqual([
			false,
			undefined,
			true,
		])
		expect(outcomeOf(after, 2, "rush")?.charge).toEqual({ used: 1, max: 3 })
	})

	test("a mark marker mid-sequence marks the target from there, and the next attack consumes it", () => {
		const result = run([attack, harrier, attack])

		expect(hits(result, 0)).toHaveLength(1)
		expect(result.steps[2]?.events).toContainEqual(
			expect.objectContaining({
				kind: "mark-consumed",
				mark: "quinn-harrier",
				fromSituation: true,
			}),
		)
		expect(outcomeOf(result, 2, "quinn-harrier")).toMatchObject({
			kind: "mark-consumed",
			happened: true,
		})
	})

	test("a mark marker on a target already marked has no effect", () => {
		const result = run([{ kind: "ability", slot: "E" }, harrier, attack])

		expect(result.steps[1]?.situation).toEqual({
			status: "no-effect",
			reason: "already-marked",
		})
	})

	test("a mark marker while its applier is on cooldown from a use in the combo is ignored", () => {
		const result = run([harrier, attack, harrier, attack])

		expect(result.steps[2]?.situation).toMatchObject({ status: "ignored" })
		expect(outcomeOf(result, 3, "quinn-harrier")?.happened).toBe(false)
	})

	test("a marker the build lacks has no effect", () => {
		const result = run([marker("ghost"), attack])

		expect(result.steps[0]?.situation).toEqual({
			status: "no-effect",
			reason: "unavailable",
		})
	})

	test("a marker owns no events: what follows an action stays with it", () => {
		const result = run([
			{ kind: "ability", slot: "E" },
			harrier,
			{ kind: "wait", seconds: 5 },
		])

		expect(result.steps[1]?.events).toEqual([])
		expect(result.steps[2]?.events).toContainEqual({
			kind: "expire",
			time: 4,
			mark: "quinn-harrier",
		})
	})
})

describe("free mode (issue 338)", async () => {
	const setup: Setup = {
		champion: await champion("Quinn"),
		level: 9,
		ranks: { Q: 4, W: 1, E: 3, R: 1 },
		items: [item("Long Sword"), item("Long Sword"), item("Long Sword")],
	}
	const input = (items: readonly CombatItem[]) => ({
		...inputOf(setup, items),
		effects: [...effectsOf(setup), RUSH],
	})
	const attack: CombatItem = { kind: "attack" }
	const vault: CombatItem = { kind: "ability", slot: "E" }
	const combo: CombatItem[] = [
		marker("rush"),
		attack,
		vault,
		attack,
		attack,
		attack,
	]

	test("a cooldown never refuses an action", () => {
		const strict = simulateCombat(input([vault, vault]))
		const free = simulateFreeCombat(input([vault, vault]), [])

		expect(strict.steps[1]?.refused).toBeDefined()
		expect(free.result.steps[1]?.refused).toBeUndefined()
	})

	test("without choices, its outcomes are the strict result's, and so is the damage", () => {
		const strict = simulateCombat(input(combo))
		const free = simulateFreeCombat(input(combo), [])

		expect(free.seed).toEqual(outcomeChoices(strict))
		expect(free.result.total.final).toBeCloseTo(strict.total.final)
	})

	test("choices equal to the computed outcomes change nothing", () => {
		const { seed, result } = simulateFreeCombat(input(combo), [])
		const forced = simulateCombat({
			...input(combo),
			free: { outcomes: seed },
		})

		expect(forced.total.final).toBeCloseTo(result.total.final)
		expect(outcomeChoices(forced)).toEqual(seed)
	})

	test("an attack the rules left out can be empowered, and only it changes", () => {
		const { seed, result } = simulateFreeCombat(input(combo), [])
		const choices = combo.map((_, index) =>
			index === 5 ? { "empowered:rush": true } : undefined,
		)
		const changed = simulateFreeCombat(input(combo), choices)

		expect(seed[5]?.["empowered:rush"]).toBe(false)
		expect(outcomeOf(changed.result, 5, "rush")?.happened).toBe(true)
		expect(hits(changed.result, 5)).toHaveLength(hits(result, 5).length + 1)
		expect(outcomeChoices(changed.result).slice(0, 5)).toEqual(seed.slice(0, 5))
	})

	test("an attack can skip the effect, and Harrier's mark can be kept or consumed at will", () => {
		const choices: (OutcomeChoices | undefined)[] = [
			undefined,
			{ "empowered:rush": false },
			undefined,
			{ "mark-consumed:quinn-harrier": false },
			undefined,
			{ "mark-consumed:quinn-harrier": true },
		]
		const { result } = simulateFreeCombat(input(combo), choices)

		expect(outcomeOf(result, 1, "rush")?.happened).toBe(false)
		expect(hits(result, 1)).toHaveLength(1)
		expect(outcomeOf(result, 3, "quinn-harrier")?.happened).toBe(false)
		expect(result.steps[3]?.marks.map(({ mark }) => mark)).toEqual([
			"quinn-harrier",
		])
		expect(outcomeOf(result, 5, "quinn-harrier")?.happened).toBe(true)
	})

	test("a cast's mark can be prevented, and a choice for an outcome the step can't have is ignored", () => {
		const choices: (OutcomeChoices | undefined)[] = [
			undefined,
			undefined,
			{ "mark-applied:quinn-harrier": false, "empowered:rush": true },
		]
		const { result } = simulateFreeCombat(input(combo), choices)

		expect(marksApplied(result, 2)).toEqual([])
		expect(outcomeOf(result, 2, "rush")).toBeUndefined()
	})

	test("a marker strict mode ignores is forced, and applies", () => {
		const items = [
			marker("rush"),
			attack,
			attack,
			attack,
			marker("rush"),
			attack,
		]
		const { result } = simulateFreeCombat(input(items), [])

		expect(result.steps[4]?.situation).toMatchObject({ status: "forced" })
		expect(outcomeOf(result, 5, "rush")?.charge).toEqual({ used: 1, max: 3 })
	})

	test("times follow the actions as in strict mode, without cooldowns", () => {
		const strict = simulateCombat(input(combo))
		const { result } = simulateFreeCombat(input(combo), [])

		expect(result.steps.map(({ time }) => time)).toEqual(
			strict.steps.map(({ time }) => time),
		)
		expect(result.duration).toBeCloseTo(strict.duration)
	})
})

describe("ability variants: an input per step (issue 338)", async () => {
	const darius = await champion("Darius")
	const setup: Setup = {
		champion: darius,
		level: 9,
		ranks: { Q: 5, W: 1, E: 1, R: 1 },
	}
	const hitRules = [
		{
			championKey: "Darius",
			slot: "Q",
			variants: [
				{ id: "blade", label: "Blade", damage: "BladeDamage" },
				{ id: "handle", label: "Handle", damage: "HandleDamage" },
			],
			since: "16.19",
			sourceUrl: "test",
		},
	] as const
	const decimate = (variant?: string) =>
		simulateCombat(
			inputOf(setup, [
				{ kind: "ability", slot: "Q", ...(variant && { variant }) },
			]),
			{ hitRules },
		)

	test("the first variant is the default, and another deals its own damage", () => {
		const blade = hits(decimate(), 0)[0]?.raw ?? 0

		expect(hits(decimate("blade"), 0)[0]?.raw).toBe(blade)
		expect(hits(decimate("handle"), 0)[0]?.raw).toBeCloseTo(blade * 0.35)
	})
})

describe("the combo's time is its last damage (issue 338, decision 1a)", async () => {
	// Level 18, no items: 1.02 attacks a second, so the attacks land at 0, 0.98 and 1.96 s.
	const quinn: Setup = {
		champion: await champion("Quinn"),
		level: 18,
		ranks: { Q: 5, W: 5, E: 5, R: 3 },
	}
	const attack: CombatItem = { kind: "attack" }
	const harrier = marker("quinn-harrier-valor")
	const run = (items: readonly CombatItem[]) =>
		simulateCombat(inputOf(quinn, items))

	test("3 attacks: the third hit, not the attack period after it", () => {
		const result = run([attack, attack, attack])

		expect(result.duration).toBeCloseTo(1.96, 2)
		expect(result.duration).toBe(result.steps[2]?.time ?? Number.NaN)
	})

	test("a Harrier marker before the third attack: still its hit, though Heightened Senses runs 2 s more", () => {
		const result = run([attack, attack, harrier, attack])

		expect(result.duration).toBeCloseTo(1.96, 2)
		expect(result.activeUntil).toBeCloseTo(3.96, 2)
	})

	test("a Harrier marker before the first attack: Heightened Senses' attack speed makes it shorter", () => {
		expect(run([harrier, attack, attack, attack]).duration).toBeLessThan(1.95)
	})

	test("Ignite's ticks after the last action extend it, 4 s after the cast", async () => {
		const ignite = spell("SummonerDot")
		const result = simulateCombat(
			inputOf({ ...quinn, summoners: [ignite] }, [
				attack,
				{ kind: "summoner", slot: 0 },
			]),
		)

		expect(result.duration).toBe((result.steps[1]?.time ?? Number.NaN) + 4)
	})
})

describe("Hail of Blades (issue 338)", async () => {
	const quinn: Setup = {
		champion: await champion("Quinn"),
		level: 9,
		ranks: { Q: 4, W: 1, E: 3, R: 1 },
		items: [item("Long Sword"), item("Long Sword"), item("Long Sword")],
		runes: [rune("HailOfBlades")],
	}
	const ready = marker("hail-of-blades")
	const attack: CombatItem = { kind: "attack" }
	const run = (setup: Setup, items: readonly CombatItem[]) =>
		simulateCombat(inputOf(setup, items))
	// Wiki: 2 + 18 / 17 × (level − 1) (+ 12% bonus AD) true damage; 60% bonus attack speed ranged, 90% melee.
	const trueDamage = (level: number, bonusAD: number) =>
		2 + (18 / 17) * (level - 1) + 0.12 * bonusAD

	test("ready at the top, Quinn's first 3 attacks are faster and deal its true damage, then it goes on cooldown", () => {
		const result = run(quinn, [ready, attack, attack, attack, attack])
		const atRest = computeBuildStats(buildOf(quinn)).attackSpeed.total
		const ratio = quinn.champion.stats.attackSpeed.ratio

		expect(result.steps[2]?.time).toBeCloseTo(1 / (atRest + ratio * 0.6))
		expect(hits(result, 1)[1]).toEqual({
			type: "true",
			raw: expect.closeTo(trueDamage(9, 30)),
			final: expect.closeTo(trueDamage(9, 30)),
		})
		expect(hits(result, 4)).toHaveLength(1)
		expect(outcomeOf(result, 4, "hail-of-blades")).toMatchObject({
			happened: false,
			readyAt: expect.closeTo((result.steps[3]?.time ?? 0) + 10),
		})
	})

	test("the rune coming back mid-combo: a second marker after the cooldown empowers the next attacks again", () => {
		const result = run(quinn, [
			ready,
			attack,
			attack,
			attack,
			{ kind: "wait", seconds: 10 },
			ready,
			attack,
		])

		expect(result.steps[5]?.situation?.status).toBe("applied")
		expect(outcomeOf(result, 6, "hail-of-blades")?.charge).toEqual({
			used: 1,
			max: 3,
		})
	})

	test("a melee champion gets 90% bonus attack speed", async () => {
		const darius: Setup = {
			champion: await champion("Darius"),
			level: 9,
			ranks: { Q: 1, W: 1, E: 1, R: 1 },
			runes: [rune("HailOfBlades")],
		}
		const result = run(darius, [ready, attack, attack])
		const atRest = computeBuildStats(buildOf(darius)).attackSpeed.total
		const ratio = darius.champion.stats.attackSpeed.ratio

		expect(result.steps[2]?.time).toBeCloseTo(1 / (atRest + ratio * 0.9))
	})
})

describe("Decimate and Super Mega Death Rocket!: the player picks how the cast lands (issue 338)", async () => {
	// No point in Apprehend, whose passive armor penetration would lower the armor.
	const darius: Setup = {
		champion: await champion("Darius"),
		level: 9,
		ranks: { Q: 5, W: 1, E: 0, R: 1 },
	}
	const jinx: Setup = {
		champion: await champion("Jinx"),
		level: 11,
		ranks: { Q: 1, W: 1, E: 1, R: 1 },
		items: [item("Long Sword")],
	}
	const cast = (
		setup: Setup,
		slot: "Q" | "R",
		variant?: string,
	): DealtDamage[] =>
		hits(
			simulate(setup, [{ kind: "ability", slot, ...(variant && { variant }) }]),
			0,
		)

	test("Decimate deals the blade's damage by default, and 35% with the handle", () => {
		const ad = computeBuildStats(buildOf(darius)).attackDamage.total
		// Wiki: rank 5, 170 (+ 140% AD); the handle deals 35%.
		const blade = 170 + 1.4 * ad

		expect(cast(darius, "Q")[0]?.final).toBeCloseTo(physical(blade))
		expect(cast(darius, "Q", "handle")[0]?.final).toBeCloseTo(
			physical(0.35 * blade),
		)
	})

	test("Super Mega Death Rocket! deals its maximum far and 10% near, plus the missing health part either way", () => {
		// Wiki: rank 1, 200 (+ 120% bonus AD) far, 20 (+ 12% bonus AD) near; full target: no missing health part.
		expect(cast(jinx, "R").map(({ raw }) => raw)).toEqual([
			expect.closeTo(200 + 1.2 * 10),
			0,
		])
		expect(cast(jinx, "R", "near")[0]?.raw).toBeCloseTo(20 + 0.12 * 10)
	})
})

describe("grants on their own clock (issue 373)", async () => {
	const annie = await champion("Annie")
	const setup: Setup = {
		champion: annie,
		level: 1,
		ranks: { Q: 1, W: 1, E: 0, R: 0 },
	}
	const effectOf = (grants: Effect["grants"]): Effect => ({
		id: "test-grant-clock",
		source: { kind: "ability", championKey: "Annie", slot: "passive" },
		trigger: { kind: "on-cast" },
		duration: 10,
		grants,
		since: "16.19",
		sourceUrl: "https://example.com",
	})
	const run = (effect: Effect, actions: readonly CombatAction[]) =>
		simulateCombat({
			build: buildOf(setup),
			effects: combatEffects(
				{
					patch: PATCH,
					champion: annie,
					ranks: setup.ranks,
					spells: [],
					runes: [],
				},
				[[effect]],
			),
			summoners: [],
			target: DUMMY,
			actions,
		})
	const atRest = computeBuildStats(buildOf(setup)).attackDamage.total
	const attackRaw = (result: CombatResult, step: number) =>
		hits(result, step).find((_, index) => index === 0)?.raw
	const shortAndLong = effectOf([
		{ kind: "stat", stat: "attackDamage", amount: 50, duration: 1 },
		{ kind: "stat", stat: "attackDamage", amount: 20 },
	])

	test("a grant with its own duration ends then, while its effect and other grants run on", () => {
		const result = run(shortAndLong, [
			{ kind: "ability", slot: "Q" },
			{ kind: "attack" },
			{ kind: "wait", seconds: 2 },
			{ kind: "attack" },
		])

		expect(attackRaw(result, 1)).toBeCloseTo(atRest + 70)
		expect(attackRaw(result, 3)).toBeCloseTo(atRest + 20)
		expect(result.steps[3]?.active.map(({ effectId }) => effectId)).toContain(
			"test-grant-clock",
		)
	})

	test("a re-trigger starts the grant's clock again", () => {
		const result = run(shortAndLong, [
			{ kind: "ability", slot: "Q" },
			{ kind: "wait", seconds: 0.9 },
			{ kind: "ability", slot: "W" },
			{ kind: "attack" },
		])

		expect(attackRaw(result, 3)).toBeCloseTo(atRest + 70)
	})

	test("a decaying grant is read at each moment: a straight line to its floor, then held", () => {
		const decaying = effectOf([
			{
				kind: "stat",
				stat: "attackDamage",
				amount: 40,
				decay: { over: 2, to: 10 },
			},
		])
		const result = run(decaying, [
			{ kind: "ability", slot: "Q" },
			{ kind: "wait", seconds: 0.75 },
			{ kind: "attack" },
			{ kind: "wait", seconds: 3 },
			{ kind: "attack" },
		])
		const castAt = result.steps[0]?.time ?? Number.NaN
		const elapsed = (result.steps[2]?.time ?? Number.NaN) - castAt

		expect(elapsed).toBeLessThan(2)
		expect(attackRaw(result, 2)).toBeCloseTo(atRest + 40 - 30 * (elapsed / 2))
		expect(attackRaw(result, 4)).toBeCloseTo(atRest + 10)
	})
})

describe("an effect that starts when a state ends: Twitch's Ambush (issue 372)", async () => {
	const twitch: Setup = {
		champion: await champion("Twitch"),
		level: 3,
		ranks: { Q: 1, W: 1, E: 1, R: 0 },
	}
	const attack: CombatAction = { kind: "attack" }
	const ambush: CombatAction = { kind: "ability", slot: "Q" }
	const wait = (seconds: number): CombatAction => ({ kind: "wait", seconds })
	const atRest = computeBuildStats(buildOf(twitch)).attackSpeed.total
	const boosted = atRest + twitch.champion.stats.attackSpeed.ratio * 0.4

	function ambushOf(result: CombatResult, step: number) {
		return result.steps[step]?.active.find(
			({ effectId }) => effectId === "twitch-q-active",
		)
	}

	function gap(result: CombatResult, from: number) {
		return (
			(result.steps[from + 1]?.time ?? Number.NaN) -
			(result.steps[from]?.time ?? Number.NaN)
		)
	}

	test("the cast gives no attack speed: it waits 1 s, then camouflaged for its 10 s", () => {
		const result = simulate(twitch, [ambush])

		expect(ambushOf(result, 0)).toBeUndefined()
		expect(result.steps[0]?.waiting).toEqual([
			{ effectId: "twitch-q-active", label: "camouflaged", from: 1, until: 11 },
		])
	})

	test("an attack before the camouflage gets nothing; the one that breaks it starts the 6 s", () => {
		const result = simulate(twitch, [ambush, attack, attack, attack])
		const breakAt = result.steps[2]?.time ?? Number.NaN

		expect(result.steps[1]?.time).toBeLessThan(1)
		expect(ambushOf(result, 1)).toBeUndefined()
		expect(gap(result, 1)).toBeCloseTo(1 / atRest)
		expect(breakAt).toBeGreaterThan(1)
		expect(ambushOf(result, 2)).toMatchObject({
			startedAt: breakAt,
			endsAt: expect.closeTo(breakAt + 6),
		})
		expect(result.steps[2]?.waiting).toBeUndefined()
		// It breaks as its windup starts (wiki), so the breaking attack's own timer reads the speed.
		expect(gap(result, 2)).toBeCloseTo(1 / boosted)
	})

	test("a wait shorter than the 1 s delay leaves the attack before the camouflage", () => {
		const result = simulate(twitch, [ambush, wait(0.5), attack])

		expect(result.steps[1]?.waiting?.[0]).toMatchObject({ from: 1 })
		expect(ambushOf(result, 2)).toBeUndefined()
		expect(result.steps[2]?.waiting?.[0]).toMatchObject({ from: 1 })
	})

	test("after a 1 s wait it is camouflaged, and the attack breaks it as it starts", () => {
		const result = simulate(twitch, [ambush, wait(1), attack, attack])
		const breakAt = result.steps[2]?.time ?? Number.NaN

		expect(result.steps[1]?.waiting).toEqual([
			{ effectId: "twitch-q-active", label: "camouflaged", until: 11 },
		])
		expect(ambushOf(result, 2)?.endsAt).toBeCloseTo(breakAt + 6)
		expect(gap(result, 2)).toBeCloseTo(1 / boosted)
	})

	test("a cast breaks it too", () => {
		const result = simulate(twitch, [
			ambush,
			wait(1),
			{ kind: "ability", slot: "W" },
		])
		const castAt = result.steps[2]?.time ?? Number.NaN

		expect(ambushOf(result, 2)?.endsAt).toBeCloseTo(castAt + 6)
	})

	test("unbroken, the attack speed starts when the camouflage runs out", () => {
		const result = simulate(twitch, [ambush, wait(12)])

		expect(ambushOf(result, 1)).toMatchObject({ startedAt: 11, endsAt: 17 })
		expect(result.steps[1]?.waiting).toBeUndefined()
	})
})
