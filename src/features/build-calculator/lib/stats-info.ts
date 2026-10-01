import {
	resourceDisplay,
	type StatFormat,
	type StatGroup,
	statDisplay,
} from "@/lib/stat-display"
import {
	type ComputedStats,
	MANA_RESOURCE,
	type StatName,
} from "@/lib/stats/compute-stats"

export type StatRowInfo = {
	stat: StatName
	label: string
	icon: string
	group: StatGroup
	format?: StatFormat
	/** Unit shown after the total, such as "/5s" for regen. */
	suffix?: string
}

type PanelRow = Pick<StatRowInfo, "stat" | "format" | "suffix">

/** Stats panel rows, in panel order within each group. */
const panelRows: readonly PanelRow[] = [
	{ stat: "attackDamage" },
	{ stat: "abilityPower" },
	{ stat: "attackSpeed", format: "attackSpeed" },
	{ stat: "critChance", format: "percent" },
	{ stat: "lethality" },
	{ stat: "armorPenetrationPercent", format: "percent" },
	{ stat: "magicPenetrationFlat" },
	{ stat: "magicPenetrationPercent", format: "percent" },
	{ stat: "lifeStealPercent", format: "percent" },
	{ stat: "omnivampPercent", format: "percent" },
	{ stat: "health" },
	{ stat: "healthRegen", suffix: "/5s" },
	{ stat: "armor" },
	{ stat: "magicResist" },
	{ stat: "tenacityPercent", format: "percent" },
	{ stat: "mana" },
	{ stat: "manaRegen", suffix: "/5s" },
	{ stat: "abilityHaste" },
	{ stat: "movementSpeed" },
	{ stat: "attackRange" },
]

/** The panel rows with their label, icon and group from `statDisplay`. */
export const statRows: readonly StatRowInfo[] = panelRows.map((row) => {
	const { label, icon, group } = statDisplay[row.stat]
	return { ...row, label, icon, group }
})

const NO_RESOURCE = "NONE"

/**
 * The panel rows for one champion. The mana rows show its own resource: renamed
 * and with its icon for another resource, dropped when it has none or the value is 0.
 */
export function championStatRows(
	resource: string,
	stats: ComputedStats,
): StatRowInfo[] {
	if (resource === MANA_RESOURCE) return [...statRows]
	const { label, icon } = resourceDisplay(resource)
	return statRows.flatMap((info) => {
		if (info.stat !== "mana" && info.stat !== "manaRegen") return [info]
		if (resource === NO_RESOURCE || stats[info.stat].total === 0) return []
		return [
			{ ...info, icon, label: info.stat === "mana" ? label : `${label} Regen` },
		]
	})
}

const KEY_STATS: readonly StatName[] = [
	"abilityPower",
	"attackDamage",
	"health",
	"armor",
	"magicResist",
	"attackSpeed",
	"movementSpeed",
]

/** The key stats tiles, from a champion's rows: seven fixed stats, then its resource or, without one, Ability Haste. */
export function keyStatRows(rows: readonly StatRowInfo[]): StatRowInfo[] {
	const last = rows.some(({ stat }) => stat === "mana")
		? "mana"
		: "abilityHaste"
	return [...KEY_STATS, last].flatMap(
		(stat) => rows.find((info) => info.stat === stat) ?? [],
	)
}
