import type { StatKey } from "@schemas/item"
import apIcon from "@/assets/stats-icons/ability-power-icon.png"
import armorIcon from "@/assets/stats-icons/armor-icon.png"
import armorPenIcon from "@/assets/stats-icons/armor-penetration-icon.png"
import adIcon from "@/assets/stats-icons/attack-damage-icon.png"
import attackSpeedIcon from "@/assets/stats-icons/attack-speed-icon.png"
import bloodWellIcon from "@/assets/stats-icons/blood-well-icon.svg"
import abilityHasteIcon from "@/assets/stats-icons/cooldown-reduction-icon.png"
import courageIcon from "@/assets/stats-icons/courage-icon.svg"
import crimsonRushIcon from "@/assets/stats-icons/crimson-rush-icon.svg"
import critIcon from "@/assets/stats-icons/critical-strike-chance-icon.png"
import critDamageIcon from "@/assets/stats-icons/critical-strike-damage-icon.png"
import energyIcon from "@/assets/stats-icons/energy-icon.svg"
import ferocityIcon from "@/assets/stats-icons/ferocity-icon.svg"
import flowIcon from "@/assets/stats-icons/flow-icon.svg"
import frenzyIcon from "@/assets/stats-icons/frenzy-icon.svg"
import furyIcon from "@/assets/stats-icons/fury-icon.svg"
import gritIcon from "@/assets/stats-icons/grit-icon.svg"
import healAndShieldPowerIcon from "@/assets/stats-icons/heal-and-shield-power-icon.png"
import healthIcon from "@/assets/stats-icons/heal-power.png"
import heatIcon from "@/assets/stats-icons/heat-icon.svg"
import lifeStealIcon from "@/assets/stats-icons/life-steal-icon.png"
import magicPenIcon from "@/assets/stats-icons/magic-penetration-icon.png"
import mrIcon from "@/assets/stats-icons/magic-resistance-icon.png"
import manaIcon from "@/assets/stats-icons/mana-icon.png"
import manaRegenIcon from "@/assets/stats-icons/mana-regeneration-icon.png"
import moveSpeedIcon from "@/assets/stats-icons/movement-speed-icon.png"
import omnivampIcon from "@/assets/stats-icons/omnivamp-icon.png"
import rageIcon from "@/assets/stats-icons/rage-icon.svg"
import rangeIcon from "@/assets/stats-icons/range-icon.png"
import unknownResourceIcon from "@/assets/stats-icons/resource-icon.svg"
import shieldIcon from "@/assets/stats-icons/shield-icon.svg"
import slowResistIcon from "@/assets/stats-icons/slow-immune-icon.png"
import tenacityIcon from "@/assets/stats-icons/tenacity-icon.png"
import type { StatName } from "./stats/compute-stats"

export type StatGroup = "offense" | "defense" | "utility"

/** The stat panel and the shop's stat rail group stats the same way, in this order. */
export const statGroups: readonly { group: StatGroup; label: string }[] = [
	{ group: "offense", label: "Offense" },
	{ group: "defense", label: "Defense" },
	{ group: "utility", label: "Utility" },
]

type StatDisplay = {
	/** The stat's name in the stats panel, the shop filters and the sort menu. */
	label: string
	/** The name on an item's stat line ("+25%" beside it), when it differs from `label`. */
	itemLabel?: string
	icon: string
	group: StatGroup
}

