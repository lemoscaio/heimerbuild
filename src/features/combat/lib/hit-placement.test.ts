import { describe, expect, test } from "bun:test"
import { type Champion, championSchema } from "@schemas/champion"
import { type Item, ItemsFileSchema } from "@schemas/item"
import { type Rune, runesFileSchema } from "@schemas/rune"
import type {
	CombatItem,
	CombatResult,
	CombatTarget,
} from "@/lib/combat/combat"
import { simulateCombat } from "@/lib/combat/simulate-combat"
import { combatEffects } from "@/lib/effects/available-effects"
import type { Effect } from "@/lib/effects/effect"
import { ABILITY_EFFECTS } from "@/lib/effects/registries/ability-effects"
import { ITEM_EFFECTS } from "@/lib/effects/registries/item-effects"
import { RUNE_EFFECTS } from "@/lib/effects/registries/rune-effects"
import { abilitiesInForm } from "@/lib/form-abilities"
import type { AbilityRanks } from "@/lib/stats/rank-stats"
import { combatRows, timedHits } from "./combat-rows"
import { combatTimeline } from "./combat-timeline"
import { type CombatNames, combatNames, stepView } from "./combat-view"
import {
	type EffectsById,
	effectsById,
	isSeparateInstance,
	placedSteps,
	placeHit,
} from "./hit-placement"

// Real current-patch data (public/data), as the Combo tab runs it.
const DATA = new URL("../../../../public/data/", import.meta.url)
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

function find<Entry>(list: readonly Entry[], matches: (e: Entry) => boolean) {
	const found = list.find(matches)
	if (!found) throw new Error("not in the current patch")
	return found
}

const item = (id: string) => find(ITEMS, (entry) => entry.id === id)
const rune = (key: string) => find(RUNES, (entry) => entry.key === key)

type Setup = {
	champion: Champion
	level: number
	ranks: AbilityRanks
	runes?: readonly Rune[]
	items?: readonly Item[]
	target: CombatTarget
}

type Combo = {
	result: CombatResult
	effects: EffectsById
	names: CombatNames
	target: CombatTarget
	timeline: ReturnType<typeof combatTimeline>
}

function combo(setup: Setup, actions: readonly CombatItem[]): Combo {
	const { champion, level, ranks, runes = [], items = [], target } = setup
	const buildEffects = combatEffects({
		patch: PATCH,
		champion,
		ranks,
		spells: [],
		runes,
		items,
	})
	const result = simulateCombat({
		build: { champion, patch: PATCH, level, items, shards: [], ranks },
		effects: buildEffects,
		summoners: [],
		target,
		actions,
	})
	const names = combatNames({
		passiveName: champion.abilities.passive.name,
		spells: abilitiesInForm(champion.abilities, undefined).spells,
		effects: buildEffects,
	})
	return {
		result,
		effects: effectsById(buildEffects),
		names,
		target,
		timeline: combatTimeline(result, { target, names, effects: buildEffects }),
	}
}

/** The List's cards: each step with its placed hits, as `useCombatView` builds them. */
function listViews({ result, effects, names, target }: Combo) {
	return placedSteps(result.steps, effects).map((step) =>
		stepView(step, { names, target, effects }),
	)
}

const ATTACK = { kind: "attack" } as const
const cast = (slot: "Q" | "W" | "E" | "R") =>
	({ kind: "ability", slot }) as const

const DUMMY: CombatTarget = {
	health: 1800,
	armor: 60,
	magicResist: 45,
	level: 9,
}

const annie = await champion("Annie")
// Level 9 with Q W E Q Q R Q W Q, Luden's Companion's Amplifying Tome.
const ANNIE = {
	champion: annie,
	level: 9,
	ranks: { Q: 5, W: 2, E: 1, R: 1 },
	items: [item("1052")],
	target: DUMMY,
}
const ANNIE_COMET = combo({ ...ANNIE, runes: [rune("ArcaneComet")] }, [
	cast("Q"),
	cast("W"),
	ATTACK,
])

const VAYNE = combo(
	{
		champion: await champion("Vayne"),
		level: 13,
		ranks: { Q: 0, W: 0, E: 0, R: 0 },
		items: ["3153", "6672", "3124", "3091"].map(item),
		target: { health: 3800, armor: 200, magicResist: 140, level: 13 },
	},
	Array.from({ length: 10 }, () => ATTACK),
)

const garen = await champion("Garen")
// Level 9 with Q E W Q Q R Q E Q.
const GAREN = {
	champion: garen,
	level: 9,
	ranks: { Q: 5, W: 1, E: 2, R: 1 },
	items: [item("1036")],
	target: DUMMY,
}

/** Grants that deal damage, as an effect's own hit or on each hit. */
const DAMAGE_GRANTS = new Set([
	"damage",
	"abilityDamage",
	"applyOnHit",
	"onAttackDamage",
	"bonusTrueDamage",
])

