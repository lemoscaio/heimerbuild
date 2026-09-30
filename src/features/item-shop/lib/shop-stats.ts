import { statsIcons } from "@/assets/stats-icons"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"

type StatGroup = "offense" | "defense" | "utility"

type ShopStat = {
	stat: StatKey
	label: string
	icon: string
	group: StatGroup
	/** Words that type this stat's filter token in the shop search; the first is shown in tooltips. */
	aliases: readonly [string, ...string[]]
}

/** Item stats offered as shop filters and sort keys, in shop order. */
export const shopStats: readonly ShopStat[] = [
	{
		stat: "attackDamage",
		label: "Attack Damage",
		icon: statsIcons.attackDamage,
		group: "offense",
		aliases: ["ad"],
	},
	{
		stat: "abilityPower",
		label: "Ability Power",
		icon: statsIcons.abilityPower,
		group: "offense",
		aliases: ["ap"],
	},
	{
		stat: "health",
		label: "Health",
		icon: statsIcons.health,
		group: "defense",
		aliases: ["hp", "health"],
	},
	{
		stat: "mana",
		label: "Mana",
		icon: statsIcons.mana,
		group: "utility",
		aliases: ["mana"],
	},
	{
		stat: "armor",
		label: "Armor",
		icon: statsIcons.armor,
		group: "defense",
		aliases: ["armor", "arm"],
	},
	{
		stat: "magicResist",
		label: "Magic Resistance",
		icon: statsIcons.magicResist,
		group: "defense",
		aliases: ["mr"],
	},
	{
		stat: "attackSpeedPercent",
		label: "Attack Speed",
		icon: statsIcons.attackSpeed,
		group: "offense",
		aliases: ["as"],
	},
	{
		stat: "abilityHaste",
		label: "Ability Haste",
		icon: statsIcons.abilityHaste,
		group: "utility",
		aliases: ["ah", "haste"],
	},
	{
		stat: "critChancePercent",
		label: "Critical Strike Chance",
		icon: statsIcons.criticalStrike,
		group: "offense",
		aliases: ["crit"],
	},
	{
		stat: "critDamagePercent",
		label: "Critical Strike Damage",
		icon: statsIcons.criticalStrikeDamage,
		group: "offense",
		aliases: ["critdmg", "cdmg"],
	},
	{
		stat: "lethality",
		label: "Lethality",
		icon: statsIcons.lethality,
		group: "offense",
		aliases: ["leth", "lethality"],
	},
	{
		stat: "armorPenetrationPercent",
		label: "Armor Penetration",
		icon: statsIcons.armorPenetration,
		group: "offense",
		aliases: ["arpen", "armorpen"],
	},
	{
		stat: "magicPenetrationFlat",
		label: "Flat Magic Penetration",
		icon: statsIcons.flatMagicPenetration,
		group: "offense",
		aliases: ["mpen"],
	},
	{
		stat: "magicPenetrationPercent",
		label: "Percent Magic Penetration",
		icon: statsIcons.percentageMagicPenetration,
		group: "offense",
		aliases: ["mpen%", "%mpen"],
	},
	{
		stat: "lifeStealPercent",
		label: "Life Steal",
		icon: statsIcons.lifeSteal,
		group: "offense",
		aliases: ["ls", "lifesteal"],
	},
	{
		stat: "omnivampPercent",
		label: "Omnivamp",
		icon: statsIcons.omniVamp,
		group: "offense",
		aliases: ["omni", "omnivamp"],
	},
	{
		stat: "movementSpeedFlat",
		label: "Flat Move Speed",
		icon: statsIcons.moveSpeed,
		group: "utility",
		aliases: ["ms"],
	},
	{
		stat: "movementSpeedPercent",
		label: "Percent Move Speed",
		icon: statsIcons.moveSpeed,
		group: "utility",
		aliases: ["ms%", "%ms"],
	},
	{
		stat: "baseHealthRegenPercent",
		label: "Base Health Regen",
		icon: statsIcons.health,
		group: "defense",
		aliases: ["hp5", "hpregen"],
	},
	{
		stat: "baseManaRegenPercent",
		label: "Base Mana Regen",
		icon: statsIcons.manaRegen,
		group: "utility",
		aliases: ["mp5", "manaregen"],
	},
	{
		stat: "healAndShieldPowerPercent",
		label: "Heal and Shield Power",
		icon: statsIcons.healAndShieldPower,
		group: "defense",
		aliases: ["hsp", "heal"],
	},
	{
		stat: "tenacityPercent",
		label: "Tenacity",
		icon: statsIcons.tenacity,
		group: "defense",
		aliases: ["ten", "tenacity"],
	},
	{
		stat: "slowResistPercent",
		label: "Slow Resist",
		icon: statsIcons.slowResist,
		group: "utility",
		aliases: ["slow", "slowres"],
	},
]

const statGroups: readonly { group: StatGroup; label: string }[] = [
	{ group: "offense", label: "Offense" },
	{ group: "defense", label: "Defense" },
	{ group: "utility", label: "Utility" },
]

/** The shop stats split into the stat rail's groups, each in shop order. */
export const shopStatGroups = statGroups.map(({ group, label }) => ({
	group,
	label,
	stats: shopStats.filter((stat) => stat.group === group),
}))
