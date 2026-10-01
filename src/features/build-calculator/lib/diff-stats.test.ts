import { describe, expect, test } from "bun:test"
import type { ComputedStats } from "@/lib/stats/compute-stats"
import { diffStats, statDeltas } from "./diff-stats"

function stats(totals: Record<string, number>) {
	return Object.fromEntries(
		Object.entries(totals).map(([stat, total]) => [
			stat,
			{ base: 0, bonus: total, total },
		]),
	) as unknown as ComputedStats
}

describe("diffStats", () => {
	test("lists only the stats whose total changes, with the new total", () => {
		expect(
			diffStats(
				stats({ abilityPower: 240, armor: 55.9, magicPenetrationPercent: 0 }),
				stats({ abilityPower: 335, armor: 55.9, magicPenetrationPercent: 0.4 }),
			),
		).toEqual({ abilityPower: 335, magicPenetrationPercent: 0.4 })
	})

	test("ignores float noise below display precision", () => {
		expect(
			diffStats(stats({ health: 0.1 + 0.2 }), stats({ health: 0.3 })),
		).toEqual({})
	})

	test("keeps a decrease", () => {
		expect(
			diffStats(stats({ movementSpeed: 385 }), stats({ movementSpeed: 380 })),
		).toEqual({ movementSpeed: 380 })
	})
})

describe("statDeltas", () => {
	test("lists each changed stat as current minus other, signed", () => {
		expect(
			statDeltas(
				stats({ health: 640, armor: 36, attackRange: 175, mana: 100 }),
				stats({ health: 540, armor: 32, attackRange: 400, mana: 100 }),
			),
		).toEqual({ health: 100, armor: 4, attackRange: -225 })
	})

	test("ignores float noise below display precision", () => {
		expect(
			statDeltas(stats({ health: 0.1 + 0.2 }), stats({ health: 0.3 })),
		).toEqual({})
	})
})
