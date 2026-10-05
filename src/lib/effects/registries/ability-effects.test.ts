import { describe, expect, test } from "bun:test"
import {
	type AbilitySlot,
	type Champion,
	championSchema,
} from "@schemas/champion"
import teemoBin from "../../../../scripts/sync-data/fixtures/champions/Teemo.bin.json"
import teemoDetail from "../../../../scripts/sync-data/fixtures/champions/Teemo.json"
import { normalizeChampion } from "../../../../scripts/sync-data/normalize-champions"
import { computeBuildStats } from "../../stats/compute-build-stats"
import type { ComputedStats, StatName } from "../../stats/compute-stats"
import { softCapMovementSpeed } from "../../stats/movement-speed"
import { availableEffects } from "../available-effects"
import { type EffectContext, effectDuration, resolveGrants } from "../evaluate"
import { ABILITY_EFFECTS } from "./ability-effects"

const PATCH = "16.19.1"

// Real 16.19.1 pipeline output for Teemo, rank stats included.
const teemo: Champion = normalizeChampion(teemoDetail, teemoBin, "16.19.1")
const BOOTS = { stats: { movementSpeedFlat: 25 } }

function ranksWithW(W: number) {
	return { Q: 1, W, E: 1, R: 0 }
}

function teemoEffects(W: number) {
	return availableEffects({
		patch: PATCH,
		champion: teemo,
		ranks: ranksWithW(W),
		spells: [],
		runes: [],
	})
}

function speedOf(id: string, W: number) {
	const effect = teemoEffects(W).find((entry) => entry.id === id)
	if (!effect) throw new Error(`${id} is not available at W rank ${W}`)
	const [grant] = resolveGrants(effect, {
		level: 18,
		ranks: ranksWithW(W),
		rankStats: teemo.rankStats,
	})
	return grant?.value
}

describe("Teemo's Move Quick", () => {
	test("the passive gives 12 / 16 / 20 / 24 / 28% movement speed (wiki)", () => {
		expect([1, 2, 3, 4, 5].map((W) => speedOf("teemo-w-passive", W))).toEqual([
			0.12, 0.16, 0.2, 0.24, 0.28,
		])
	})

	test("the active doubles it: 24 / 32 / 40 / 48 / 56% (wiki and the synced tooltip)", () => {
		const active = [1, 2, 3, 4, 5].map((W) => speedOf("teemo-w-active", W))
		const tooltip = teemo.abilities.spells
			.find(({ slot }) => slot === "W")
			?.rankValues.find(({ label }) => label === "Active Move Speed")
			?.values.map((value) => value / 100)

		expect(active).toEqual([0.24, 0.32, 0.4, 0.48, 0.56])
		expect(active).toEqual(tooltip ?? [])
	})

	test("is available once W has a point", () => {
		expect(teemoEffects(0)).toEqual([])
		expect(teemoEffects(1).map(({ id }) => id)).toEqual([
			"teemo-w-passive",
			"teemo-w-active",
		])
	})

	test("on by default, the passive keeps today's totals at every rank", () => {
		for (const W of [1, 2, 3, 4, 5]) {
			for (const items of [[], [BOOTS]]) {
				const build = {
					champion: teemo,
					patch: PATCH,
					level: 11,
					items,
					shards: [],
					ranks: ranksWithW(W),
				}
				expect(
					computeBuildStats({
						...build,
						effects: { available: teemoEffects(W), overrides: {} },
					}),
				).toEqual(computeBuildStats(build))
			}
		}
	})

	test("turning the passive off takes its speed away; the active doubles it", () => {
		const build = {
			champion: teemo,
			patch: PATCH,
			level: 11,
			items: [],
			shards: [],
			ranks: ranksWithW(5),
		}
		const speed = (overrides: Record<string, boolean>) =>
			computeBuildStats({
				...build,
				effects: { available: teemoEffects(5), overrides },
			}).movementSpeed.total
		const base = teemo.stats.movementSpeed.base

		expect(speed({ "teemo-w-passive": false })).toBe(base)
		expect(speed({})).toBeCloseTo(softCapMovementSpeed(base * 1.28, PATCH))
		const doubled = softCapMovementSpeed(base * 1.56, PATCH)
		expect(speed({ "teemo-w-active": true })).toBeCloseTo(doubled)
		expect(
			speed({ "teemo-w-passive": false, "teemo-w-active": true }),
		).toBeCloseTo(doubled)
	})
})

