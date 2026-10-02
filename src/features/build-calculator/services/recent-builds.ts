import { FORM_ID_PATTERN } from "@schemas/champion"
import * as z from "zod/mini"
import {
	readLocalStorage,
	type StorageOptions,
	type StoredValueOptions,
	writeLocalStorage,
} from "@/lib/local-storage"
import { RUNES_PARAM_PATTERN } from "@/lib/rune-selection"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { MAX_ITEMS } from "../lib/build-items"
import { SKILLS_PARAM_PATTERN } from "../lib/build-search"

export const MAX_RECENT_BUILDS = 5

export const RECENT_BUILDS_KEY = "heimerbuild:recent-builds:v1"

const recentBuildSchema = z.object({
	championKey: z.string().check(z.regex(/^\w+$/)),
	level: z.int().check(z.gte(MIN_LEVEL), z.lte(MAX_LEVEL)),
	itemIds: z
		.array(z.string().check(z.regex(/^\d+$/)))
		.check(z.maxLength(MAX_ITEMS)),
	/** The patch pinned in the build's link, if any. */
	patch: z.optional(z.string().check(z.regex(/^\d+\.\d+\.\d+$/))),
	/** The rune page as the `runes` URL value. Absent in entries saved before runes; a bad one only loses the runes. */
	runes: z.catch(
		z.optional(z.string().check(z.regex(RUNES_PARAM_PATTERN))),
		undefined,
	),
	/** A form other than the default, as the `form` URL value. A bad one only loses the form. */
	form: z.catch(
		z.optional(z.string().check(z.regex(FORM_ID_PATTERN))),
		undefined,
	),
	/** The picked skill points, as the `skills` URL value. A bad one only loses the skills. */
	skills: z.catch(
		z.optional(z.string().check(z.regex(SKILLS_PARAM_PATTERN))),
		undefined,
	),
})

export type RecentBuild = z.infer<typeof recentBuildSchema>

export const recentBuildsStorage: StoredValueOptions<RecentBuild[]> = {
	schema: z.array(recentBuildSchema),
	defaultValue: [],
}

/** This browser's last edited builds, newest first; empty when storage is unavailable. */
export function readRecentBuilds(options: StorageOptions = {}): RecentBuild[] {
	return readLocalStorage(RECENT_BUILDS_KEY, {
		...recentBuildsStorage,
		...options,
	}).slice(0, MAX_RECENT_BUILDS)
}

/** Moves the build to the top, replacing that champion's previous entry. Never throws. */
export function recordRecentBuild(
	build: RecentBuild,
	options: StorageOptions = {},
) {
	const builds = [
		build,
		...readRecentBuilds(options).filter(
			({ championKey }) => championKey !== build.championKey,
		),
	].slice(0, MAX_RECENT_BUILDS)
	// Full or blocked storage: recent builds are a convenience, the build page works without them.
	writeLocalStorage(RECENT_BUILDS_KEY, builds, options)
}
