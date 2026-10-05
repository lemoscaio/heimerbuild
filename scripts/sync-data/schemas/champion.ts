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

/** The four ranked abilities, in Data Dragon's `spells` order. */
export const ABILITY_SLOTS = ["Q", "W", "E", "R"] as const

export const abilitySlotSchema = z.enum(ABILITY_SLOTS)

/** A form id, as the share link carries it (`?form=mega`). */
export const FORM_ID_PATTERN = /^[a-z]+(?:-[a-z]+)*$/

/** A form the player switches to (Mega Gnar, Cougar Nidalee). */
export const championFormSchema = z.strictObject({
	id: z.string().check(z.regex(FORM_ID_PATTERN)),
	/** "Mega Gnar" */
	name: z.string().check(z.minLength(1)),
	/** The game's own name, when `name` is a plainer one ("Pow-Pow" for Minigun). */
	gameName: z.optional(z.string().check(z.minLength(1))),
	/** The ability rank the form needs: Shyvana turns into a dragon once R has a point. */
	requires: z.optional(
		z.strictObject({
			slot: abilitySlotSchema,
			minRank: z.int().check(z.gte(1)),
		}),
	),
	attackType: z.optional(attackTypeSchema),
	/** Replaces the champion's growth stats it lists. */
	stats: z.optional(z.partial(championStatsSchema)),
	/** Replaces the champion's level states: a form without them has none (Mega Gnar keeps 175 range). */
	levelStates: z.optional(levelStatesSchema),
})

const DEFAULT_FORM_FIELDS = new Set(["id", "name", "gameName"])

/** The first form is the default: the champion's own data, so it carries only its names. */
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

/** A list with one value per rank, from rank 1. */
const perRankSchema = z.array(z.number()).check(z.minLength(1))

/**
 * One line of the game's rank-up tooltip ("Damage 80 → 125"), resolved from Data Dragon's
 * `leveltip` and the CommunityDragon spell values. `unit: "%"` values are already multiplied.
 */
export const abilityRankValueSchema = z.strictObject({
	label: z.string().check(z.minLength(1)),
	values: perRankSchema,
	unit: z.optional(z.literal("%")),
})

/** "70 Mana" per rank (`unit` after the number), or a fixed text such as "No Cost". */
const abilityCostSchema = z.union([
	z.strictObject({ values: perRankSchema, unit: z.string() }),
	z.strictObject({ text: z.string().check(z.minLength(1)) }),
])

const passiveSchema = z.strictObject({
	name: z.string().check(z.minLength(1)),
	/** Plain text: Data Dragon's markup removed, line breaks kept. */
	description: z.string(),
	icon: z.url(),
})

export const championSpellSchema = z
	.strictObject({
		slot: abilitySlotSchema,
		name: z.string().check(z.minLength(1)),
		/** Plain text: Data Dragon's markup removed, line breaks kept. */
		description: z.string(),
		icon: z.url(),
		maxRank: z.int().check(z.gte(1), z.lte(6)),
		/** Seconds per rank. */
		cooldown: perRankSchema,
		/** Absent when Riot's cost text needs values the data does not have. */
		cost: z.optional(abilityCostSchema),
		/** What changes at each rank, as the game's rank-up tooltip lists it. */
		rankValues: z.array(abilityRankValueSchema),
	})
	.check(
		z.refine(
			({ maxRank, cooldown, cost, rankValues }) =>
				[
					cooldown,
					cost && "values" in cost ? cost.values : cooldown,
					...rankValues.map(({ values }) => values),
				].every((values) => values.length === maxRank),
			{ error: "per-rank values must have one value per rank" },
		),
	)

/**
 * The game's recommended skill order (CommunityDragon `RecSpellRankUpInfo`): `firstPoints` for
 * the first levels, then `priority` decides which ability to max (absent when Riot leaves it unset).
 */
const recommendedSkillOrderSchema = z.strictObject({
	firstPoints: z.array(abilitySlotSchema),
	priority: z.optional(
		z.array(abilitySlotSchema).check(
			z.length(ABILITY_SLOTS.length),
			z.refine((slots) => new Set(slots).size === slots.length, {
				error: "priority must list each ability once",
			}),
		),
	),
})

/** The abilities a form swaps in, by slot (Cannon Jayce's Q is Shock Blast); a slot left out keeps the default form's. */
const formSpellsSchema = perAbility(championSpellSchema)

export const championAbilitiesSchema = z
	.strictObject({
		passive: passiveSchema,
		/** Q, W, E and R, in that order: the default form's, for a champion with forms. */
		spells: z
			.tuple([
				championSpellSchema,
				championSpellSchema,
				championSpellSchema,
				championSpellSchema,
			])
			.check(
				z.refine(
					(spells) =>
						spells.every(({ slot }, index) => slot === ABILITY_SLOTS[index]),
					{ error: "spells must be Q, W, E and R in order" },
				),
			),
		recommendedOrder: z.optional(recommendedSkillOrderSchema),
		/** By form id, the abilities another form swaps in; synced by `FORM_ABILITY_RULES`. */
		forms: z.optional(
			z.record(z.string().check(z.regex(FORM_ID_PATTERN)), formSpellsSchema),
		),
	})
	.check(
		z.refine(
			({ spells, forms }) =>
				Object.values(forms ?? {}).every((formSpells) =>
					ABILITY_SLOTS.every((slot, index) => {
						const formSpell = formSpells[slot]
						return (
							!formSpell ||
							(formSpell.slot === slot &&
								formSpell.maxRank === spells[index]?.maxRank)
						)
					}),
				),
			{
				error:
					"a form's ability must sit in its own slot with the default ability's max rank (ranks are per slot)",
			},
		),
	)

