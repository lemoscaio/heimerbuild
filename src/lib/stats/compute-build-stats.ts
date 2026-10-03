import type { Champion } from "@schemas/champion"
import type { ShardStat } from "@schemas/rune"
import type { BuildEffect, EffectOverrides } from "../effects/effect"
import {
	activeEffects,
	alwaysOnRankStats,
	effectStatsInput,
} from "../effects/evaluate"
import {
	type ChampionInput,
	type ComputedStats,
	computeStats,
	type ItemInput,
} from "./compute-stats"
import { capMovementSpeed } from "./movement-speed"
import type { AbilityRanks } from "./rank-stats"
import { shardStatsInput } from "./rune-shards"

/** The effects the build can turn on, and the user's choices that differ from their defaults. */
export type BuildEffectsInput = {
	available: readonly BuildEffect[]
	overrides: EffectOverrides
}

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
	/** Conditional effects; absent means none, and every rank stat applies. */
	effects?: BuildEffectsInput
}

const NO_EFFECTS: BuildEffectsInput = { available: [], overrides: {} }

/**
 * A build's totals, in order: the champion at `level` in `form`; its items, stat shards and
 * ability ranks; the active effects; then the movement speed soft caps. Stat-dependent bonuses
 * (issue 266) go between the effects and the caps. Every "what if" is this call with one input changed.
 */
export function computeBuildStats({
	champion,
	level,
	form,
	items,
	shards,
	ranks,
	effects = NO_EFFECTS,
}: BuildStatsInput): ComputedStats {
	// Adaptive Force becomes AD or AP from the items, so the shards read them.
	const shardInput = shardStatsInput(shards, {
		level,
		defaultAdaptiveType: champion.adaptiveType,
		items,
	})
	const context = { level, ranks, rankStats: champion.rankStats }
	const active = activeEffects(effects.available, effects.overrides, context)
	const effectInput = effectStatsInput(active, context)
	const rankStats = alwaysOnRankStats(champion.rankStats, effects.available)
	const totals = computeStats(
		{ ...champion, rankStats },
		level,
		[...items, shardInput, effectInput],
		{ form, ranks },
	)
	return capMovementSpeed(totals)
}