/** A champion as the current patch's data serves it (public/data). */
async function currentChampion(key: string): Promise<Champion> {
	const { currentPatch } = await Bun.file(
		new URL("../../../../public/data/manifest.json", import.meta.url),
	).json()
	return championSchema.parse(
		await Bun.file(
			new URL(
				`../../../../public/data/${currentPatch}/champions/${key}.json`,
				import.meta.url,
			),
		).json(),
	)
}

function ranksWith(slot: AbilitySlot, rank: number) {
	return { Q: 0, W: 0, E: 0, R: 0, [slot]: rank }
}

function effectsOf(champion: Champion, slot: AbilitySlot, rank: number) {
	return availableEffects({
		patch: PATCH,
		champion,
		ranks: ranksWith(slot, rank),
		spells: [],
		runes: [],
	})
}

/** The effect's grants per rank 1 to 5, reading `totals` and `currentHealth`. */
function grantsPerRank(
	champion: Champion,
	{ id, slot }: { id: string; slot: AbilitySlot },
	context: Pick<EffectContext, "totals" | "currentHealth"> = {},
) {
	return [1, 2, 3, 4, 5].map((rank) => {
		const effect = effectsOf(champion, slot, rank).find(
			(entry) => entry.id === id,
		)
		if (!effect) throw new Error(`${id} is not available at rank ${rank}`)
		return resolveGrants(effect, {
			level: 18,
			ranks: ranksWith(slot, rank),
			rankStats: champion.rankStats,
			...context,
		})
	})
}

function totalsWith(stats: Partial<Record<StatName, number>>) {
	return Object.fromEntries(
		Object.entries(stats).map(([stat, total]) => [
			stat,
			{ base: total, bonus: 0, total },
		]),
	) as unknown as ComputedStats
}

/** Rid of floating point noise: 7.000000000000001 reads 7. */
function rounded(value: number | undefined) {
	return value === undefined ? undefined : Math.round(value * 10_000) / 10_000
}

const HUNDRED = totalsWith({ armor: 100, health: 100, abilityPower: 100 })

describe("passives that read another stat (wiki, current patch data)", () => {
	test("Malphite's Thunderclap: 10 / 15 / 20 / 25 / 30% of armor as bonus armor", async () => {
		const malphite = await currentChampion("Malphite")
		const grants = grantsPerRank(
			malphite,
			{ id: "malphite-w-passive", slot: "W" },
			{ totals: HUNDRED },
		)

		expect(
			grants.map(([grant]) => grant?.kind === "stat" && grant.stat),
		).toEqual(Array(5).fill("armor"))
		expect(grants.map(([grant]) => rounded(grant?.value))).toEqual([
			10, 15, 20, 25, 30,
		])
	})

	test("Taric's Bastion: 6 / 7 / 8 / 9 / 10% of armor as bonus armor", async () => {
		const taric = await currentChampion("Taric")
		const grants = grantsPerRank(
			taric,
			{ id: "taric-w-passive", slot: "W" },
			{ totals: HUNDRED },
		)

		expect(grants.map(([grant]) => rounded(grant?.value))).toEqual([
			6, 7, 8, 9, 10,
		])
	})

	test("Dr. Mundo's Blunt Force Trauma: 2% to 3.2% of maximum health as bonus AD", async () => {
		const mundo = await currentChampion("DrMundo")
		const grants = grantsPerRank(
			mundo,
			{ id: "dr-mundo-e-passive", slot: "E" },
			{ totals: totalsWith({ health: 1000 }) },
		)

		expect(
			grants.map(([grant]) => grant?.kind === "stat" && grant.stat),
		).toEqual(Array(5).fill("attackDamage"))
		expect(grants.map(([grant]) => rounded(grant?.value))).toEqual([
			20, 23, 26, 29, 32,
		])
	})

	test("Janna's Zephyr: 6% to 10% movement speed, plus 2% per 100 AP", async () => {
		const janna = await currentChampion("Janna")
		const grants = grantsPerRank(
			janna,
			{ id: "janna-w-passive", slot: "W" },
			{ totals: totalsWith({ abilityPower: 300 }) },
		)

		expect(
			grants.map((rank) => rank.map(({ value }) => rounded(value))),
		).toEqual([
			[0.06, 0.06],
			[0.07, 0.06],
			[0.08, 0.06],
			[0.09, 0.06],
			[0.1, 0.06],
		])
	})

	test("Janna's rank part keeps today's totals; AP adds its part", async () => {
		const janna = await currentChampion("Janna")
		const build = {
			champion: janna,
			patch: PATCH,
			level: 9,
			items: [],
			shards: [],
			ranks: ranksWith("W", 5),
		}
		const effects = { available: effectsOf(janna, "W", 5), overrides: {} }
		const tome = { stats: { abilityPower: 100 } }

		expect(computeBuildStats({ ...build, effects })).toEqual(
			computeBuildStats(build),
		)
		expect(
			computeBuildStats({ ...build, items: [tome], effects }).movementSpeed
				.total,
		).toBeCloseTo(janna.stats.movementSpeed.base * (1 + 0.1 + 0.02))
	})
})

