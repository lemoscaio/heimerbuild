import type { Champion } from "../../../scripts/sync-data/schemas/champion"
import type { StatKey } from "../../../scripts/sync-data/schemas/item"
import type { ShardStat } from "../../../scripts/sync-data/schemas/rune"
import type { ItemInput } from "./compute-stats"
import { MAX_LEVEL, MIN_LEVEL } from "./growth"

export type AdaptiveType = Champion["adaptiveType"]

/**
 * What one point of Adaptive Force gives: 0.6 bonus attack damage or 1 ability power.
 * Not in the game data; source: League of Legends Wiki, "Adaptive force".
 */
export const ADAPTIVE_FORCE_CONVERSION = {
	ad: { stat: "attackDamage", ratio: 0.6 },
	ap: { stat: "abilityPower", ratio: 1 },
} as const satisfies Record<AdaptiveType, { stat: StatKey; ratio: number }>

/** `min` at level 1, `max` at level 18, linear in between (Health Scaling: 10 per level). */
export function shardStatAtLevel(
	{ min, max }: Pick<ShardStat, "min" | "max">,
	level: number,
) {
	return min + ((max - min) * (level - MIN_LEVEL)) / (MAX_LEVEL - MIN_LEVEL)
}

/** AP when bonus AP is higher, AD when bonus AD is higher, the champion's default on a tie. */
export function resolveAdaptiveType(
	defaultType: AdaptiveType,
	bonus: { attackDamage: number; abilityPower: number },
): AdaptiveType {
	if (bonus.abilityPower > bonus.attackDamage) return "ap"
	if (bonus.attackDamage > bonus.abilityPower) return "ad"
	return defaultType
}

type ShardStatsOptions = {
	level: number
	/** The champion's `adaptiveType`, used when the items give as much AD as AP. */
	defaultAdaptiveType: AdaptiveType
	/** The build's items: their bonus AD and AP decide what Adaptive Force becomes. */
	items: readonly ItemInput[]
}

/** The chosen stat shards as one more stat source for `computeStats`, next to the items. */
export function shardStatsInput(
	shards: readonly { stats: readonly ShardStat[] }[],
	{ level, defaultAdaptiveType, items }: ShardStatsOptions,
): ItemInput {
	const bonus = { attackDamage: 0, abilityPower: 0 }
	for (const { stats } of items) {
		bonus.attackDamage += stats.attackDamage ?? 0
		bonus.abilityPower += stats.abilityPower ?? 0
	}
	const adaptive =
		ADAPTIVE_FORCE_CONVERSION[resolveAdaptiveType(defaultAdaptiveType, bonus)]

	const stats: Partial<Record<StatKey, number>> = {}
	for (const shardStat of shards.flatMap((shard) => shard.stats)) {
		const value = shardStatAtLevel(shardStat, level)
		const [stat, amount] =
			shardStat.stat === "adaptiveForce"
				? [adaptive.stat, value * adaptive.ratio]
				: [shardStat.stat, value]
		stats[stat] = (stats[stat] ?? 0) + amount
	}
	return { stats }
}
