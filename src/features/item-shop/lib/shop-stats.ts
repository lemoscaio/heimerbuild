import { statsIcons } from "@/assets/stats-icons"
import type { StatKey } from "../../../../scripts/sync-data/schemas/item"

type ShopStat = { stat: StatKey; label: string; icon: string }

/** Item stats offered as shop filters and sort keys, in shop order. */
export const shopStats: readonly ShopStat[] = [
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
	{ stat: "health", label: "Health", icon: statsIcons.health },
	{ stat: "mana", label: "Mana", icon: statsIcons.mana },
	{ stat: "armor", label: "Armor", icon: statsIcons.armor },
	{
		stat: "magicResist",
		label: "Magic Resistance",
		icon: statsIcons.magicResist,
	},
	{
		stat: "attackSpeedPercent",
		label: "Attack Speed",
		icon: statsIcons.attackSpeed,
	},
	{
		stat: "abilityHaste",
		label: "Ability Haste",
		icon: statsIcons.abilityHaste,
	},
	{
		stat: "critChancePercent",
		label: "Critical Strike Chance",
		icon: statsIcons.criticalStrike,
	},
	{
		stat: "critDamagePercent",
		label: "Critical Strike Damage",
		icon: statsIcons.criticalStrikeDamage,
	},
	{ stat: "lethality", label: "Lethality", icon: statsIcons.lethality },
	{
		stat: "armorPenetrationPercent",
		label: "Armor Penetration",
		icon: statsIcons.armorPenetration,
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
	},
	{
		stat: "lifeStealPercent",
		label: "Life Steal",
		icon: statsIcons.lifeSteal,
	},
	{ stat: "omnivampPercent", label: "Omnivamp", icon: statsIcons.omniVamp },
	{
		stat: "movementSpeedFlat",
		label: "Flat Move Speed",
		icon: statsIcons.moveSpeed,
	},
	{
		stat: "movementSpeedPercent",
		label: "Percent Move Speed",
		icon: statsIcons.moveSpeed,
	},
	{
		stat: "baseHealthRegenPercent",
		label: "Base Health Regen",
		icon: statsIcons.health,
	},
	{
		stat: "baseManaRegenPercent",
		label: "Base Mana Regen",
		icon: statsIcons.manaRegen,
	},
	{
		stat: "healAndShieldPowerPercent",
		label: "Heal and Shield Power",
		icon: statsIcons.healAndShieldPower,
	},
	{ stat: "tenacityPercent", label: "Tenacity", icon: statsIcons.tenacity },
	{
		stat: "slowResistPercent",
		label: "Slow Resist",
		icon: statsIcons.slowResist,
	},
]
