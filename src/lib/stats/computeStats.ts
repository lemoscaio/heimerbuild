import type {
	Champion,
	ChampionStats,
} from "../../../scripts/sync-data/schemas/champion"
import {
	type Item,
	STAT_UNITS,
	type StatKey,
} from "../../../scripts/sync-data/schemas/item"
import { attackSpeedAtLevel } from "./attackSpeed"
import { assertChampionLevel, statAtLevel } from "./growth"

/** Item stats that modify a champion stat instead of being reported on their own. */
type FoldedItemStat =
	| "attackSpeedPercent"
	| "critChancePercent"
	| "movementSpeedFlat"
	| "movementSpeedPercent"
	| "baseHealthRegenPercent"
	| "baseManaRegenPercent"

export type StatName = keyof ChampionStats | Exclude<StatKey, FoldedItemStat>

/** Percent stats stay fractions (0.1 means 10%), like the item data. */
export type StatBreakdown = { base: number; bonus: number; total: number }

export type ComputedStats = Record<StatName, StatBreakdown>

export type ChampionInput = Pick<Champion, "stats">
export type ItemInput = Pick<Item, "stats">

const FLAT_GROWTH_STATS = [
	"health",
	"mana",
	"armor",
	"magicResist",
	"attackDamage",
	"attackRange",
] as const satisfies readonly (keyof ChampionStats & StatKey)[]

function sumItemStats(items: readonly ItemInput[]): Record<StatKey, number> {
	const sums = Object.fromEntries(
		Object.keys(STAT_UNITS).map((stat) => [stat, 0]),
	) as Record<StatKey, number>
	for (const { stats } of items) {
		for (const [stat, value] of Object.entries(stats) as [StatKey, number][]) {
			sums[stat] += value
		}
	}
	return sums
}

function breakdown(base: number, total: number): StatBreakdown {
	return { base, bonus: total - base, total }
}

/**
 * `base` is the champion alone at `level` (1 to 18, growth included);
 * `bonus` is what the items add on top of it. Attack speed is the exception:
 * its level growth is bonus attack speed, as in game.
 */
export function computeStats(
	champion: ChampionInput,
	level: number,
	items: readonly ItemInput[],
): ComputedStats {
	assertChampionLevel(level)
	const { stats } = champion
	const {
		attackSpeedPercent,
		critChancePercent,
		movementSpeedFlat,
		movementSpeedPercent,
		baseHealthRegenPercent,
		baseManaRegenPercent,
		...itemStats
	} = sumItemStats(items)

	const computed = {} as ComputedStats
	for (const [stat, value] of Object.entries(itemStats)) {
		computed[stat as StatName] = breakdown(0, value)
	}

	for (const stat of FLAT_GROWTH_STATS) {
		const base = statAtLevel(stats[stat], level)
		computed[stat] = breakdown(base, base + itemStats[stat])
	}

	const healthRegen = statAtLevel(stats.healthRegen, level)
	computed.healthRegen = breakdown(
		healthRegen,
		healthRegen * (1 + baseHealthRegenPercent) + itemStats.healthRegen,
	)

	const manaRegen = statAtLevel(stats.manaRegen, level)
	computed.manaRegen = breakdown(
		manaRegen,
		manaRegen * (1 + baseManaRegenPercent) + itemStats.manaRegen,
	)

	computed.attackSpeed = breakdown(
		stats.attackSpeed.base,
		attackSpeedAtLevel(stats.attackSpeed, level, attackSpeedPercent),
	)

	const critChance = statAtLevel(stats.critChance, level)
	computed.critChance = breakdown(
		critChance,
		Math.min(1, critChance + critChancePercent),
	)

	const movementSpeed = statAtLevel(stats.movementSpeed, level)
	computed.movementSpeed = breakdown(
		movementSpeed,
		(movementSpeed + movementSpeedFlat) * (1 + movementSpeedPercent),
	)

	return computed
}
