import type { Champion } from "@schemas/champion"
import type { ShardStat } from "@schemas/rune"
import type { BuildEffect, EffectOverrides } from "../effects/effect"
import {
	activeEffects,
	alwaysOnRankStats,
	type EffectContext,
	effectStatsInput,
} from "../effects/evaluate"
import { itemsAdaptiveType } from "./adaptive-force"
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
	/** The build's patch ("16.19.1"): the rules in force on it apply (the movement speed soft caps). */
	patch: string
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
	/** Percent of maximum health the champion is at (1 to 100), which some effects read; absent means full. */
	currentHealth?: number
	/** Whole minutes into the game, which some effects read; absent means its start. */
	gameTime?: number
}

const NO_EFFECTS: BuildEffectsInput = { available: [], overrides: {} }

function evaluateBuild({
	champion,
	patch,
	level,
	form,
	items,
	shards,
	ranks,
	effects = NO_EFFECTS,
	currentHealth,
	gameTime,
}: BuildStatsInput) {
	// Adaptive Force becomes AD or AP from the items, so the shards and effects read them.
	const shardInput = shardStatsInput(shards, {
		level,
		defaultAdaptiveType: champion.adaptiveType,
		items,
	})
	const context: EffectContext = {
		level,
		ranks,
		rankStats: champion.rankStats,
		currentHealth,
		gameTime,
		adaptiveType: itemsAdaptiveType(champion.adaptiveType, items),
	}
	const active = activeEffects(effects.available, effects.overrides, context)
	const rankStats = alwaysOnRankStats(champion.rankStats, effects.available)
	const sources = [...items, shardInput, effectStatsInput(active, context)]
	const totalsWith = (more: readonly ItemInput[]) =>
		computeStats({ ...champion, rankStats }, level, [...sources, ...more], {
			form,
			ranks,
		})
	const beforeStatBonuses = totalsWith([])
	// Reading the totals from before this step means no bonus feeds another, or itself.
	const statBonuses = effectStatsInput(
		active,
		{ ...context, totals: beforeStatBonuses },
		{ step: "stat-dependent" },
	)
	const hasStatBonuses = Object.keys(statBonuses.stats).length > 0
	return {
		beforeStatBonuses,
		totals: capMovementSpeed(
			hasStatBonuses ? totalsWith([statBonuses]) : beforeStatBonuses,
			patch,
		),
	}
}

/** The totals the stat-dependent bonuses read (`stat` amounts): the build up to the active effects. */
export function statBonusBasis(input: BuildStatsInput): ComputedStats {
	return evaluateBuild(input).beforeStatBonuses
}

/**
 * A build's totals, in order: the champion at `level` in `form`; its items, stat shards and
 * ability ranks; the active effects; the stat-dependent bonuses, reading the totals so far; then
 * the movement speed soft caps. Every "what if" is this call with one input changed.
 */
export function computeBuildStats(input: BuildStatsInput): ComputedStats {
	return evaluateBuild(input).totals
}
