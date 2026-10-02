import type { AbilitySlot, Champion } from "@schemas/champion"
import type { StatKey } from "@schemas/item"
import type { ItemInput } from "./compute-stats"

/** Each ability's rank: 0 when it has no point yet. */
export type AbilityRanks = Readonly<Record<AbilitySlot, number>>

/** The stats the ability ranks grant (Twisted Fate's E: 15% to 55% attack speed), as one more stat source. */
export function rankStatsInput(
	rankStats: Champion["rankStats"],
	ranks: AbilityRanks,
): ItemInput {
	const stats: Partial<Record<StatKey, number>> = {}
	for (const { slot, stat, values } of rankStats ?? []) {
		const value = values[ranks[slot] - 1]
		if (value !== undefined) stats[stat] = (stats[stat] ?? 0) + value
	}
	return { stats }
}
