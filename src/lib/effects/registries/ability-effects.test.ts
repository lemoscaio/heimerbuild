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
import { type EffectContext, resolveGrants } from "../evaluate"

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
