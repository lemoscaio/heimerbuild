import * as z from "zod/mini"
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
	// Per 5 seconds, like champion regen (game files store per second).
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

/** CommunityDragon `epicness` values of the Summoner's Rift shop items; the game omits 0. */
export const ITEM_EPICNESS = [0, 1, 4, 5, 7] as const

const statsShape = Object.fromEntries(
	Object.entries(STAT_UNITS).map(([stat, unit]) => [
		stat,
		z.optional(z.number().check(z.meta({ unit }))),
	]),
) as Record<StatKey, z.ZodMiniOptional<z.ZodMiniNumber>>

export const ItemStatsSchema = z.strictObject(statsShape)

export const ItemSchema = z.strictObject({
	id: z.string().check(z.regex(/^\d+$/)),
	name: z.string(),
	/** Plain text from Data Dragon (`<stats>` block removed); empty when the item has only stats. */
	// Defaults keep browsers that cached an older items.json of the same patch working.
	description: z._default(z.string(), ""),
	/** Short plain-text summary; empty for some items. */
	plaintext: z._default(z.string(), ""),
	/** File name only; the app builds the Data Dragon URL from the patch. */
	icon: z.string().check(z.minLength(1)),
	gold: z.strictObject({
		base: z.number(),
		total: z.number(),
		sell: z.number(),
		purchasable: z.boolean(),
	}),
	tags: z.array(z.string()),
	maps: z.array(z.int()),
	from: z.array(z.string()),
	into: z.array(z.string()),
	inStore: z.boolean(),
	/**
	 * In-game shop tier (CommunityDragon `epicness`): 0 basic, 1 starter, 4 epic,
	 * 5 legendary, 7 elixirs and tier-3 boots.
	 */
	epicness: z.literal(ITEM_EPICNESS),
	requiredChampion: z.optional(z.string()),
	/** In-game shop class filters (CommunityDragon `mItemAttributes`); empty means "All Items" only. */
	roles: z.array(championRoleSchema),
	/** A build holds at most `max` items that share `group` (CommunityDragon item groups: boots, lifeline, ...). */
	groupLimits: z._default(
		z.array(
			z.strictObject({
				group: z.string().check(z.minLength(1)),
				max: z.int().check(z.positive()),
				/** Readable name of a group of several items ("Lifeline"); the shop filters by it. */
				label: z.optional(z.string().check(z.minLength(1))),
			}),
		),
		[],
	),
	/** The item has an active (CommunityDragon `clickable`). */
	active: z._default(z.boolean(), false),
	/** The item applies Grievous Wounds. */
	antiHeal: z._default(z.boolean(), false),
	stats: ItemStatsSchema,
})

export const ItemsFileSchema = z.strictObject({
	version: z.string(),
	items: z.array(ItemSchema),
})

export type ItemStats = z.infer<typeof ItemStatsSchema>
export type Item = z.infer<typeof ItemSchema>
export type ItemsFile = z.infer<typeof ItemsFileSchema>
