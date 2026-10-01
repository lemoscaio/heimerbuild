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

const attackTypeSchema = z.enum(["melee", "ranged"])

/** `perLevel` counts from level 1; `growth: "linear"` adds it once per level instead of following the growth curve. */
const levelStateStat = z.strictObject({
	base: z.number(),
	perLevel: z.number(),
	growth: z.optional(z.literal("linear")),
})

/** What a champion becomes from `fromLevel` on, with no player choice (Kayle turns ranged at 6). */
export const levelStateSchema = z.strictObject({
	fromLevel: z.int().check(z.gte(1), z.lte(18)),
	attackType: z.optional(attackTypeSchema),
	attackRange: z.optional(levelStateStat),
})

/** Strictly ascending `fromLevel`, so the states reached at a level are a prefix of the list. */
const levelStatesSchema = z.array(levelStateSchema).check(
	z.minLength(1),
	z.refine(
		(states) =>
			states.every(
				(state, index) =>
					index === 0 || (states[index - 1]?.fromLevel ?? 0) < state.fromLevel,
			),
		{ error: "levelStates must have strictly ascending fromLevel" },
	),
)

/** A form id, as the share link carries it (`?form=mega`). */
export const FORM_ID_PATTERN = /^[a-z]+(?:-[a-z]+)*$/

/** A form the player switches to (Mega Gnar, Cougar Nidalee). */
export const championFormSchema = z.strictObject({
	id: z.string().check(z.regex(FORM_ID_PATTERN)),
	/** "Mega Gnar" */
	name: z.string().check(z.minLength(1)),
	attackType: z.optional(attackTypeSchema),
	/** Replaces the champion's growth stats it lists. */
	stats: z.optional(z.partial(championStatsSchema)),
	/** Replaces the champion's level states: a form without them has none (Mega Gnar keeps 175 range). */
	levelStates: z.optional(levelStatesSchema),
})

const DEFAULT_FORM_FIELDS = new Set(["id", "name"])

/** The first form is the default: the champion's own data, so it carries only `id` and `name`. */
const championFormsSchema = z.array(championFormSchema).check(
	z.minLength(2),
	z.refine(
		(forms) => new Set(forms.map(({ id }) => id)).size === forms.length,
		{ error: "forms must have unique ids" },
	),
	z.refine(
		([defaultForm]) =>
			Object.keys(defaultForm ?? {}).every((field) =>
				DEFAULT_FORM_FIELDS.has(field),
			),
		{ error: "the default (first) form takes its values from the champion" },
	),
)

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
	attackType: attackTypeSchema,
	resource: z.string().check(z.regex(/^[A-Z_]+$/)),
	/** What Adaptive Force becomes when bonus AD and AP are equal (CommunityDragon `mAdaptiveForceToAbilityPowerWeight`). */
	adaptiveType: z.enum(["ad", "ap"]),
	stats: championStatsSchema,
	/** Applied by the stats engine from the selected level; curated in `overrides/champion-level-states.ts`. */
	levelStates: z.optional(levelStatesSchema),
	/** Picked by the player, applied by the stats engine; curated in `overrides/champion-forms.ts`. */
	forms: z.optional(championFormsSchema),
})

export type ChampionStats = z.infer<typeof championStatsSchema>
export type LevelState = z.infer<typeof levelStateSchema>
export type ChampionForm = z.infer<typeof championFormSchema>
export type ChampionRole = z.infer<typeof championRoleSchema>
export type ChampionSummary = z.infer<typeof championSummarySchema>
export type Champion = z.infer<typeof championSchema>
