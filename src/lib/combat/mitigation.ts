import type { DamageType } from "@schemas/champion"
import type { Resist } from "../effects/effect"
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
export type Resists = Record<Resist, number>

/** A reduction of one of the target's resistances, from an effect it holds (Black Cleaver's Carve). */
export type ResistReduction = {
	resist: Resist
	mode: "flat" | "percent"
	value: number
}

/** The reductions to one resistance: flat ones add up, percent ones multiply (wiki "Armor penetration"). */
function reductionsOf(
	resist: Resist,
	reductions: readonly ResistReduction[],
): Pick<ResistModifiers, "flatReduction" | "percentReduction"> {
	let flatReduction = 0
	let kept = 1
	for (const reduction of reductions) {
		if (reduction.resist !== resist) continue
		if (reduction.mode === "flat") flatReduction += reduction.value
		else kept *= 1 - reduction.value
	}
	return { flatReduction, percentReduction: 1 - kept }
}

/** The target's resistances after its reductions, before any penetration: what it has at that moment. */
export function reducedResists(
	target: Resists,
	reductions: readonly ResistReduction[],
): Resists {
	return {
		armor: effectiveResist(target.armor, reductionsOf("armor", reductions)),
		magicResist: effectiveResist(
			target.magicResist,
			reductionsOf("magicResist", reductions),
		),
	}
}

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

type MitigationInput = {
	target: Resists
	attacker: ComputedStats
	/** The reductions the target holds when the hit lands; none by default. */
	reductions?: readonly ResistReduction[]
}

/**
 * Damage after the target's armor or magic resist, its reductions and the attacker's penetration;
 * true damage is not mitigated.
 */
export function mitigate(
	raw: number,
	type: DamageType,
	{ target, attacker, reductions = [] }: MitigationInput,
): number {
	if (type === "true") return raw
	const resist = type === "physical" ? "armor" : "magicResist"
	const modifiers = {
		...reductionsOf(resist, reductions),
		...penetration(type, attacker),
	}
	return raw * damageMultiplier(effectiveResist(target[resist], modifiers))
}
