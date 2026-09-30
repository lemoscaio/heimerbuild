import * as z from "zod/mini"
import { STAT_UNITS, type StatKey } from "./item"

const STAT_KEYS = Object.keys(STAT_UNITS) as [StatKey, ...StatKey[]]

/** Icons are paths under `https://ddragon.leagueoflegends.com/cdn/img/` (not patch-versioned). */
const iconPath = z.string().check(z.regex(/^perk-images\/[\w/ .-]+\.png$/))

const perkId = z.int().check(z.positive())

/** `description` is Data Dragon's short description as plain text. */
export const runeSchema = z.strictObject({
	id: perkId,
	key: z.string().check(z.regex(/^\w+$/)),
	name: z.string().check(z.minLength(1)),
	icon: iconPath,
	description: z.string(),
})

/** A tree: one keystone row, then three rows of regular runes (the secondary tree picks from these). */
export const runeTreeSchema = z.strictObject({
	id: perkId,
	key: z.string().check(z.regex(/^\w+$/)),
	name: z.string().check(z.minLength(1)),
	icon: iconPath,
	keystones: z.array(runeSchema).check(z.minLength(1)),
	rows: z.array(z.array(runeSchema).check(z.minLength(1))).check(z.length(3)),
})

/**
 * One stat a shard gives. `min` applies at level 1 and `max` at level 18, linear in between;
 * they are equal for flat shards. Percent stats are fractions (0.1 means 10%), like item stats.
 * `adaptiveForce` becomes attack damage or ability power in the app.
 */
export const shardStatSchema = z.strictObject({
	stat: z.union([z.enum(STAT_KEYS), z.literal("adaptiveForce")]),
	min: z.number(),
	max: z.number(),
})

export const shardSchema = z.strictObject({
	id: perkId,
	name: z.string().check(z.minLength(1)),
	icon: iconPath,
	description: z.string().check(z.minLength(1)),
	stats: z.array(shardStatSchema).check(z.minLength(1)),
})

/** The three stat shard rows (Offense, Flex, Defense); a shard can appear in several rows. */
export const shardRowSchema = z.strictObject({
	label: z.string().check(z.minLength(1)),
	shardIds: z.array(perkId).check(z.minLength(1)),
})

export const runesFileSchema = z.strictObject({
	version: z.string(),
	trees: z.array(runeTreeSchema).check(z.minLength(2)),
	shards: z.array(shardSchema).check(z.minLength(1)),
	shardRows: z.array(shardRowSchema).check(z.length(3)),
})

export type Rune = z.infer<typeof runeSchema>
export type RuneTree = z.infer<typeof runeTreeSchema>
export type ShardStat = z.infer<typeof shardStatSchema>
export type Shard = z.infer<typeof shardSchema>
export type ShardRow = z.infer<typeof shardRowSchema>
export type RunesFile = z.infer<typeof runesFileSchema>
