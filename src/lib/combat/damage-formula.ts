import type { AbilityDamage, FormulaValue } from "@schemas/champion"
import type { ComputedStats } from "../stats/compute-stats"

/** What a synced damage formula reads: the attacker's stats, the ability's rank (none for a passive) and the champion level. */
export type FormulaInput = {
	stats: ComputedStats
	/** 1 or more; absent for a passive, whose values never change by rank. */
	rank?: number
	level: number
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
 * The raw damage of a synced formula: its parts summed (a flat value, or a ratio of a stat's
 * total or its `part`), times the multiplier. Undefined when it is not modeled or a value is missing.
 */
export function evaluateDamage(
	damage: AbilityDamage,
	input: FormulaInput,
): number | undefined {
	// A share of the target's health needs the target, which this input lacks.
	if (damage.notModeled || damage.ofTargetHealth) return undefined
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
		sum += ratio * input.stats[part.stat][part.part ?? "total"]
	}
	const multiplier =
		damage.multiplier === undefined
			? 1
			: formulaValueAt(damage.multiplier, input)
	return multiplier === undefined ? undefined : sum * multiplier
}

/** An ability's cooldown at the attacker's ability haste: × 100 / (100 + haste) (wiki "Ability haste"). */
export function abilityCooldown(cooldown: number, abilityHaste: number) {
	return (cooldown * 100) / (100 + abilityHaste)
}
