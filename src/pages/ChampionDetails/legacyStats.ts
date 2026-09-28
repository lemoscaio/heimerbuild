import type { ChampionStats } from "../../../scripts/sync-data/schemas/champion"
import {
	type ItemStats,
	STAT_UNITS,
	type StatKey,
} from "../../../scripts/sync-data/schemas/item"

/** The shape the calculator math was written for; issues 18-20 replace that math. */
export type LegacyStat = { flat: number; percent: number; perLevel: number }
export type LegacyStats = Record<string, LegacyStat>

const CHAMPION_STAT_NAMES = {
	health: "health",
	healthRegen: "healthRegen",
	mana: "mana",
	manaRegen: "manaRegen",
	armor: "armor",
	magicResist: "magicResistance",
	attackDamage: "attackDamage",
	critChance: "criticalStrike",
	movementSpeed: "movespeed",
	attackRange: "attackRange",
} as const satisfies Partial<Record<keyof ChampionStats, string>>

const ITEM_STAT_NAMES: Partial<
	Record<StatKey, [name: string, part: "flat" | "percent"]>
> = {
	attackDamage: ["attackDamage", "flat"],
	abilityPower: ["abilityPower", "flat"],
	health: ["health", "flat"],
	mana: ["mana", "flat"],
	armor: ["armor", "flat"],
	magicResist: ["magicResistance", "flat"],
	abilityHaste: ["abilityHaste", "flat"],
	lethality: ["lethality", "flat"],
	attackRange: ["attackRange", "flat"],
	healthRegen: ["healthRegen", "flat"],
	manaRegen: ["manaRegen", "flat"],
	// The legacy math multiplies attack speed by (1 + flat / 100).
	attackSpeedPercent: ["attackSpeed", "flat"],
	critChancePercent: ["criticalStrike", "percent"],
	armorPenetrationPercent: ["armorPenetration", "percent"],
	magicPenetrationFlat: ["flatMagicPenetration", "flat"],
	magicPenetrationPercent: ["percentageMagicPenetration", "percent"],
	movementSpeedFlat: ["movespeed", "flat"],
	movementSpeedPercent: ["movespeed", "percent"],
	lifeStealPercent: ["lifeSteal", "percent"],
	omnivampPercent: ["omniVamp", "percent"],
	tenacityPercent: ["tenacity", "percent"],
}

export function toLegacyChampionStats(stats: ChampionStats): LegacyStats {
	const legacy: LegacyStats = {
		attackSpeed: {
			flat: stats.attackSpeed.base,
			percent: 0,
			perLevel: stats.attackSpeed.perLevelPercent,
		},
	}
	for (const [stat, name] of Object.entries(CHAMPION_STAT_NAMES)) {
		const { base, perLevel } = stats[stat as keyof typeof CHAMPION_STAT_NAMES]
		legacy[name] = { flat: base, percent: 0, perLevel }
	}
	return legacy
}

/** Percent stats are fractions (0.1) in the data and percent points (10) in the legacy math. */
export function toLegacyItemStats(stats: ItemStats): LegacyStats {
	const legacy: LegacyStats = {}
	for (const [stat, value] of Object.entries(stats) as [StatKey, number][]) {
		const target = ITEM_STAT_NAMES[stat]
		if (!target) continue
		const [name, part] = target
		const points =
			STAT_UNITS[stat] === "percent" ? Number((value * 100).toFixed(4)) : value
		legacy[name] ??= { flat: 0, percent: 0, perLevel: 0 }
		legacy[name][part] += points
	}
	return legacy
}
