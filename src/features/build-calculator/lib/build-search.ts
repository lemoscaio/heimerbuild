import { FORM_ID_PATTERN } from "@schemas/champion"
import * as z from "zod/mini"
import { RUNES_PARAM_PATTERN } from "@/lib/rune-selection"
import { UNSPENT_LEVEL_MARK } from "@/lib/skill-order-param"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { SUMMONERS_PARAM_PATTERN } from "@/lib/summoner-slots"
import { MAX_ITEMS } from "./build-items"
import {
	BUILD_LINK_MIGRATIONS,
	BUILD_LINK_VERSION,
	migrateBuildLink,
	type RawBuildSearch,
} from "./build-link-migrations"

/** One ability letter per level, level 1 first, `_` for an unspent level ("EQ_E"); checked against the champion's rules later. */
export const SKILLS_PARAM_PATTERN = new RegExp(
	`^[QWER${UNSPENT_LEVEL_MARK}]{1,18}$`,
)

// The router JSON-parses each value: `items=3089` arrives as a number,
// `items=3089,3020` as a string and `items=[3089,3020]` as an array.
const itemIdsSchema = z.pipe(
	z.union([
		z.pipe(
			z.string(),
			z.transform((value) => value.split(",")),
		),
		z.pipe(
			z.number(),
			z.transform((value) => [String(value)]),
		),
		z.pipe(
			z.array(z.union([z.string(), z.number()])),
			z.transform((values) => values.map(String)),
		),
	]),
	z.array(z.string().check(z.regex(/^\d+$/))).check(z.maxLength(MAX_ITEMS)),
)

// `summoners=4,14` arrives as a string; a hand-typed `summoners=4` as a number: Flash in D.
const summonersSchema = z.union([
	z.string().check(z.regex(SUMMONERS_PARAM_PATTERN)),
	z.pipe(
		z.int().check(z.nonnegative()),
		z.transform((value) => `${value},`),
	),
])

/** Shareable build in the champion page URL, in the latest link format. Invalid values are dropped, never an error page. */
export const buildSearchSchema = z.object({
	/** The link format version; read links are migrated to it first (`readBuildSearch`). */
	v: z.catch(z.optional(z.literal(BUILD_LINK_VERSION)), undefined),
	lvl: z.catch(
		z.optional(z.int().check(z.gte(MIN_LEVEL), z.lte(MAX_LEVEL))),
		undefined,
	),
	items: z.catch(z.optional(itemIdsSchema), undefined),
	patch: z.catch(
		z.optional(z.string().check(z.regex(/^\d+\.\d+\.\d+$/))),
		undefined,
	),
	/** Page layout: the expanded shop; absent means the overview. */
	view: z.catch(z.optional(z.literal("shop")), undefined),
	/** Open center tab: the rune page or the skills; absent means the items. */
	tab: z.catch(z.optional(z.enum(["runes", "skills"])), undefined),
	/** The champion's form (`mega`); an id the champion does not have means its default form. */
	form: z.catch(
		z.optional(z.string().check(z.regex(FORM_ID_PATTERN))),
		undefined,
	),
	/** Rune page in the compact form of `serializeRuneSelection`; checked against the data later. */
	runes: z.catch(
		z.optional(z.string().check(z.regex(RUNES_PARAM_PATTERN))),
		undefined,
	),
	/** The spent skill points up to the level; levels it leaves out are unspent. */
	skills: z.catch(
		z.optional(z.string().check(z.regex(SKILLS_PARAM_PATTERN))),
		undefined,
	),
	/** The two summoner spells, D then F (`serializeSummonerSlots`); checked against the data later. */
	summoners: z.catch(z.optional(summonersSchema), undefined),
})

export type BuildSearch = z.infer<typeof buildSearchSchema>

/** Reads a build link of any version: migrates it to the latest format, then checks it. */
export function readBuildSearch(search: RawBuildSearch): BuildSearch {
	return buildSearchSchema.parse(
		migrateBuildLink(search, BUILD_LINK_MIGRATIONS),
	)
}

export type BuildView = "overview" | "shop"

export type BuildTab = "items" | "runes" | "skills"

export type BuildState = {
	level: number
	itemIds: readonly string[]
	patch: string | undefined
	view?: BuildView
	tab?: BuildTab
	/** `serializeRuneSelection` output; `undefined` for no runes. */
	runes?: string
	/** A form other than the champion's default; `undefined` for the default. */
	form?: string
	/** The picked skill points; `undefined` for the suggested order. */
	skills?: string
	/** `serializeSummonerSlots` output; `undefined` for two empty slots. */
	summoners?: string
}

/** The URL search for a build, in the latest link format. Defaults (level 1, no items, overview, items tab, no runes, default form, suggested skills, no summoner spells) stay out of the URL. */
export function toBuildSearch({
	level,
	itemIds,
	patch,
	view,
	tab,
	runes,
	form,
	skills,
	summoners,
}: BuildState): BuildSearch {
	return {
		lvl: level === MIN_LEVEL ? undefined : level,
		items: itemIds.length ? [...itemIds] : undefined,
		patch,
		view: view === "shop" ? view : undefined,
		tab: tab === "items" ? undefined : tab,
		form,
		runes,
		skills,
		summoners,
		v: BUILD_LINK_VERSION,
	}
}
