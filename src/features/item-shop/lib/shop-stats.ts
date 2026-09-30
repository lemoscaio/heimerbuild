import type { StatKey } from "@schemas/item"
import { type StatGroup, statDisplay, statGroups } from "@/lib/stat-display"

type ShopStat = {
	stat: StatKey
	label: string
	icon: string
	group: StatGroup
	/** Words that type this stat's filter token in the shop search; the first is shown in tooltips. */
	aliases: readonly [string, ...string[]]
}

/** Item stats offered as shop filters and sort keys, in shop order. */
const shopStatAliases: readonly Pick<ShopStat, "stat" | "aliases">[] = [
	{ stat: "attackDamage", aliases: ["ad"] },
	{ stat: "abilityPower", aliases: ["ap"] },
	{ stat: "health", aliases: ["hp", "health"] },
	{ stat: "mana", aliases: ["mana"] },
	{ stat: "armor", aliases: ["armor", "arm"] },
	{ stat: "magicResist", aliases: ["mr"] },
	{ stat: "attackSpeedPercent", aliases: ["as"] },
	{ stat: "abilityHaste", aliases: ["ah", "haste"] },
	{ stat: "critChancePercent", aliases: ["crit"] },
	{ stat: "critDamagePercent", aliases: ["critdmg", "cdmg"] },
	{ stat: "lethality", aliases: ["leth", "lethality"] },
	{ stat: "armorPenetrationPercent", aliases: ["arpen", "armorpen"] },
	{ stat: "magicPenetrationFlat", aliases: ["mpen"] },
	{ stat: "magicPenetrationPercent", aliases: ["mpen%", "%mpen"] },
	{ stat: "lifeStealPercent", aliases: ["ls", "lifesteal"] },
	{ stat: "omnivampPercent", aliases: ["omni", "omnivamp"] },
	{ stat: "movementSpeedFlat", aliases: ["ms"] },
	{ stat: "movementSpeedPercent", aliases: ["ms%", "%ms"] },
	{ stat: "baseHealthRegenPercent", aliases: ["hp5", "hpregen"] },
	{ stat: "baseManaRegenPercent", aliases: ["mp5", "manaregen"] },
	{ stat: "healAndShieldPowerPercent", aliases: ["hsp", "heal"] },
	{ stat: "tenacityPercent", aliases: ["ten", "tenacity"] },
	{ stat: "slowResistPercent", aliases: ["slow", "slowres"] },
]

/** The shop stats with their label, icon and group from `statDisplay`. */
export const shopStats: readonly ShopStat[] = shopStatAliases.map(
	({ stat, aliases }) => {
		const { label, icon, group } = statDisplay[stat]
		return { stat, label, icon, group, aliases }
	},
)

/** The shop stats split into the stat rail's groups, each in shop order. */
export const shopStatGroups = statGroups.map(({ group, label }) => ({
	group,
	label,
	stats: shopStats.filter((stat) => stat.group === group),
}))
