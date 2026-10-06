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
	CombatResult,
	CombatTarget,
	DealtDamage,
} from "./combat"
import { type CombatBuild, simulateCombat } from "./simulate-combat"

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

function simulate(
	setup: Setup,
	actions: readonly CombatAction[],
): CombatResult {
	return simulateCombat({
		build: buildOf(setup),
		effects: effectsOf(setup),
		summoners: setup.summoners ?? [],
		target: setup.target ?? DUMMY,
		actions,
	})
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
		expect(result.duration).toBe(5)
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
