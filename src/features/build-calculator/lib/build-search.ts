import * as z from "zod/mini"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { MAX_ITEMS } from "./build-items"

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
})

export type BuildSearch = z.infer<typeof buildSearchSchema>

export type BuildView = "overview" | "shop"

export type BuildState = {
	level: number
	itemIds: readonly string[]
	patch: string | undefined
	view?: BuildView
}

/** The URL search for a build. Defaults (level 1, no items, overview) stay out of the URL. */
export function toBuildSearch({
	level,
	itemIds,
	patch,
	view,
}: BuildState): BuildSearch {
	return {
		lvl: level === MIN_LEVEL ? undefined : level,
		items: itemIds.length ? [...itemIds] : undefined,
		patch,
		view: view === "shop" ? view : undefined,
	}
}
