import type { Champion, ChampionStats } from "@schemas/champion"
import { type Item, STAT_UNITS, type StatKey } from "@schemas/item"
import { attackSpeedAtLevel } from "./attack-speed"
import { type FormOptions, formStats } from "./champion-forms"
import { assertChampionLevel, statAtLevel } from "./growth"
import { levelStateAt } from "./level-states"
import { type AbilityRanks, rankStatsInput } from "./rank-stats"

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

export type ChampionInput = Pick<
	Champion,
	"resource" | "stats" | "levelStates" | "forms" | "rankStats"
>
export type ItemInput = Pick<Item, "stats">

/** Champion `resource` value of mana users; other resources ignore mana stats on items. */
export const MANA_RESOURCE = "MANA"

/** Whether the champion's resource is mana; the others' `mana` stat is energy, fury or nothing. */
export function usesMana({ resource }: Pick<Champion, "resource">): boolean {
	return resource === MANA_RESOURCE
}

const FLAT_GROWTH_STATS = [
	"health",
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

export type ComputeStatsOptions = FormOptions & {
	/** The abilities' ranks: the stats a rank grants (absent: none) and the forms a rank unlocks (absent: not checked). */
	ranks?: AbilityRanks
}

/**
 * `base` is the champion alone at `level` (1 to 18, growth included);
 * `bonus` is what the items add on top of it. Attack speed is the exception:
 * its level growth is bonus attack speed, as in game. Champions without
 * mana keep their own resource in `mana` and `manaRegen`, with no item bonus.
 * The selected form, then the level states reached at `level`, replace the champion's stats they set.
 * The stats the ability ranks grant are bonus, like the items'.
 */
export function computeStats(
	champion: ChampionInput,
	level: number,
	items: readonly ItemInput[],
	{ ranks, form }: ComputeStatsOptions = {},
): ComputedStats {
	assertChampionLevel(level)
	const inForm = formStats(champion, { form, ranks })
	const { attackRange = inForm.stats.attackRange } = levelStateAt(
		inForm.levelStates,
		level,
	)
	const stats = { ...inForm.stats, attackRange }
	const hasMana = usesMana(champion)
	const {
		attackSpeedPercent,
		critChancePercent,
		movementSpeedFlat,
		movementSpeedPercent,
		baseHealthRegenPercent,
		baseManaRegenPercent,
		...itemStats
	} = sumItemStats(
		ranks ? [...items, rankStatsInput(champion.rankStats, ranks)] : items,
	)

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

	const mana = statAtLevel(stats.mana, level)
	computed.mana = breakdown(mana, hasMana ? mana + itemStats.mana : mana)

	const manaRegen = statAtLevel(stats.manaRegen, level)
	computed.manaRegen = breakdown(
		manaRegen,
		hasMana
			? manaRegen * (1 + baseManaRegenPercent) + itemStats.manaRegen
			: manaRegen,
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
