import { describe, expect, test } from "bun:test"
import type { ComputedStats } from "../stats/compute-stats"
import { effectDamageType } from "./damage-type"

function stats(bonusAD: number, ap: number): ComputedStats {
	return {
		attackDamage: { base: 60, bonus: bonusAD, total: 60 + bonusAD },
		abilityPower: { base: 0, bonus: ap, total: ap },
	} as unknown as ComputedStats
}

// Electrocute's and Arcane Comet's ratios: 10% bonus AD, 5% AP.
const ratios = { bonusAttackDamage: 0.1, abilityPower: 0.05 }

describe("effectDamageType", () => {
	test("adaptive: physical with more bonus AD than AP, magic with more AP, else the champion's type (wiki)", () => {
		const of = (bonusAD: number, ap: number, adaptiveType: "ad" | "ap") =>
			effectDamageType("adaptive", {
				stats: stats(bonusAD, ap),
				ratios,
				adaptiveType,
			})

		expect(of(40, 30, "ap")).toBe("physical")
		expect(of(30, 40, "ad")).toBe("magic")
		expect(of(0, 0, "ad")).toBe("physical")
		expect(of(0, 0, "ap")).toBe("magic")
	})

	test("variable: physical only when the AD ratio adds more than the AP ratio, else magic (wiki)", () => {
		const of = (bonusAD: number, ap: number) =>
			effectDamageType("variable", {
				stats: stats(bonusAD, ap),
				ratios,
				adaptiveType: "ad",
			})

		// 40 bonus AD adds 4, 70 AP adds 3.5: physical, though AP is the larger stat.
		expect(of(40, 70)).toBe("physical")
		expect(of(40, 80)).toBe("magic")
		expect(of(0, 0)).toBe("magic")
	})

	test("a fixed type stays", () => {
		expect(
			effectDamageType("true", {
				stats: stats(100, 0),
				ratios,
				adaptiveType: "ad",
			}),
		).toBe("true")
	})
})