/** How every stat is shown: item stats (`StatKey`) and computed champion stats (`StatName`). */
export const statDisplay: Readonly<Record<StatKey | StatName, StatDisplay>> = {
	attackDamage: { label: "Attack Damage", icon: adIcon, group: "offense" },
	abilityPower: { label: "Ability Power", icon: apIcon, group: "offense" },
	health: { label: "Health", icon: healthIcon, group: "defense" },
	mana: { label: "Mana", icon: manaIcon, group: "utility" },
	armor: { label: "Armor", icon: armorIcon, group: "defense" },
	magicResist: { label: "Magic Resistance", icon: mrIcon, group: "defense" },
	abilityHaste: {
		label: "Ability Haste",
		icon: abilityHasteIcon,
		group: "utility",
	},
	lethality: { label: "Lethality", icon: armorPenIcon, group: "offense" },
	attackRange: { label: "Attack Range", icon: rangeIcon, group: "utility" },
	healthRegen: {
		label: "Health Regen",
		itemLabel: "Health Regen per 5s",
		icon: healthIcon,
		group: "defense",
	},
	manaRegen: {
		label: "Mana Regen",
		itemLabel: "Mana Regen per 5s",
		icon: manaIcon,
		group: "utility",
	},
	attackSpeed: {
		label: "Attack Speed",
		icon: attackSpeedIcon,
		group: "offense",
	},
	attackSpeedPercent: {
		label: "Attack Speed",
		icon: attackSpeedIcon,
		group: "offense",
	},
	attackSpeedMultiplicativePercent: {
		label: "Total Attack Speed",
		icon: attackSpeedIcon,
		group: "offense",
	},
	critChance: { label: "Critical Strike", icon: critIcon, group: "offense" },
	critChancePercent: {
		label: "Critical Strike Chance",
		icon: critIcon,
		group: "offense",
	},
	critDamagePercent: {
		label: "Critical Strike Damage",
		icon: critDamageIcon,
		group: "offense",
	},
	armorPenetrationFlat: {
		label: "Armor Penetration",
		icon: armorPenIcon,
		group: "offense",
	},
	armorPenetrationPercent: {
		label: "Armor Penetration",
		icon: armorPenIcon,
		group: "offense",
	},
	magicPenetrationFlat: {
		label: "Flat Magic Penetration",
		itemLabel: "Magic Penetration",
		icon: magicPenIcon,
		group: "offense",
	},
	magicPenetrationPercent: {
		label: "Percent Magic Penetration",
		itemLabel: "Magic Penetration",
		icon: magicPenIcon,
		group: "offense",
	},
	movementSpeed: {
		label: "Movement Speed",
		icon: moveSpeedIcon,
		group: "utility",
	},
	movementSpeedFlat: {
		label: "Flat Move Speed",
		itemLabel: "Move Speed",
		icon: moveSpeedIcon,
		group: "utility",
	},
	movementSpeedPercent: {
		label: "Percent Move Speed",
		itemLabel: "Move Speed",
		icon: moveSpeedIcon,
		group: "utility",
	},
	lifeStealPercent: {
		label: "Life Steal",
		icon: lifeStealIcon,
		group: "offense",
	},
	omnivampPercent: { label: "Omnivamp", icon: omnivampIcon, group: "offense" },
	tenacityPercent: { label: "Tenacity", icon: tenacityIcon, group: "defense" },
	slowResistPercent: {
		label: "Slow Resist",
		icon: slowResistIcon,
		group: "utility",
	},
	healAndShieldPowerPercent: {
		label: "Heal and Shield Power",
		icon: healAndShieldPowerIcon,
		group: "defense",
	},
	baseHealthRegenPercent: {
		label: "Base Health Regen",
		icon: healthIcon,
		group: "defense",
	},
	baseManaRegenPercent: {
		label: "Base Mana Regen",
		icon: manaRegenIcon,
		group: "utility",
	},
	cooldownPercent: {
		label: "Cooldowns",
		icon: abilityHasteIcon,
		group: "utility",
	},
}

type ResourceDisplay = {
	label: string
	icon: string
	/** How the resource works, for one with no fixed size in the data. */
	description?: string
}

/** Every champion `resource` in patch 16.19.1 data. Its icon marks the regen row too, as Mana's does. */
const resourceDisplays: Readonly<Record<string, ResourceDisplay>> = {
	BLOOD_WELL: {
		label: "Blood Well",
		icon: bloodWellIcon,
		description:
			"Aatrox's abilities cost nothing. The bar shows how long World Ender has left; champion takedowns extend it.",
	},
	COURAGE: { label: "Courage", icon: courageIcon },
	CRIMSON_RUSH: { label: "Crimson Rush", icon: crimsonRushIcon },
	ENERGY: { label: "Energy", icon: energyIcon },
	FEROCITY: { label: "Ferocity", icon: ferocityIcon },
	FLOW: { label: "Flow", icon: flowIcon },
	FRENZY: {
		label: "Frenzy",
		icon: frenzyIcon,
		description:
			"Briar's abilities cost a share of her current health. The bar shows how long her frenzy lasts once Blood Frenzy or Certain Death finds a target.",
	},
	FURY: { label: "Fury", icon: furyIcon },
	GRIT: {
		label: "Grit",
		icon: gritIcon,
		description:
			"Sett stores damage he takes as Grit, up to 50% of his maximum health. It decays when he is not hit, and Haymaker spends it all on a shield and damage.",
	},
	HEAT: { label: "Heat", icon: heatIcon },
	MANA: { label: "Mana", icon: manaIcon },
	RAGE: { label: "Rage", icon: rageIcon },
	SHIELD: { label: "Shield", icon: shieldIcon },
}

/** How a champion `resource` is shown; one from a later patch reads as words ("SOUL_FLAME": "Soul Flame") with a neutral icon. */
export function resourceDisplay(resource: string): ResourceDisplay {
	return (
		resourceDisplays[resource] ?? {
			label: resource
				.toLowerCase()
				.split("_")
				.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
				.join(" "),
			icon: unknownResourceIcon,
		}
	)
}

export type StatFormat = "flat" | "percent" | "attackSpeed"

/** Attack speed is attacks per second (no unit); percent stats are stored as fractions. */
export function formatStat(value: number, format: StatFormat = "flat") {
	if (format === "percent") return `${Number((value * 100).toFixed(1))}%`
	if (format === "attackSpeed") return value.toFixed(3)
	return String(Number(value.toFixed(2)))
}
