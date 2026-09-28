import { z } from "zod"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { MAX_ITEMS } from "./build-items"

// The router JSON-parses each value: `items=3089` arrives as a number,
// `items=3089,3020` as a string and `items=[3089,3020]` as an array.
const itemIdsSchema = z
	.union([
		z.string().transform((value) => value.split(",")),
		z.number().transform((value) => [String(value)]),
		z
			.array(z.union([z.string(), z.number()]))
			.transform((values) => values.map(String)),
	])
	.pipe(z.array(z.string().regex(/^\d+$/)).max(MAX_ITEMS))

/** Shareable build in the champion page URL. Invalid values are dropped, never an error page. */
export const buildSearchSchema = z.object({
	lvl: z
		.number()
		.int()
		.min(MIN_LEVEL)
		.max(MAX_LEVEL)
		.optional()
		.catch(undefined),
	items: itemIdsSchema.optional().catch(undefined),
	patch: z
		.string()
		.regex(/^\d+\.\d+\.\d+$/)
		.optional()
		.catch(undefined),
})

export type BuildSearch = z.infer<typeof buildSearchSchema>

export type BuildState = {
	level: number
	itemIds: readonly string[]
	patch: string | undefined
}

/** The URL search for a build. Defaults (level 1, no items) stay out of the URL. */
export function toBuildSearch({
	level,
	itemIds,
	patch,
}: BuildState): BuildSearch {
	return {
		lvl: level === MIN_LEVEL ? undefined : level,
		items: itemIds.length ? [...itemIds] : undefined,
		patch,
	}
}
