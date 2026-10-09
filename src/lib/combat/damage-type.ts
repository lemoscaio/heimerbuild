import type { DamageType } from "@schemas/champion"
import type { DamageRatios, EffectDamageType } from "../effects/effect"
import { type AdaptiveType, resolveAdaptiveType } from "../stats/adaptive-force"
import type { ComputedStats } from "../stats/compute-stats"

const ADAPTIVE_DAMAGE = {
	ad: "physical",
	ap: "magic",
} as const satisfies Record<AdaptiveType, DamageType>

export type DamageTypeInput = {
	/** The attacker's stats as the hit lands. */
	stats: ComputedStats
	/** The damage's ratios, which a `variable` type compares. */
	ratios: DamageRatios
	/** The champion's own adaptive type, which an `adaptive` tie falls back to. */
	adaptiveType: AdaptiveType
}

/** What an effect's damage type deals at the hit (`EffectDamageType`); a fixed one stays. */
export function effectDamageType(
	type: EffectDamageType,
	{ stats, ratios, adaptiveType }: DamageTypeInput,
): DamageType {
	switch (type) {
		case "adaptive": {
			const bonus = {
				attackDamage: stats.attackDamage.bonus,
				abilityPower: stats.abilityPower.total,
			}
			return ADAPTIVE_DAMAGE[resolveAdaptiveType(adaptiveType, bonus)]
		}
		case "variable": {
			const { baseAttackDamage = 0, bonusAttackDamage = 0 } = ratios
			const attackDamage =
				baseAttackDamage * stats.attackDamage.base +
				bonusAttackDamage * stats.attackDamage.bonus
			const abilityPower = (ratios.abilityPower ?? 0) * stats.abilityPower.total
			return attackDamage > abilityPower ? "physical" : "magic"
		}
		default:
			return type
	}
}
