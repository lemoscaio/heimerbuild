import { describe, expect, test } from "bun:test"
import type { Champion } from "@schemas/champion"
import teemoBin from "../../../../scripts/sync-data/fixtures/champions/Teemo.bin.json"
import teemoDetail from "../../../../scripts/sync-data/fixtures/champions/Teemo.json"
import { normalizeChampion } from "../../../../scripts/sync-data/normalize-champions"
import { computeBuildStats } from "../../stats/compute-build-stats"
import { softCapMovementSpeed } from "../../stats/movement-speed"
import { availableEffects } from "../available-effects"
import { resolveGrants } from "../evaluate"

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