describe("Tryndamere's Bloodlust (wiki, current patch data)", () => {
	test("gives no AD at full health", async () => {
		const tryndamere = await currentChampion("Tryndamere")
		const grants = grantsPerRank(tryndamere, {
			id: "tryndamere-q-passive",
			slot: "Q",
		})

		expect(grants.map(([grant]) => rounded(grant?.value))).toEqual(
			Array(5).fill(0),
		)
	})

	test("reaches 20 / 35 / 50 / 65 / 80 bonus AD at 90% missing health, and stays there", async () => {
		const tryndamere = await currentChampion("Tryndamere")
		const at = (currentHealth: number) =>
			grantsPerRank(
				tryndamere,
				{ id: "tryndamere-q-passive", slot: "Q" },
				{ currentHealth },
			).map(([grant]) => rounded(grant?.value))

		expect(at(10)).toEqual([20, 35, 50, 65, 80])
		expect(at(1)).toEqual([20, 35, 50, 65, 80])
		// 80 / 90 AD per 1% missing health at rank 5.
		expect(at(55)[4]).toBeCloseTo(40)
	})
})

type FormBuild = {
	form?: string
	level: number
	ranks: Record<AbilitySlot, number>
	items?: { stats: Record<string, number> }[]
	overrides?: Record<string, boolean>
}

/** The totals of a build of `champion` with its form effects available, as the build page computes them. */
function formTotals(
	champion: Champion,
	{ form, level, ranks, items = [], overrides = {} }: FormBuild,
) {
	const available = availableEffects({
		patch: PATCH,
		champion,
		ranks,
		spells: [],
		runes: [],
	})
	return computeBuildStats({
		champion,
		patch: PATCH,
		level,
		form,
		items,
		shards: [],
		ranks,
		effects: { available, overrides },
	})
}

const LONG_SWORDS = { stats: { attackDamage: 40 } }

describe("Jayce's Hammer Stance (wiki, current patch data)", () => {
	const ranks = { Q: 1, W: 1, E: 1, R: 1 }

	test("adds 5 / 12 / 19 / 26 armor and magic resist from levels 1 / 6 / 11 / 16, only as Hammer", async () => {
		const jayce = await currentChampion("Jayce")
		const bonus = (level: number) => {
			const hammer = formTotals(jayce, { level, ranks })
			const cannon = formTotals(jayce, { form: "cannon", level, ranks })
			return [
				rounded(hammer.armor.total - cannon.armor.total),
				rounded(hammer.magicResist.total - cannon.magicResist.total),
			]
		}

		expect([1, 5, 6, 11, 16, 18].map(bonus)).toEqual([
			[5, 5],
			[5, 5],
			[12, 12],
			[19, 19],
			[26, 26],
			[26, 26],
		])
		expect(
			formTotals(jayce, { form: "cannon", level: 1, ranks }).armor,
		).toEqual({ base: 22, bonus: 0, total: 22 })
	})

	test("adds 7.5% of bonus AD to both", async () => {
		const jayce = await currentChampion("Jayce")
		const hammer = formTotals(jayce, { level: 6, ranks, items: [LONG_SWORDS] })

		expect(rounded(hammer.armor.bonus)).toBe(12 + 3)
		expect(rounded(hammer.magicResist.bonus)).toBe(12 + 3)
	})
})