/** A value for some of the four abilities. */
function perAbility<Schema extends z.ZodMiniType>(schema: Schema) {
	return z.strictObject({
		Q: z.optional(schema),
		W: z.optional(schema),
		E: z.optional(schema),
		R: z.optional(schema),
	})
}

/**
 * How a champion's skill points differ from the game's default: one point per level, a basic
 * ability's rank n at level 2n - 1, R at 6/11/16. Curated in `overrides/champion-skill-rules.ts`.
 */
export const skillRulesSchema = z.strictObject({
	/** Ranks the champion starts with, without spending a point (Elise's R, Yuumi's W). */
	innateRanks: z.optional(perAbility(z.int().check(z.gte(1), z.lte(6)))),
	/** The champion level each rank needs, rank 1 first (innate ranks included); replaces the default. */
	rankLevels: z.optional(
		perAbility(
			z.array(z.int().check(z.gte(1), z.lte(18))).check(z.minLength(1)),
		),
	),
	/** Abilities that need a point in one of the listed ones first (Shen's W needs Q). */
	requires: z.optional(
		perAbility(z.array(abilitySlotSchema).check(z.minLength(1))),
	),
	/** The level 1 point the game spends by itself (Azir's W). */
	firstPoint: z.optional(abilitySlotSchema),
	/** The points raise stats, not abilities (Aphelios): the champion has no skill order. */
	statPoints: z.optional(z.literal(true)),
})

/** The champion level each rank needs by default, rank 1 first: a basic ability every odd level, R at 6/11/16. */
export const DEFAULT_RANK_LEVELS = {
	basic: [1, 3, 5, 7, 9, 11],
	ultimate: [6, 11, 16],
} as const

/** The level each rank of `slot` needs, rank 1 first: the champion's rule, else the default. */
export function rankLevelsOf(
	skillRules: SkillRules | undefined,
	slot: AbilitySlot,
): readonly number[] {
	return (
		skillRules?.rankLevels?.[slot] ??
		(slot === "R" ? DEFAULT_RANK_LEVELS.ultimate : DEFAULT_RANK_LEVELS.basic)
	)
}

/** Every rank of every ability has a level to unlock at, and innate ranks fit in the max rank. */
export function skillRulesFitAbilities({
	abilities,
	skillRules,
}: {
	abilities: ChampionAbilities
	skillRules?: SkillRules
}): boolean {
	return abilities.spells.every(
		({ slot, maxRank }) =>
			(skillRules?.innateRanks?.[slot] ?? 0) <= maxRank &&
			rankLevelsOf(skillRules, slot).length >= maxRank,
	)
}

/** Every form that swaps abilities in is one of the champion's forms, and not its default one. */
export function formAbilitiesFitForms({
	abilities,
	forms,
}: Pick<Champion, "abilities" | "forms">): boolean {
	return Object.keys(abilities.forms ?? {}).every((formId) =>
		forms?.slice(1).some(({ id }) => id === formId),
	)
}

/** Stats an ability rank can grant; a subset of the item stat keys, with the same units. */
export const RANK_STATS = [
	"attackSpeedPercent",
	"movementSpeedPercent",
	"armor",
	"magicResist",
	"armorPenetrationPercent",
	"magicPenetrationPercent",
] as const

/** A stat an ability grants by rank alone (Twisted Fate's E: 15% to 55% attack speed). */
export const rankStatSchema = z.strictObject({
	slot: abilitySlotSchema,
	stat: z.enum(RANK_STATS),
	/** One per rank, from rank 1; percents are fractions, like the item stats. */
	values: perRankSchema,
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
	attackType: attackTypeSchema,
	resource: z.string().check(z.regex(/^[A-Z_]+$/)),
	/** What Adaptive Force becomes when bonus AD and AP are equal (CommunityDragon `mAdaptiveForceToAbilityPowerWeight`). */
	adaptiveType: z.enum(["ad", "ap"]),
	stats: championStatsSchema,
	/** Passive and Q/W/E/R: names, icons, ranks and per-rank values (no scalings or damage). */
	abilities: championAbilitiesSchema,
	/** Applied by the skill order; absent means the default rules. */
	skillRules: z.optional(skillRulesSchema),
	/** Applied by the stats engine from the ability ranks; synced by `RANK_STAT_RULES`. */
	rankStats: z.optional(z.array(rankStatSchema).check(z.minLength(1))),
	/** Applied by the stats engine from the selected level; curated in `overrides/champion-level-states.ts`. */
	levelStates: z.optional(levelStatesSchema),
	/** Picked by the player, applied by the stats engine; curated in `overrides/champion-forms.ts`. */
	forms: z.optional(championFormsSchema),
})

export type ChampionStats = z.infer<typeof championStatsSchema>
export type LevelState = z.infer<typeof levelStateSchema>
export type ChampionForm = z.infer<typeof championFormSchema>
export type AbilitySlot = z.infer<typeof abilitySlotSchema>
export type AbilityRankValue = z.infer<typeof abilityRankValueSchema>
export type ChampionSpell = z.infer<typeof championSpellSchema>
export type ChampionAbilities = z.infer<typeof championAbilitiesSchema>
export type SkillRules = z.infer<typeof skillRulesSchema>
export type RankStat = z.infer<typeof rankStatSchema>
export type ChampionRole = z.infer<typeof championRoleSchema>
export type ChampionSummary = z.infer<typeof championSummarySchema>
export type Champion = z.infer<typeof championSchema>
