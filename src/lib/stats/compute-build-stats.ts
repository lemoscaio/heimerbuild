import type { Champion } from "@schemas/champion"
import type { ShardStat } from "@schemas/rune"
import {
	type ChampionInput,
	type ComputedStats,
	computeStats,
	type ItemInput,
} from "./compute-stats"
import type { AbilityRanks } from "./rank-stats"
import { shardStatsInput } from "./rune-shards"

export type BuildStatsInput = {
	champion: ChampionInput & Pick<Champion, "adaptiveType">
	level: number
	/** The selected form's id; absent or unknown means the default form. */
	form?: string
	items: readonly ItemInput[]
	/** The chosen stat shards; `[]` gives the stats without runes. */
	shards: readonly { stats: readonly ShardStat[] }[]
	/** The abilities' ranks, for the stats a rank grants. */
	ranks?: AbilityRanks
}

/**
 * A build's totals: the champion at `level` in `form`, plus its items, stat shards and ability ranks.
 * Every "what if" (an item preview, the other form, the next rank) is this call with one input changed.
 */
export function computeBuildStats({
	champion,
	level,
	form,
	items,
	shards,
	ranks,
}: BuildStatsInput): ComputedStats {
	// Adaptive Force becomes AD or AP from the items, so the shards read them.
	const shardInput = shardStatsInput(shards, {
		level,
		defaultAdaptiveType: champion.adaptiveType,
		items,
	})
	return computeStats(champion, level, [...items, shardInput], { form, ranks })
}