describe("Shyvana's Dragon Form (synced R lines)", () => {
	const withR = (R: number) => ({ Q: 1, W: 1, E: 1, R })

	test("adds 150 / 250 / 350 health and 25 / 50 / 75 range by R rank", async () => {
		const shyvana = await currentChampion("Shyvana")
		const human = formTotals(shyvana, { level: 16, ranks: withR(1) })

		expect(
			[1, 2, 3].map((R) => {
				const dragon = formTotals(shyvana, {
					form: "dragon",
					level: 16,
					ranks: withR(R),
				})
				return [
					rounded(dragon.health.total - human.health.total),
					dragon.attackRange.total,
				]
			}),
		).toEqual([
			[150, 175],
			[250, 200],
			[350, 225],
		])
	})

	test("is locked until R has a point: the stats stay human", async () => {
		const shyvana = await currentChampion("Shyvana")
		const level5 = { level: 5, ranks: withR(0) }

		expect(formTotals(shyvana, { ...level5, form: "dragon" })).toEqual(
			formTotals(shyvana, level5),
		)
	})
})

describe("Jinx's Switcheroo! (synced Q lines, wiki)", () => {
	const withQ = (Q: number) => ({ Q, W: 1, E: 1, R: 0 })
	const DAGGER = { stats: { attackSpeedPercent: 0.35 } }

	test("Rockets add 100 to 200 range by Q rank and keep 90% of the bonus attack speed", async () => {
		const jinx = await currentChampion("Jinx")
		const rockets = (Q: number) =>
			formTotals(jinx, {
				form: "rockets",
				level: 9,
				ranks: withQ(Q),
				items: [DAGGER],
			})
		const minigun = formTotals(jinx, {
			level: 9,
			ranks: withQ(1),
			items: [DAGGER],
		})

		expect([1, 2, 3, 4, 5].map((Q) => rockets(Q).attackRange.total)).toEqual([
			625, 650, 675, 700, 725,
		])
		expect(rockets(1).attackSpeed.bonus).toBeCloseTo(
			minigun.attackSpeed.bonus * 0.9,
		)
	})

	test("Rev'd up is off by default; on, it adds 30% to 130% bonus attack speed with the Minigun only", async () => {
		const jinx = await currentChampion("Jinx")
		const revdUp = { "jinx-q-revd-up": true }
		const at = (Q: number, form?: string, overrides = {}) =>
			formTotals(jinx, { form, level: 1, ranks: withQ(Q), overrides })
				.attackSpeed.total

		expect(at(1)).toBe(jinx.stats.attackSpeed.base)
		expect([1, 3, 5].map((Q) => rounded(at(Q, undefined, revdUp)))).toEqual(
			[0.3, 0.8, 1.3].map((bonus) =>
				rounded(jinx.stats.attackSpeed.base + 0.625 * bonus),
			),
		)
		expect(at(5, "rockets", revdUp)).toBe(at(5, "rockets"))
	})
})

describe("Bel'Veth's True Form (synced R lines, wiki ratios)", () => {
	const withR = (R: number) => ({ Q: 1, W: 1, E: 1, R })
	const ITEMS = [LONG_SWORDS, { stats: { abilityPower: 20 } }]

	test("adds 100 / 250 / 400 health plus 150% bonus AD and AP, and 25 / 75 / 125 range", async () => {
		const belveth = await currentChampion("Belveth")
		const base = formTotals(belveth, {
			level: 18,
			ranks: withR(1),
			items: ITEMS,
		})

		expect(
			[1, 2, 3].map((R) => {
				const trueForm = formTotals(belveth, {
					form: "true-form",
					level: 18,
					ranks: withR(R),
					items: ITEMS,
				})
				return [
					rounded(trueForm.health.total - base.health.total),
					trueForm.attackRange.total,
				]
			}),
		).toEqual([
			[100 + 60 + 30, 175],
			[250 + 60 + 30, 225],
			[400 + 60 + 30, 275],
		])
	})

	test("raises the total attack speed by 6 / 13 / 20%", async () => {
		const belveth = await currentChampion("Belveth")
		const base = formTotals(belveth, { level: 11, ranks: withR(1) })

		expect(
			[1, 2, 3].map((R) =>
				rounded(
					formTotals(belveth, {
						form: "true-form",
						level: 11,
						ranks: withR(R),
					}).attackSpeed.total / base.attackSpeed.total,
				),
			),
		).toEqual([1.06, 1.13, 1.2])
	})
})

