import { z } from "zod"
import { championRoleSchema } from "./champion"

/** `percent` values are fractions: 0.1 means 10%. */
export type StatUnit = "flat" | "percent"

export const STAT_UNITS = {
	attackDamage: "flat",
	abilityPower: "flat",
	health: "flat",
	mana: "flat",
	armor: "flat",
	magicResist: "flat",
	abilityHaste: "flat",
	lethality: "flat",
	attackRange: "flat",
	healthRegen: "flat",
	manaRegen: "flat",
	attackSpeedPercent: "percent",
	attackSpeedMultiplicativePercent: "percent",
	critChancePercent: "percent",
	critDamagePercent: "percent",
	armorPenetrationFlat: "flat",
	armorPenetrationPercent: "percent",
	magicPenetrationFlat: "flat",
	magicPenetrationPercent: "percent",
	movementSpeedFlat: "flat",
	movementSpeedPercent: "percent",
	lifeStealPercent: "percent",
	omnivampPercent: "percent",
	tenacityPercent: "percent",
	slowResistPercent: "percent",
	healAndShieldPowerPercent: "percent",
	baseHealthRegenPercent: "percent",
	baseManaRegenPercent: "percent",
	// Raw cooldown multiplier delta: -0.1 means 10% shorter cooldowns.
	cooldownPercent: "percent",
} as const satisfies Record<string, StatUnit>

export type StatKey = keyof typeof STAT_UNITS

const statsShape = Object.fromEntries(
	Object.entries(STAT_UNITS).map(([stat, unit]) => [
		stat,
		z.number().meta({ unit }).optional(),
	]),
) as Record<StatKey, z.ZodOptional<z.ZodNumber>>

export const ItemStatsSchema = z.strictObject(statsShape)

export const ItemSchema = z.strictObject({
	id: z.string().regex(/^\d+$/),
	name: z.string(),
	icon: z.string().min(1),
	gold: z.strictObject({
		base: z.number(),
		total: z.number(),
		sell: z.number(),
		purchasable: z.boolean(),
	}),
	tags: z.array(z.string()),
	maps: z.array(z.number().int()),
	from: z.array(z.string()),
	into: z.array(z.string()),
	inStore: z.boolean(),
	requiredChampion: z.string().optional(),
	/** In-game shop class filters (CommunityDragon `mItemAttributes`); empty means "All Items" only. */
	roles: z.array(championRoleSchema),
	stats: ItemStatsSchema,
})

export const ItemsFileSchema = z.strictObject({
	version: z.string(),
	items: z.array(ItemSchema),
})

export type ItemStats = z.infer<typeof ItemStatsSchema>
export type Item = z.infer<typeof ItemSchema>
export type ItemsFile = z.infer<typeof ItemsFileSchema>
