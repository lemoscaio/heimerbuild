import type { StatKey } from "@schemas/item"
import type { ShardStat } from "@schemas/rune"
import {
	type AdaptiveType,
	adaptiveForceStat,
	itemsAdaptiveType,
} from "./adaptive-force"
import type { ItemInput } from "./compute-stats"
import { MAX_LEVEL, MIN_LEVEL } from "./growth"

/** `min` at level 1, `max` at level 18, linear in between (Health Scaling: 10 per level). */
export function shardStatAtLevel(
	{ min, max }: Pick<ShardStat, "min" | "max">,
	level: number,
) {
	return min + ((max - min) * (level - MIN_LEVEL)) / (MAX_LEVEL - MIN_LEVEL)
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
	const adaptiveType = itemsAdaptiveType(defaultAdaptiveType, items)
	const stats: Partial<Record<StatKey, number>> = {}
	for (const shardStat of shards.flatMap((shard) => shard.stats)) {
		const value = shardStatAtLevel(shardStat, level)
		const { stat, value: amount } =
			shardStat.stat === "adaptiveForce"
				? adaptiveForceStat(value, adaptiveType)
				: { stat: shardStat.stat, value }
		stats[stat] = (stats[stat] ?? 0) + amount
	}
	return { stats }
}
