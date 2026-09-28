import type { ChampionStats } from "../../../scripts/sync-data/schemas/champion"
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
