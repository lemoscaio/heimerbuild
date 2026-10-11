import type { ComputedStats, StatName } from "@/lib/stats/compute-stats"

// Totals are sums of floats: ignore differences below display precision.
const EPSILON = 1e-9

/** The total of every stat that changes from `current` to `next`. */
export function diffStats(
	current: ComputedStats,
	next: ComputedStats,
): Partial<Record<StatName, number>> {
	const changed: Partial<Record<StatName, number>> = {}
	for (const stat of Object.keys(next) as StatName[]) {
		const nextTotal = next[stat].total
		if (Math.abs(nextTotal - current[stat].total) > EPSILON) {
			changed[stat] = nextTotal
		}
	}
	return changed
}

export type StatDeltas = Partial<Record<StatName, number>>

/** How much each stat's total is above (positive) or below `other`'s; equal stats are left out. */
export function statDeltas(
	current: ComputedStats,
	other: ComputedStats,
): StatDeltas {
	const deltas: StatDeltas = {}
	for (const stat of Object.keys(diffStats(other, current)) as StatName[]) {
		deltas[stat] = current[stat].total - other[stat].total
	}
	return deltas
}

/** The selected form's stats against another form's: the form selector's delta chips. */
export type FormComparison = {
	formName: string
	comparedName: string
	/** The compared form comes first in the champion's form order (Mini before Mega). */
	comparedFirst: boolean
	deltas: StatDeltas
}
