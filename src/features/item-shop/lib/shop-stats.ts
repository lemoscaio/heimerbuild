import { statsIcons } from "@/assets/stats-icons"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"

type StatGroup = "offense" | "defense" | "utility"

type ShopStat = { stat: StatKey; label: string; icon: string; group: StatGroup }

/** Item stats offered as shop filters and sort keys, in shop order. */
export const shopStats: readonly ShopStat[] = [
	{
		stat: "attackDamage",
		label: "Attack Damage",
		icon: statsIcons.attackDamage,
		group: "offense",
	},
	{
		stat: "abilityPower",
		label: "Ability Power",
		icon: statsIcons.abilityPower,
		group: "offense",
	},
	{
		stat: "health",
		label: "Health",
		icon: statsIcons.health,
		group: "defense",
	},
	{ stat: "mana", label: "Mana", icon: statsIcons.mana, group: "utility" },
	{ stat: "armor", label: "Armor", icon: statsIcons.armor, group: "defense" },
	{
		stat: "magicResist",
		label: "Magic Resistance",
		icon: statsIcons.magicResist,
		group: "defense",
	},
	{
		stat: "attackSpeedPercent",
		label: "Attack Speed",
		icon: statsIcons.attackSpeed,
		group: "offense",
	},
	{
		stat: "abilityHaste",
		label: "Ability Haste",
		icon: statsIcons.abilityHaste,
		group: "utility",
	},
	{
		stat: "critChancePercent",
		label: "Critical Strike Chance",
		icon: statsIcons.criticalStrike,
		group: "offense",
	},
	{
		stat: "critDamagePercent",
		label: "Critical Strike Damage",
		icon: statsIcons.criticalStrikeDamage,
		group: "offense",
	},
	{
		stat: "lethality",
		label: "Lethality",
		icon: statsIcons.lethality,
		group: "offense",
	},
	{
		stat: "armorPenetrationPercent",
		label: "Armor Penetration",
		icon: statsIcons.armorPenetration,
		group: "offense",
	},
	{
		stat: "magicPenetrationFlat",
		label: "Flat Magic Penetration",
		icon: statsIcons.flatMagicPenetration,
		group: "offense",
	},
	{
		stat: "magicPenetrationPercent",
		label: "Percent Magic Penetration",
		icon: statsIcons.percentageMagicPenetration,
		group: "offense",
	},
	{
		stat: "lifeStealPercent",
		label: "Life Steal",
		icon: statsIcons.lifeSteal,
		group: "offense",
	},
	{
		stat: "omnivampPercent",
		label: "Omnivamp",
		icon: statsIcons.omniVamp,
		group: "offense",
	},
	{
		stat: "movementSpeedFlat",
		label: "Flat Move Speed",
		icon: statsIcons.moveSpeed,
		group: "utility",
	},
	{
		stat: "movementSpeedPercent",
		label: "Percent Move Speed",
		icon: statsIcons.moveSpeed,
		group: "utility",
	},
	{
		stat: "baseHealthRegenPercent",
		label: "Base Health Regen",
		icon: statsIcons.health,
		group: "defense",
	},
	{
		stat: "baseManaRegenPercent",
		label: "Base Mana Regen",
		icon: statsIcons.manaRegen,
		group: "utility",
	},
	{
		stat: "healAndShieldPowerPercent",
		label: "Heal and Shield Power",
		icon: statsIcons.healAndShieldPower,
		group: "defense",
	},
	{
		stat: "tenacityPercent",
		label: "Tenacity",
		icon: statsIcons.tenacity,
		group: "defense",
	},
	{
		stat: "slowResistPercent",
		label: "Slow Resist",
		icon: statsIcons.slowResist,
		group: "utility",
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
