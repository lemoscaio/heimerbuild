import type { ChampionStats } from "@schemas/champion"
import type { StatBreakdown } from "./compute-stats"
import { growthMultiplier } from "./growth"

/**
 * Level and item bonuses are summed once, then scaled by the ratio (issue 20).
 * `bonus` is a fraction: 0.25 means +25% attack speed.
 */
export function attackSpeedAtLevel(
	{ base, perLevelPercent, ratio }: ChampionStats["attackSpeed"],
	level: number,
	bonus: number,
): number {
	const levelBonus = (perLevelPercent / 100) * growthMultiplier(level)
	return base + ratio * (levelBonus + bonus)
}

/** Fractions that scale attack speed after every bonus: `bonus` scales the bonus part, then `total` the whole. */
export type AttackSpeedMultipliers = { bonus: number; total: number }

/**
 * Jinx's Rockets keep 90% of her bonus attack speed (`bonus: -0.1`); Bel'Veth's True Form adds 20%
 * to her total (`total: 0.2`). The bonus part is the level growth and every bonus, already scaled by the ratio.
 */
export function multiplyAttackSpeed(
	attackSpeed: StatBreakdown,
	multipliers: AttackSpeedMultipliers,
): StatBreakdown {
	if (!multipliers.bonus && !multipliers.total) return attackSpeed
	const { base, total } = attackSpeed
	const bonus = (total - base) * (1 + multipliers.bonus)
	const multiplied = (base + bonus) * (1 + multipliers.total)
	return { base, bonus: multiplied - base, total: multiplied }
}
