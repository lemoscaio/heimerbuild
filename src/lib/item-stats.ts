import {
	type ItemStats,
	STAT_UNITS,
	type StatKey,
} from "../../scripts/sync-data/schemas/item"

export const itemStatLabels: Record<StatKey, string> = {
	attackDamage: "Attack Damage",
	abilityPower: "Ability Power",
	health: "Health",
	mana: "Mana",
	armor: "Armor",
	magicResist: "Magic Resistance",
	abilityHaste: "Ability Haste",
	lethality: "Lethality",
	attackRange: "Attack Range",
	healthRegen: "Health Regen per 5s",
	manaRegen: "Mana Regen per 5s",
	attackSpeedPercent: "Attack Speed",
	attackSpeedMultiplicativePercent: "Total Attack Speed",
	critChancePercent: "Critical Strike Chance",
	critDamagePercent: "Critical Strike Damage",
	armorPenetrationFlat: "Armor Penetration",
	armorPenetrationPercent: "Armor Penetration",
	magicPenetrationFlat: "Magic Penetration",
	magicPenetrationPercent: "Magic Penetration",
	movementSpeedFlat: "Move Speed",
	movementSpeedPercent: "Move Speed",
	lifeStealPercent: "Life Steal",
	omnivampPercent: "Omnivamp",
	tenacityPercent: "Tenacity",
	slowResistPercent: "Slow Resist",
	healAndShieldPowerPercent: "Heal and Shield Power",
	baseHealthRegenPercent: "Base Health Regen",
	baseManaRegenPercent: "Base Mana Regen",
	cooldownPercent: "Cooldowns",
}

export type ItemStatLine = { stat: StatKey; value: string; label: string }

function formatValue(stat: StatKey, value: number) {
	const shown =
		STAT_UNITS[stat] === "percent"
			? `${Number((value * 100).toFixed(1))}%`
			: String(Number(value.toFixed(2)))
	return value < 0 ? shown : `+${shown}`
}

/** An item's stats as display lines ("+25%", "Attack Speed"), in schema order. */
export function itemStatLines(stats: ItemStats): ItemStatLine[] {
	return (Object.keys(STAT_UNITS) as StatKey[]).flatMap((stat) => {
		const value = stats[stat]
		return value === undefined
			? []
			: [{ stat, value: formatValue(stat, value), label: itemStatLabels[stat] }]
	})
}
