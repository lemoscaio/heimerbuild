import type { DamageType } from "@schemas/champion"
import type { ComputedStats } from "../stats/compute-stats"

/** The attacker's penetration and the target's reductions against one resistance; absent is none. */
export type ResistModifiers = {
	flatReduction?: number
	percentReduction?: number
	percentPenetration?: number
	/** Lethality for armor: full flat penetration at every level since V14.1. */
	flatPenetration?: number
}

/**
 * The resistance a hit is computed against, in the wiki's order: flat reduction, percent reduction,
 * percent penetration, then flat penetration. Only flat reduction goes below 0; the percent steps
 * skip a resistance at or below 0, and flat penetration stops at 0 (wiki "Armor penetration").
 */
export function effectiveResist(
	resist: number,
	{
		flatReduction = 0,
		percentReduction = 0,
		percentPenetration = 0,
		flatPenetration = 0,
	}: ResistModifiers = {},
): number {
	let effective = resist - flatReduction
	if (effective > 0) effective *= 1 - percentReduction
	if (effective > 0) effective *= 1 - percentPenetration
	if (effective > 0) effective = Math.max(0, effective - flatPenetration)
	return effective
}

/** Share of the raw damage a resistance lets through: 100 / (100 + R), or 2 − 100 / (100 − R) below 0 (wiki "Armor"). */
export function damageMultiplier(resist: number): number {
	return resist >= 0 ? 100 / (100 + resist) : 2 - 100 / (100 - resist)
}

/** The target's resistances, as the mitigation reads them. */
export type Resists = { armor: number; magicResist: number }

/** The attacker's penetration against a damage type, from its stats. */
function penetration(
	type: Exclude<DamageType, "true">,
	stats: ComputedStats,
): ResistModifiers {
	return type === "physical"
		? {
				percentPenetration: stats.armorPenetrationPercent.total,
				flatPenetration:
					stats.lethality.total + stats.armorPenetrationFlat.total,
			}
		: {
				percentPenetration: stats.magicPenetrationPercent.total,
				flatPenetration: stats.magicPenetrationFlat.total,
			}
}

/** Damage after the target's armor or magic resist and the attacker's penetration; true damage is not mitigated. */
export function mitigate(
	raw: number,
	type: DamageType,
	{ target, attacker }: { target: Resists; attacker: ComputedStats },
): number {
	if (type === "true") return raw
	const resist = type === "physical" ? target.armor : target.magicResist
	return (
		raw * damageMultiplier(effectiveResist(resist, penetration(type, attacker)))
	)
}