/** An effect of `champion` with only `slot` ranked, at each of `ranks`: its rounded grant values and duration. */
function atRanks(
	champion: Champion,
	{ id, slot, ranks }: { id: string; slot: AbilitySlot; ranks: number[] },
	context: Pick<EffectContext, "totals"> = {},
) {
	return ranks.map((rank) => {
		const effect = effectsOf(champion, slot, rank).find(
			(entry) => entry.id === id,
		)
		if (!effect) throw new Error(`${id} is not available at rank ${rank}`)
		const at = {
			level: 18,
			ranks: ranksWith(slot, rank),
			...context,
		}
		return {
			values: resolveGrants(effect, at).map(({ value }) => rounded(value)),
			duration: effectDuration(effect, at),
		}
	})
}

const SIX_RANKS = [1, 2, 3, 4, 5, 6]
const ULTIMATE_RANKS = [1, 2, 3]
/** 100 bonus AD, 100 AP and 1000 health, which the ratios read. */
const RATIO_TOTALS = {
	...totalsWith({ abilityPower: 100, health: 1000 }),
	attackDamage: { base: 60, bonus: 100, total: 160 },
}

describe("Udyr's stances (synced lines, wiki ratios)", () => {
	test("Wilding Claw: 20 / 32 / 44 / 56 / 68 / 80% attack speed for 4 s", async () => {
		const udyr = await currentChampion("Udyr")

		expect(
			atRanks(udyr, { id: "udyr-q-active", slot: "Q", ranks: SIX_RANKS }),
		).toEqual(
			[0.2, 0.32, 0.44, 0.56, 0.68, 0.8].map((value) => ({
				values: [value],
				duration: 4,
			})),
		)
	})

	test("Iron Mantle: a 45 to 145 shield (+50% bonus AD, 40% AP, 2 to 3.5% max health) and 15 to 20% life steal", async () => {
		const udyr = await currentChampion("Udyr")
		const ranks = atRanks(
			udyr,
			{ id: "udyr-w-active", slot: "W", ranks: SIX_RANKS },
			{ totals: RATIO_TOTALS },
		)

		expect(ranks.map(({ values }) => values)).toEqual([
			[45, 50, 40, 20, 0.15],
			[65, 50, 40, 23, 0.16],
			[85, 50, 40, 26, 0.17],
			[105, 50, 40, 29, 0.18],
			[125, 50, 40, 32, 0.19],
			[145, 50, 40, 35, 0.2],
		])
		expect(ranks.every(({ duration }) => duration === 4)).toBe(true)
	})

	test("Blazing Stampede: 25 to 55% movement speed, plus 5% per 100 bonus AD", async () => {
		const udyr = await currentChampion("Udyr")

		expect(
			atRanks(
				udyr,
				{ id: "udyr-e-active", slot: "E", ranks: SIX_RANKS },
				{ totals: RATIO_TOTALS },
			).map(({ values }) => values),
		).toEqual(
			[0.25, 0.31, 0.37, 0.43, 0.49, 0.55].map((value) => [value, 0.05]),
		)
	})

	test("are off by default; on, the stance buffs add up", async () => {
		const udyr = await currentChampion("Udyr")
		const ranks = { Q: 1, W: 1, E: 1, R: 0 }
		const stats = (overrides: Record<string, boolean> = {}) =>
			formTotals(udyr, { level: 3, ranks, overrides })
		const base = computeBuildStats({
			champion: udyr,
			patch: PATCH,
			level: 3,
			items: [],
			shards: [],
			ranks,
		})
		const both = stats({ "udyr-q-active": true, "udyr-e-active": true })

		expect(stats()).toEqual(base)
		expect(both.attackSpeed.bonus).toBeCloseTo(
			base.attackSpeed.bonus + 0.2 * 0.65,
		)
		expect(both.movementSpeed.total).toBeCloseTo(
			softCapMovementSpeed(350 * 1.25, PATCH),
		)
	})
})