function dealsDamage({ grants }: Effect) {
	return grants.some(({ kind }) => DAMAGE_GRANTS.has(kind))
}

function procIds(views: ReturnType<typeof listViews>) {
	return views.flatMap((view, step) =>
		view.procs.map(({ effectId, time }) => ({ effectId, step, time })),
	)
}

describe("isSeparateInstance", () => {
	test("runes and items: the procs are their own hits, the on-hit and per-hit damage part of the hit", () => {
		const separate = [...RUNE_EFFECTS, ...ITEM_EFFECTS]
			.filter(dealsDamage)
			.filter(isSeparateInstance)
			.map(({ id }) => id)

		expect(separate.toSorted()).toEqual(
			[
				"electrocute",
				"press-the-attack",
				"summon-aery",
				"arcane-comet",
				"dark-harvest",
				"grasp-of-the-undying-proc",
				"kraken-slayer-bring-it-down",
				"guinsoos-rageblade-phantom-hit",
			].toSorted(),
		)
	})

	test("an ability's effect is part of its step, unless it lands after a delay or a state", () => {
		for (const effect of ABILITY_EFFECTS.filter(dealsDamage)) {
			expect(isSeparateInstance(effect)).toBe(
				!!(effect.delay || effect.startsAfter),
			)
		}
	})
})

describe("placeHit", () => {
	test("Arcane Comet belongs to Q, which triggered it, though it lands while the attack runs", () => {
		const { result, effects } = ANNIE_COMET
		const holder = result.steps.findIndex(({ events }) =>
			events.some(
				(event) =>
					event.kind === "hit" &&
					event.source.kind === "effect" &&
					event.source.effectId === "arcane-comet",
			),
		)
		const comet = result.steps[holder]?.events.find(
			(event) => event.kind === "hit" && event.source.kind === "effect",
		)
		if (comet?.kind !== "hit") throw new Error("the comet lands")

		expect(holder).toBe(2)
		expect(placeHit(comet, { holder, effects })).toEqual({
			step: 0,
			instance: "arcane-comet",
		})
	})

	test("the attack's own hits stay on its step, the comet's ticks-free damage on Q's", () => {
		const hits = timedHits(ANNIE_COMET.result, ANNIE_COMET)

		expect(
			hits.filter(({ step, instance }) => step === 2 && !instance),
		).toEqual([expect.objectContaining({ source: { kind: "attack" } })])
	})
})

describe("the List's cards (stepView on placed steps)", () => {
	test("Arcane Comet is a mini card under Q with its rune icon and land time; the attack shows only its own hit", () => {
		const [q, , attack] = listViews(ANNIE_COMET)
		const [comet] = q?.procs ?? []

		expect(q?.procs).toHaveLength(1)
		expect(comet?.name).toBe("Arcane Comet")
		expect(comet?.icon).toBe(rune("ArcaneComet").icon)
		expect(comet?.time).toBeCloseTo(0.8)
		expect(q?.hits.map(({ name }) => name)).toEqual(["Disintegrate"])
		expect(attack?.hits.map(({ name }) => name)).toEqual(["Attack"])
		expect(attack?.procs).toEqual([])
	})

	test("Q's card total still counts its comet", () => {
		const [q] = listViews(ANNIE_COMET)
		const own = q?.hits.reduce(
			(sum, hit) => sum + ("final" in hit ? hit.final : 0),
			0,
		)

		expect(q?.total.final).toBeCloseTo(
			(own ?? 0) + (q?.procs[0]?.total.final ?? 0),
		)
	})

	test("Electrocute strikes as a mini card under the attack that made its third hit", () => {
		const views = listViews(
			combo({ ...ANNIE, runes: [rune("Electrocute")] }, [
				cast("Q"),
				cast("W"),
				ATTACK,
			]),
		)

		expect(procIds(views)).toEqual([
			{ effectId: "electrocute", step: 2, time: expect.any(Number) },
		])
	})

	test("Vayne: the on-hit items stay lines of each attack, with their item icons", () => {
		const [first] = listViews(VAYNE)
		const lines = first?.hits.map(({ name, icon }) => ({ name, icon }))

		expect(lines).toEqual([
			{ name: "Attack", icon: undefined },
			{ name: "Wit's End (Fray)", icon: item("3091").icon },
			{
				name: "Blade of The Ruined King (Mist's Edge)",
				icon: item("3153").icon,
			},
			{ name: "Guinsoo's Rageblade (Wrath)", icon: item("3124").icon },
		])
		expect(first?.procs).toEqual([])
	})

	test("Vayne: the phantom hit is one mini card under the 7th attack, its on-hit damage inside", () => {
		const views = listViews(VAYNE)
		const phantoms = procIds(views).filter(
			({ effectId }) => effectId === "guinsoos-rageblade-phantom-hit",
		)
		const [phantom] = views[6]?.procs ?? []

		expect(phantoms.map(({ step }) => step)).toEqual([6, 9])
		expect(phantom?.name).toBe("Guinsoo's Rageblade (Phantom Hit)")
		expect(phantom?.hits.map(({ name }) => name)).toEqual([
			"Wit's End (Fray)",
			"Blade of The Ruined King (Mist's Edge)",
			"Guinsoo's Rageblade (Wrath)",
		])
		expect(views[7]?.hits.map(({ name }) => name)).not.toContain(
			"Guinsoo's Rageblade (Phantom Hit)",
		)
	})

	test("Vayne: Kraken Slayer's third hit is a mini card of its own, even when a phantom hit sets it off", () => {
		const krakens = procIds(listViews(VAYNE)).filter(
			({ effectId }) => effectId === "kraken-slayer-bring-it-down",
		)

		expect(krakens.map(({ step }) => step)).toEqual([2, 5, 7, 9])
	})

	test("Grasp of the Undying's proc is a mini card under the attack", () => {
		const views = listViews(
			combo({ ...GAREN, runes: [rune("GraspOfTheUndying")] }, [
				{ kind: "situation", effectId: "grasp-of-the-undying-proc" },
				ATTACK,
			]),
		)

		expect(procIds(views)).toEqual([
			{
				effectId: "grasp-of-the-undying-proc",
				step: 1,
				time: expect.any(Number),
			},
		])
	})

	test("Judgment's card shows Conqueror as its last spin left it, not as its cast did", () => {
		const garenConqueror = combo({ ...GAREN, runes: [rune("Conqueror")] }, [
			cast("Q"),
			cast("E"),
			{ kind: "wait", seconds: 3 },
			cast("R"),
		])
		const judgment = listViews(garenConqueror)[1]
		const atCast = garenConqueror.result.steps[1]?.active.find(
			({ effectId }) => effectId === "conqueror",
		)

		expect(atCast?.stacks).toBeLessThan(12)
		expect(judgment?.effects).toContainEqual(
			expect.objectContaining({
				name: "Conqueror",
				stacks: { count: 12, max: 12 },
			}),
		)
	})
})

