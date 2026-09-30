import { statsIcons } from "@/assets/stats-icons"
import {
	type ComputedStats,
	MANA_RESOURCE,
	type StatName,
} from "@/lib/stats/compute-stats"

type StatFormat = "flat" | "percent" | "attackSpeed"

export type StatGroup = "offense" | "defense" | "utility"

export type StatRowInfo = {
	stat: StatName
	label: string
	icon: string
	group: StatGroup
	format?: StatFormat
	/** Unit shown after the total, such as "/5s" for regen. */
	suffix?: string
}

export const statGroups: readonly { group: StatGroup; label: string }[] = [
	{ group: "offense", label: "Offense" },
	{ group: "defense", label: "Defense" },
	{ group: "utility", label: "Utility" },
]

/** Stats panel rows, in panel order within each group. */
export const statRows: readonly StatRowInfo[] = [
	{
		stat: "attackDamage",
		group: "offense",
		label: "Attack Damage",
		icon: statsIcons.attackDamage,
	},
	{
		stat: "abilityPower",
		group: "offense",
		label: "Ability Power",
		icon: statsIcons.abilityPower,
	},
	{
		stat: "attackSpeed",
		group: "offense",
		label: "Attack Speed",
		icon: statsIcons.attackSpeed,
		format: "attackSpeed",
	},
	{
		stat: "critChance",
		group: "offense",
		label: "Critical Strike",
		icon: statsIcons.criticalStrike,
		format: "percent",
	},
	{
		stat: "lethality",
		group: "offense",
		label: "Lethality",
		icon: statsIcons.lethality,
	},
	{
		stat: "armorPenetrationPercent",
		group: "offense",
		label: "Armor Penetration",
		icon: statsIcons.armorPenetration,
		format: "percent",
	},
	{
		stat: "magicPenetrationFlat",
		group: "offense",
		label: "Flat Magic Penetration",
		icon: statsIcons.flatMagicPenetration,
	},
	{
		stat: "magicPenetrationPercent",
		group: "offense",
		label: "Percent Magic Penetration",
		icon: statsIcons.percentageMagicPenetration,
		format: "percent",
	},
	{
		stat: "lifeStealPercent",
		group: "offense",
		label: "Life Steal",
		icon: statsIcons.lifeSteal,
		format: "percent",
	},
	{
		stat: "omnivampPercent",
		group: "offense",
		label: "Omnivamp",
		icon: statsIcons.omniVamp,
		format: "percent",
	},
	{
		stat: "health",
		group: "defense",
		label: "Health",
		icon: statsIcons.health,
	},
	{
		stat: "healthRegen",
		group: "defense",
		label: "Health Regen",
		icon: statsIcons.health,
		suffix: "/5s",
	},
	{ stat: "armor", group: "defense", label: "Armor", icon: statsIcons.armor },
	{
		stat: "magicResist",
		group: "defense",
		label: "Magic Resistance",
		icon: statsIcons.magicResist,
	},
	{
		stat: "tenacityPercent",
		group: "defense",
		label: "Tenacity",
		icon: statsIcons.tenacity,
		format: "percent",
	},
	{ stat: "mana", group: "utility", label: "Mana", icon: statsIcons.mana },
	{
		stat: "manaRegen",
		group: "utility",
		label: "Mana Regen",
		icon: statsIcons.mana,
		suffix: "/5s",
	},
	{
		stat: "abilityHaste",
		group: "utility",
		label: "Ability Haste",
		icon: statsIcons.abilityHaste,
	},
	{
		stat: "movementSpeed",
		group: "utility",
		label: "Movement Speed",
		icon: statsIcons.moveSpeed,
	},
	{
		stat: "attackRange",
		group: "utility",
		label: "Attack Range",
		icon: statsIcons.attackRange,
	},
]

/** Every champion `resource` value in patch 16.19.1 data. */
const RESOURCE_LABELS: Readonly<Record<string, string>> = {
	BLOOD_WELL: "Blood Well",
	COURAGE: "Courage",
	CRIMSON_RUSH: "Crimson Rush",
	ENERGY: "Energy",
	FEROCITY: "Ferocity",
	FLOW: "Flow",
	FRENZY: "Frenzy",
	FURY: "Fury",
	GRIT: "Grit",
	HEAT: "Heat",
	MANA: "Mana",
	RAGE: "Rage",
	SHIELD: "Shield",
}

const NO_RESOURCE = "NONE"

/** "BLOOD_WELL" reads "Blood Well"; values missing from the table are title-cased. */
export function resourceLabel(resource: string) {
	return (
		RESOURCE_LABELS[resource] ??
		resource
			.toLowerCase()
			.split("_")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ")
	)
}

/**
 * The panel rows for one champion. The mana rows show its own resource: renamed
 * for another resource, dropped when it has none or the value is 0.
 */
export function championStatRows(
	resource: string,
	stats: ComputedStats,
): StatRowInfo[] {
	if (resource === MANA_RESOURCE) return [...statRows]
	const label = resourceLabel(resource)
	return statRows.flatMap((info) => {
		if (info.stat !== "mana" && info.stat !== "manaRegen") return [info]
		if (resource === NO_RESOURCE || stats[info.stat].total === 0) return []
		return [{ ...info, label: info.stat === "mana" ? label : `${label} Regen` }]
	})
}

/** Attack speed is attacks per second (no unit); percent stats are stored as fractions. */
export function formatStat(value: number, format: StatFormat = "flat") {
	if (format === "percent") return `${Number((value * 100).toFixed(1))}%`
	if (format === "attackSpeed") return value.toFixed(3)
	return String(Number(value.toFixed(2)))
}
