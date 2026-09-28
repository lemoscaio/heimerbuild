import type { StatKey } from "./schemas/item"

/** CommunityDragon `ItemData` field -> canonical stat. Values are copied as-is (float noise rounded). */
export const STAT_FIELDS = {
	mFlatPhysicalDamageMod: "attackDamage",
	mFlatMagicDamageMod: "abilityPower",
	mFlatHPPoolMod: "health",
	flatMPPoolMod: "mana",
	mFlatArmorMod: "armor",
	mFlatSpellBlockMod: "magicResist",
	mAbilityHasteMod: "abilityHaste",
	// Lethality is a top-level field, not an m...Mod one (Serrated Dirk 3134).
	PhysicalLethality: "lethality",
	mFlatAttackRangeMod: "attackRange",
	mFlatHPRegenMod: "healthRegen",
	flatMPRegenMod: "manaRegen",
	mPercentAttackSpeedMod: "attackSpeedPercent",
	mPercentMultiplicativeAttackSpeedMod: "attackSpeedMultiplicativePercent",
	// Despite the "Flat" prefix these are fractions (Infinity Edge crit chance 0.25).
	mFlatCritChanceMod: "critChancePercent",
	mFlatCritDamageMod: "critDamagePercent",
	mFlatArmorPenetrationMod: "armorPenetrationFlat",
	mPercentArmorPenetrationMod: "armorPenetrationPercent",
	mFlatMagicPenetrationMod: "magicPenetrationFlat",
	mPercentMagicPenetrationMod: "magicPenetrationPercent",
	mFlatMovementSpeedMod: "movementSpeedFlat",
	mPercentMovementSpeedMod: "movementSpeedPercent",
	mPercentLifeStealMod: "lifeStealPercent",
	PercentOmnivampMod: "omnivampPercent",
	mPercentTenacityItemMod: "tenacityPercent",
	mPercentSlowResistMod: "slowResistPercent",
	mPercentHealingAmountMod: "healAndShieldPowerPercent",
	mPercentBaseHPRegenMod: "baseHealthRegenPercent",
	percentBaseMPRegenMod: "baseManaRegenPercent",
	mPercentCooldownMod: "cooldownPercent",
} as const satisfies Record<string, StatKey>

/** Numeric `ItemData` fields known not to be stats. */
export const NON_STAT_FIELDS: ReadonlySet<string> = new Set([
	"itemID",
	"price",
	"maxStack",
	"sellBackModifier",
	"specialRecipe",
	"epicness",
	"SecondaryEpicness",
	"ShopOrderPriority",
	"clearUndoHistory",
	"mRequiredLevel",
	"mRequiredBuffCurrencyCost",
	"mCooldownShowDisabledDuration",
	"LastMajorChangeMajorPatchVersion",
	"LastMajorChangeMinorPatchVersion",
	// Hashed name; holds the base item ID of a support-quest variant (322526 -> 2526).
	"{4f958685}",
])

export function isStatField(field: string): field is keyof typeof STAT_FIELDS {
	return Object.hasOwn(STAT_FIELDS, field)
}