describe("List, expanded combo and Timeline agree (issue 429)", () => {
	const COMBOS = { "Annie with Arcane Comet": ANNIE_COMET, Vayne: VAYNE }

	test.each(Object.entries(COMBOS))(
		"%s: the same procs under the same steps at the same times",
		(_, combination) => {
			const list = procIds(listViews(combination))
			const rows = combatRows(combination.result, {
				...combination,
				order: "step",
			}).flatMap(({ index, procs }) =>
				procs.map(({ effectId, time }) => ({ effectId, step: index, time })),
			)
			const timeline = combination.timeline.entries.flatMap((entry) =>
				entry.kind === "proc"
					? [{ effectId: entry.effectId, step: entry.index, time: entry.time }]
					: [],
			)
			const byStep = (a: { step: number; time: number }, b: typeof a) =>
				a.step - b.step || a.time - b.time

			expect(list.length).toBeGreaterThan(0)
			expect(rows.toSorted(byStep)).toEqual(list.toSorted(byStep))
			expect(timeline.toSorted(byStep)).toEqual(list.toSorted(byStep))
		},
	)

	test.each(Object.entries(COMBOS))(
		"%s: each view adds up to the combo's damage",
		(_, combination) => {
			const total = combination.result.total.final
			const list = listViews(combination).reduce(
				(sum, view) => sum + view.total.final,
				0,
			)
			const rows = combatRows(combination.result, {
				...combination,
				order: "hit",
			}).reduce(
				(sum, row) =>
					sum + row.damage + row.procs.reduce((all, p) => all + p.damage, 0),
				0,
			)
			const timeline = combination.timeline.entries.reduce(
				(sum, entry) => sum + (entry.kind === "marker" ? 0 : entry.damage),
				0,
			)

			expect(list).toBeCloseTo(total)
			expect(rows).toBeCloseTo(total)
			expect(timeline).toBeCloseTo(total)
		},
	)

	test("the Timeline names the phantom hit's card after its effect, not its first on-hit", () => {
		const names = VAYNE.timeline.entries.flatMap((entry) =>
			entry.kind === "proc" &&
			entry.effectId === "guinsoos-rageblade-phantom-hit"
				? [entry.name]
				: [],
		)

		expect(names).toEqual(["Phantom Hit", "Phantom Hit"])
	})

	test("the Timeline's bonuses on an attack are its on-hit items, once each", () => {
		const attack = VAYNE.timeline.entries.find(
			(entry) => entry.kind === "step" && entry.index === 6,
		)
		const labels =
			attack?.kind === "step" ? attack.bonuses.map(({ label }) => label) : []

		expect(labels).toEqual(["Fray", "Mist's Edge", "Wrath"])
	})
})
