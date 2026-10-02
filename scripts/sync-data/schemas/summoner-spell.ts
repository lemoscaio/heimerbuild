import * as z from "zod/mini"
import { richTextSchema } from "./rune"

/** Champion levels the per-level values cover (1 to 18, like the build's level). */
export const SUMMONER_SPELL_LEVELS = 18

/** One number per champion level, level 1 first. A value that never changes repeats it. */
const perLevelSchema = z
	.array(z.number())
	.check(z.length(SUMMONER_SPELL_LEVELS))

/** Smite's ammo: casts stored, and the seconds each one takes to come back. */
export const summonerSpellChargesSchema = z.strictObject({
	count: z.int().check(z.gte(2)),
	rechargeTime: z.number().check(z.positive()),
})

/**
 * A Summoner's Rift summoner spell. `id` is Riot's numeric key (`"4"` for Flash), the one build
 * links use. `values` holds the game files' values by lowercase name (`totalheal`), per level,
 * as the files write them: Ignite's `grievousamount` is 0.4 but Exhaust's `slow` is 40.
 */
export const summonerSpellSchema = z.strictObject({
	id: z.string().check(z.regex(/^\d+$/)),
	key: z.string().check(z.regex(/^\w+$/)),
	name: z.string().check(z.minLength(1)),
	icon: z.url(),
	/** Seconds between casts; with `charges`, between two casts of stored charges. */
	cooldown: z.number().check(z.positive()),
	charges: z.optional(summonerSpellChargesSchema),
	/** Data Dragon's short description, as plain text. */
	description: z.string().check(z.minLength(1)),
	/** The in-game tooltip with its numbers ("70–475" for a value that grows with level). */
	longDescription: richTextSchema.check(z.minLength(1)),
	values: z.record(z.string().check(z.regex(/^[a-z0-9]+$/)), perLevelSchema),
})

export const summonerSpellsFileSchema = z.strictObject({
	version: z.string(),
	spells: z.array(summonerSpellSchema).check(z.minLength(2)),
})

export type SummonerSpellCharges = z.infer<typeof summonerSpellChargesSchema>
export type SummonerSpell = z.infer<typeof summonerSpellSchema>
export type SummonerSpellsFile = z.infer<typeof summonerSpellsFileSchema>
