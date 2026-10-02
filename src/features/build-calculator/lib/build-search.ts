import { FORM_ID_PATTERN } from "@schemas/champion"
import * as z from "zod/mini"
import { RUNES_PARAM_PATTERN } from "@/lib/rune-selection"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { MAX_ITEMS } from "./build-items"

/** One ability letter per level, level 1 first ("EQWE"); checked against the champion's rules later. */
export const SKILLS_PARAM_PATTERN = /^[QWER]{1,18}$/

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

/** Shareable build in the champion page URL. Invalid values are dropped, never an error page. */
export const buildSearchSchema = z.object({
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
	/** Open center tab: the rune page; absent means the items. */
	tab: z.catch(z.optional(z.literal("runes")), undefined),
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
	/** The picked skill points up to the level; later levels follow the suggested order. */
	skills: z.catch(
		z.optional(z.string().check(z.regex(SKILLS_PARAM_PATTERN))),
		undefined,
	),
})

export type BuildSearch = z.infer<typeof buildSearchSchema>

export type BuildView = "overview" | "shop"

export type BuildTab = "items" | "runes"

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
}

/** The URL search for a build. Defaults (level 1, no items, overview, items tab, no runes, default form, suggested skills) stay out of the URL. */
export function toBuildSearch({
	level,
	itemIds,
	patch,
	view,
	tab,
	runes,
	form,
	skills,
}: BuildState): BuildSearch {
	return {
		lvl: level === MIN_LEVEL ? undefined : level,
		items: itemIds.length ? [...itemIds] : undefined,
		patch,
		view: view === "shop" ? view : undefined,
		tab: tab === "runes" ? tab : undefined,
		form,
		runes,
		skills,
	}
}
