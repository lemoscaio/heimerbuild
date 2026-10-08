import type { AbilitySlot, ChampionSpell, DamageType } from "@schemas/champion"
import { evaluateDamage } from "@/lib/combat/damage-formula"
import type { AbilityCounters } from "@/lib/effects/evaluate"
import type { ComputedStats } from "@/lib/stats/compute-stats"

/** What an ability's damage reads from the build: its totals, level and the counts its formulas read. */
export type AbilityDamageBuild = {
	stats: ComputedStats
	level: number
	/** By ability (Siphoning Strike's stacks); none means a formula that reads one has no number. */
	counters?: Partial<Record<AbilitySlot, AbilityCounters>>
}

export type AbilityDamageAt = { type: DamageType; value: number }

/** No target here: a share of its health has no number. */
const NO_TARGET = { maximum: 0, current: 0 }

/**
 * The tooltip's first damage at the build and the ability's rank, before the target's resistances
 * (what a cast deals in the combo unless its hit rule says more). None while unranked, for a
 * share of the target's health, or when not modeled.
 */
export function abilityDamageAt(
	{ slot, damage }: Pick<ChampionSpell, "slot" | "damage">,
	rank: number,
	{ stats, level, counters }: AbilityDamageBuild,
): AbilityDamageAt | undefined {
	const [first] = damage ?? []
	if (!first || rank === 0 || first.ofTargetHealth) return undefined
	const value = evaluateDamage(first, {
		stats,
		level,
		rank,
		target: NO_TARGET,
		counters: counters?.[slot],
	})
	return value === undefined ? undefined : { type: first.type, value }
}
