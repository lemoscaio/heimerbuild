import * as z from "zod/mini"
import {
	readLocalStorage,
	type StorageOptions,
	type StoredValueOptions,
	writeLocalStorage,
} from "@/lib/local-storage"
import { MIN_LEVEL } from "@/lib/stats/growth"
import {
	type BuildState,
	readBuildSearch,
	toBuildSearch,
} from "../lib/build-search"

export const MAX_RECENT_BUILDS = 5

export const RECENT_BUILDS_KEY = "heimerbuild:recent-builds:v1"

export type RecentBuild = Omit<BuildState, "patch" | "view" | "tab"> & {
	championKey: string
	/** The patch pinned in the build's link, if any. */
	patch?: string
}

const championKeySchema = z.string().check(z.regex(/^\w+$/))

/** An entry as stored: the champion and its build as link search, read back like any link. */
const storedRecentBuildSchema = z.object({
	championKey: championKeySchema,
	search: z.record(z.string(), z.unknown()),
})

/** Entries saved before links had a version keep the values as fields, under their v1 link names. */
const unversionedRecentBuildSchema = z.pipe(
	z.object({
		championKey: championKeySchema,
		level: z.unknown(),
		itemIds: z.unknown(),
		patch: z.optional(z.unknown()),
		runes: z.optional(z.unknown()),
		form: z.optional(z.unknown()),
		skills: z.optional(z.unknown()),
		summoners: z.optional(z.unknown()),
	}),
	z.transform(({ championKey, level, itemIds, ...search }) => ({
		championKey,
		search: { lvl: level, items: itemIds, ...search },
	})),
)

// A bad value only loses that value, as in a link.
const recentBuildSchema = z.pipe(
	z.union([storedRecentBuildSchema, unversionedRecentBuildSchema]),
	z.transform(({ championKey, search }): RecentBuild => {
		const { lvl, items, patch, runes, form, skills, summoners } =
			readBuildSearch(search)
		return {
			championKey,
			level: lvl ?? MIN_LEVEL,
			itemIds: items ?? [],
			patch,
			runes,
			form,
			skills,
			summoners,
		}
	}),
)

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
	]
		.slice(0, MAX_RECENT_BUILDS)
		.map(({ championKey, ...values }) => ({
			championKey,
			search: toBuildSearch({ ...values, patch: values.patch }),
		}))
	// Full or blocked storage: recent builds are a convenience, the build page works without them.
	writeLocalStorage(RECENT_BUILDS_KEY, builds, options)
}