describe("Viego's Harrowed Path (synced E lines, wiki)", () => {
	test("in the mist: 30 to 50% attack speed and 25 to 35% movement speed (+4% per 100 AP) for 8 s", async () => {
		const viego = await currentChampion("Viego")

		expect(
			atRanks(
				viego,
				{ id: "viego-e-active", slot: "E", ranks: [1, 2, 3, 4, 5] },
				{ totals: RATIO_TOTALS },
			),
		).toEqual([
			{ values: [0.3, 0.25, 0.04], duration: 8 },
			{ values: [0.35, 0.275, 0.04], duration: 8 },
			{ values: [0.4, 0.3, 0.04], duration: 8 },
			{ values: [0.45, 0.325, 0.04], duration: 8 },
			{ values: [0.5, 0.35, 0.04], duration: 8 },
		])
	})
})

describe("Rengar's Thrill of the Hunt (synced R lines)", () => {
	test("40 / 50 / 60% movement speed for 12 / 16 / 20 s", async () => {
		const rengar = await currentChampion("Rengar")

		expect(
			atRanks(rengar, {
				id: "rengar-r-active",
				slot: "R",
				ranks: ULTIMATE_RANKS,
			}),
		).toEqual([
			{ values: [0.4], duration: 12 },
			{ values: [0.5], duration: 16 },
			{ values: [0.6], duration: 20 },
		])
	})
})

describe("Mini Gnar's Hop and Hyper (synced lines, wiki)", () => {
	const ranks = (R: number) => ({ Q: 1, W: 1, E: 1, R })
	const speed = (
		gnar: Champion,
		R: number,
		overrides: Record<string, boolean>,
	) =>
		formTotals(gnar, { level: 11, ranks: ranks(R), overrides }).movementSpeed
			.total

	test("Hop: 40 to 60% attack speed for 6 s", async () => {
		const gnar = await currentChampion("Gnar")

		expect(
			atRanks(gnar, { id: "gnar-e-active", slot: "E", ranks: [1, 2, 3, 4, 5] }),
		).toEqual(
			[0.4, 0.45, 0.5, 0.55, 0.6].map((value) => ({
				values: [value],
				duration: 6,
			})),
		)
	})

	test("Hop's attack speed holds only as Mini Gnar", async () => {
		const gnar = await currentChampion("Gnar")
		const hop = { "gnar-e-active": true }
		const attackSpeed = (form: string | undefined, overrides = {}) =>
			formTotals(gnar, { form, level: 11, ranks: ranks(1), overrides })
				.attackSpeed.total

		expect(attackSpeed(undefined, hop)).toBeGreaterThan(attackSpeed(undefined))
		expect(attackSpeed("mega", hop)).toBe(attackSpeed("mega"))
	})

	test("Hyper: 20% movement speed after 3 hits at R 0, GNAR!'s 40 / 60 / 80% at R 1 / 2 / 3, off by default", async () => {
		const gnar = await currentChampion("Gnar")
		const hyper = { "gnar-w-hyper": true }
		const expected = (bonus: number) =>
			softCapMovementSpeed(335 * (1 + bonus), PATCH)

		expect(speed(gnar, 0, {})).toBe(335)
		expect([0, 1, 2, 3].map((R) => rounded(speed(gnar, R, hyper)))).toEqual(
			[0.2, 0.4, 0.6, 0.8].map((bonus) => rounded(expected(bonus))),
		)
	})

	test("Hyper is one effect, in W, that names GNAR! as its boost", async () => {
		const gnar = await currentChampion("Gnar")
		const effects = availableEffects({
			patch: PATCH,
			champion: gnar,
			ranks: ranks(2),
			spells: [],
			runes: [],
		})
		const hyper = effects.find(({ id }) => id === "gnar-w-hyper")

		expect(effects.filter(({ slot }) => slot === "R")).toEqual([])
		expect(hyper?.slot).toBe("W")
		expect(hyper?.boosts?.R?.name).toBe("GNAR!")
	})
})

describe("form-bound effects", () => {
	test("each names a form its champion has in the current patch data", async () => {
		const bound = ABILITY_EFFECTS.filter((effect) => effect.form)

		for (const { id, form, source } of bound) {
			if (source.kind !== "ability") throw new Error(`${id} is not an ability`)
			const champion = await currentChampion(source.championKey)
			expect(champion.forms?.map((entry) => entry.id)).toContain(form)
		}
		expect(bound.length).toBeGreaterThan(0)
	})
})
