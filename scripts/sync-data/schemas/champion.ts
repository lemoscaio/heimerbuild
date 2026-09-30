import * as z from "zod/mini"

/**
 * Canonical champion stats (shared with the item stats in `./item.ts`).
 *
 * | Canonical         | Data Dragon source                  | Unit                    |
 * | ----------------- | ----------------------------------- | ----------------------- |
 * | health            | hp, hpperlevel                      | points                  |
 * | healthRegen       | hpregen, hpregenperlevel            | per 5 seconds           |
 * | mana              | mp, mpperlevel                      | resource points         |
 * | manaRegen         | mpregen, mpregenperlevel            | per 5 seconds           |
 * | armor             | armor, armorperlevel                | points                  |
 * | magicResist       | spellblock, spellblockperlevel      | points                  |
 * | attackDamage      | attackdamage, CDragon perLevel      | points                  |
 * | attackSpeed       | attackspeed, attackspeedperlevel    | attacks/s, % per level  |
 * | critChance        | crit, critperlevel                  | fraction                |
 * | movementSpeed     | movespeed                           | units/s                 |
 * | attackRange       | attackrange                         | units                   |
 *
 * `attackDamage.perLevel` comes from CommunityDragon: Data Dragon ships 0 for every champion.
 * `attackSpeed.ratio` (CommunityDragon) scales bonus attack speed; 0 means it never scales (Jhin).
 */
const growthStat = z.strictObject({
	base: z.number(),
	perLevel: z.number(),
})

export const championStatsSchema = z.strictObject({
	health: growthStat,
	healthRegen: growthStat,
	mana: growthStat,
	manaRegen: growthStat,
	armor: growthStat,
	magicResist: growthStat,
	attackDamage: growthStat,
	attackSpeed: z.strictObject({
		base: z.number().check(z.positive()),
		perLevelPercent: z.number(),
		ratio: z.number().check(z.nonnegative()),
	}),
	critChance: growthStat,
	movementSpeed: growthStat,
	attackRange: growthStat,
})

export const championRoleSchema = z.enum([
	"ASSASSIN",
	"FIGHTER",
	"MAGE",
	"MARKSMAN",
	"SUPPORT",
	"TANK",
])

/** `key` is the Data Dragon string id ("MonkeyKing"), `id` its numeric key (62): swapped vs Data Dragon. */
export const championSummarySchema = z.strictObject({
	key: z.string().check(z.regex(/^\w+$/)),
	id: z.int().check(z.positive()),
	name: z.string().check(z.minLength(1)),
	title: z.string().check(z.minLength(1)),
	roles: z.array(championRoleSchema).check(z.minLength(1)),
	icon: z.url(),
})

export const championIndexSchema = z
	.array(championSummarySchema)
	.check(z.minLength(1))

export const championSchema = z.strictObject({
	...championSummarySchema.shape,
	lore: z.string().check(z.minLength(1)),
	attackType: z.enum(["melee", "ranged"]),
	resource: z.string().check(z.regex(/^[A-Z_]+$/)),
	stats: championStatsSchema,
})

export type ChampionStats = z.infer<typeof championStatsSchema>
export type ChampionRole = z.infer<typeof championRoleSchema>
export type ChampionSummary = z.infer<typeof championSummarySchema>
export type Champion = z.infer<typeof championSchema>
