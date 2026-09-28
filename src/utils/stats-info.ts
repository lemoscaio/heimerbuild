import itemStatsIcons from "../assets/stats-icons"
import type { StatName } from "../lib/stats/compute-stats"

type StatFormat = "flat" | "percent" | "attackSpeed"

type StatRow = {
	stat: StatName
	label: string
	icon: string
	format?: StatFormat
}

export const statRows: readonly StatRow[] = [
	{
		stat: "attackDamage",
		label: "Attack Damage",
		icon: itemStatsIcons.attackDamage,
	},
	{
		stat: "abilityPower",
		label: "Ability Power",
		icon: itemStatsIcons.abilityPower,
	},
	{ stat: "armor", label: "Armor", icon: itemStatsIcons.armor },
	{
		stat: "magicResist",
		label: "Magic Resistance",
		icon: itemStatsIcons.magicResist,
	},
	{
		stat: "attackSpeed",
		label: "Attack Speed",
		icon: itemStatsIcons.attackSpeed,
		format: "attackSpeed",
	},
	{
		stat: "abilityHaste",
		label: "Ability Haste",
		icon: itemStatsIcons.abilityHaste,
	},
	{
		stat: "critChance",
		label: "Critical Strike",
		icon: itemStatsIcons.criticalStrike,
		format: "percent",
	},
	{
		stat: "movementSpeed",
		label: "Movement Speed",
		icon: itemStatsIcons.moveSpeed,
	},
	{ stat: "health", label: "Health", icon: itemStatsIcons.health },
	{ stat: "healthRegen", label: "Health Regen", icon: itemStatsIcons.health },
	{ stat: "mana", label: "Mana", icon: itemStatsIcons.mana },
	{ stat: "manaRegen", label: "Mana Regen", icon: itemStatsIcons.mana },
	{ stat: "lethality", label: "Lethality", icon: itemStatsIcons.lethality },
	{
		stat: "armorPenetrationPercent",
		label: "Armor Penetration",
		icon: itemStatsIcons.armorPenetration,
		format: "percent",
	},
	{
		stat: "magicPenetrationFlat",
		label: "Flat Magic Penetration",
		icon: itemStatsIcons.flatMagicPenetration,
	},
	{
		stat: "magicPenetrationPercent",
		label: "Percent Magic Penetration",
		icon: itemStatsIcons.percentageMagicPenetration,
		format: "percent",
	},
	{
		stat: "lifeStealPercent",
		label: "Life Steal",
		icon: itemStatsIcons.lifeSteal,
		format: "percent",
	},
	{
		stat: "omnivampPercent",
		label: "Omnivamp",
		icon: itemStatsIcons.omniVamp,
		format: "percent",
	},
	{
		stat: "attackRange",
		label: "Attack Range",
		icon: itemStatsIcons.attackRange,
	},
	{
		stat: "tenacityPercent",
		label: "Tenacity",
		icon: itemStatsIcons.tenacity,
		format: "percent",
	},
]

export function formatStat(value: number, format: StatFormat = "flat") {
	if (format === "percent") return `${Number((value * 100).toFixed(1))}%`
	if (format === "attackSpeed") return value.toFixed(3)
	return String(Number(value.toFixed(2)))
}
