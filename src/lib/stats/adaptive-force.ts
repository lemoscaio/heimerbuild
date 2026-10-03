import type { Champion } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { ItemInput } from "./compute-stats"

export type AdaptiveType = Champion["adaptiveType"]

/**
 * What one point of Adaptive Force gives: 0.6 bonus attack damage or 1 ability power.
 * Not in the game data; source: League of Legends Wiki, "Adaptive force".
 */
const ADAPTIVE_FORCE_CONVERSION = {
	ad: { stat: "attackDamage", ratio: 0.6 },
	ap: { stat: "abilityPower", ratio: 1 },
} as const satisfies Record<AdaptiveType, { stat: StatKey; ratio: number }>

/** AP when bonus AP is higher, AD when bonus AD is higher, the champion's default on a tie. */
export function resolveAdaptiveType(
	defaultType: AdaptiveType,
	bonus: { attackDamage: number; abilityPower: number },
): AdaptiveType {
	if (bonus.abilityPower > bonus.attackDamage) return "ap"
	if (bonus.attackDamage > bonus.abilityPower) return "ad"
	return defaultType
}

/** What Adaptive Force becomes in a build: its items' bonus AD and AP decide, the champion's default on a tie. */
export function itemsAdaptiveType(
	defaultType: AdaptiveType,
	items: readonly ItemInput[],
): AdaptiveType {
	const bonus = { attackDamage: 0, abilityPower: 0 }
	for (const { stats } of items) {
		bonus.attackDamage += stats.attackDamage ?? 0
		bonus.abilityPower += stats.abilityPower ?? 0
	}
	return resolveAdaptiveType(defaultType, bonus)
}

/** `value` points of Adaptive Force as the stat they become: 10 is 10 AP or 6 AD. */
export function adaptiveForceStat(
	value: number,
	type: AdaptiveType,
): { stat: StatKey; value: number } {
	const { stat, ratio } = ADAPTIVE_FORCE_CONVERSION[type]
	return { stat, value: value * ratio }
}
