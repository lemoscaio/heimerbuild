import { statsIcons } from "../assets/stats-icons"
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
		icon: statsIcons.attackDamage,
	},
	{
		stat: "abilityPower",
		label: "Ability Power",
		icon: statsIcons.abilityPower,
	},
	{ stat: "armor", label: "Armor", icon: statsIcons.armor },
	{
		stat: "magicResist",
		label: "Magic Resistance",
		icon: statsIcons.magicResist,
	},
	{
		stat: "attackSpeed",
		label: "Attack Speed",
		icon: statsIcons.attackSpeed,
		format: "attackSpeed",
	},
	{
		stat: "abilityHaste",
		label: "Ability Haste",
		icon: statsIcons.abilityHaste,
	},
	{
		stat: "critChance",
		label: "Critical Strike",
		icon: statsIcons.criticalStrike,
		format: "percent",
	},
	{
		stat: "movementSpeed",
		label: "Movement Speed",
		icon: statsIcons.moveSpeed,
	},
	{ stat: "health", label: "Health", icon: statsIcons.health },
	{ stat: "healthRegen", label: "Health Regen", icon: statsIcons.health },
	{ stat: "mana", label: "Mana", icon: statsIcons.mana },
	{ stat: "manaRegen", label: "Mana Regen", icon: statsIcons.mana },
	{ stat: "lethality", label: "Lethality", icon: statsIcons.lethality },
	{
		stat: "armorPenetrationPercent",
		label: "Armor Penetration",
		icon: statsIcons.armorPenetration,
		format: "percent",
	},
	{
		stat: "magicPenetrationFlat",
		label: "Flat Magic Penetration",
		icon: statsIcons.flatMagicPenetration,
	},
	{
		stat: "magicPenetrationPercent",
		label: "Percent Magic Penetration",
		icon: statsIcons.percentageMagicPenetration,
		format: "percent",
	},
	{
		stat: "lifeStealPercent",
		label: "Life Steal",
		icon: statsIcons.lifeSteal,
		format: "percent",
	},
	{
		stat: "omnivampPercent",
		label: "Omnivamp",
		icon: statsIcons.omniVamp,
		format: "percent",
	},
	{
		stat: "attackRange",
		label: "Attack Range",
		icon: statsIcons.attackRange,
	},
	{
		stat: "tenacityPercent",
		label: "Tenacity",
		icon: statsIcons.tenacity,
		format: "percent",
	},
]

export function formatStat(value: number, format: StatFormat = "flat") {
	if (format === "percent") return `${Number((value * 100).toFixed(1))}%`
	if (format === "attackSpeed") return value.toFixed(3)
	return String(Number(value.toFixed(2)))
}
