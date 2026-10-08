import type {
	AbilityDamage,
	FormulaValue,
	TargetHealth,
} from "@schemas/champion"
import type { ComputedStats } from "../stats/compute-stats"

/** The target's health when a hit lands: its maximum (the dummy's, later the opponent's) and what it has left. */
export type TargetHealthState = { maximum: number; current: number }

/**
 * What a synced damage formula reads: the attacker's stats, the ability's rank (none for a
 * passive), the champion level, the target's health (for a share of it) and its counters.
 */
export type FormulaInput = {
	stats: ComputedStats
	/** 1 or more; absent for a passive, whose values never change by rank. */
	rank?: number
	level: number
	target: TargetHealthState
	/** The counts its `counter` parts read, by name (the build's `counter` grants: Siphoning Strike's stacks). */
	counters?: Readonly<Record<string, number>>
}

/** The target's health a share reads: its maximum, current or missing health. */
export function targetHealth(
	share: TargetHealth,
	{ maximum, current }: TargetHealthState,
): number {
	switch (share) {
		case "maximum":
			return maximum
		case "current":
			return current
		case "missing":
			return maximum - current
	}
}

/** A formula's number at the rank and level; undefined when a table lacks it (no rank for a value by rank). */
export function formulaValueAt(
	value: FormulaValue,
	{ rank, level }: Pick<FormulaInput, "rank" | "level">,
): number | undefined {
	if (typeof value === "number") return value
	if ("byRank" in value) {
		return rank === undefined ? undefined : value.byRank[rank - 1]
	}
	return value.byLevel[level - 1]
}

/**
 * The raw damage of a synced formula: its parts summed (a flat value, a ratio of a stat's total
 * or its `part`, or of a counter), times the multiplier, times the target's health it is a share
 * of. Undefined when it is not modeled or a value (a counter's included) is missing.
 */
export function evaluateDamage(
	damage: AbilityDamage,
	input: FormulaInput,
): number | undefined {
	if (damage.notModeled) return undefined
	let sum = 0
	for (const part of damage.parts) {
		if ("value" in part) {
			const value = formulaValueAt(part.value, input)
			if (value === undefined) return undefined
			sum += value
			continue
		}
		const ratio = formulaValueAt(part.ratio, input)
		if (ratio === undefined) return undefined
		if ("counter" in part) {
			const count = input.counters?.[part.counter]
			if (count === undefined) return undefined
			sum += ratio * count
			continue
		}
		sum += ratio * input.stats[part.stat][part.part ?? "total"]
	}
	const multiplier =
		damage.multiplier === undefined
			? 1
			: formulaValueAt(damage.multiplier, input)
	if (multiplier === undefined) return undefined
	const share = damage.ofTargetHealth
	return sum * multiplier * (share ? targetHealth(share, input.target) : 1)
}

/** An ability's cooldown at the attacker's ability haste: × 100 / (100 + haste) (wiki "Ability haste"). */
export function abilityCooldown(cooldown: number, abilityHaste: number) {
	return (cooldown * 100) / (100 + abilityHaste)
}
