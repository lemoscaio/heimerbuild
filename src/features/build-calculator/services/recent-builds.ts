import { z } from "zod"
import { MAX_LEVEL, MIN_LEVEL } from "@/lib/stats/growth"
import { MAX_ITEMS } from "../lib/build-items"

export const MAX_RECENT_BUILDS = 5

const STORAGE_KEY = "heimerbuild:recent-builds:v1"

const recentBuildSchema = z.object({
	championKey: z.string().regex(/^\w+$/),
	level: z.number().int().min(MIN_LEVEL).max(MAX_LEVEL),
	itemIds: z.array(z.string().regex(/^\d+$/)).max(MAX_ITEMS),
	/** The patch pinned in the build's link, if any. */
	patch: z
		.string()
		.regex(/^\d+\.\d+\.\d+$/)
		.optional(),
})

export type RecentBuild = z.infer<typeof recentBuildSchema>

type RecentBuildsOptions = {
	storage?: Pick<Storage, "getItem" | "setItem">
}

// Blocked storage (privacy settings) throws on access, not only on use.
function browserStorage() {
	try {
		return window.localStorage
	} catch {
		return undefined
	}
}

/** This browser's last edited builds, newest first; empty when storage is unavailable. */
export function readRecentBuilds({
	storage = browserStorage(),
}: RecentBuildsOptions = {}): RecentBuild[] {
	try {
		const stored = storage?.getItem(STORAGE_KEY)
		if (!stored) return []
		const parsed = z.array(recentBuildSchema).safeParse(JSON.parse(stored))
		return parsed.success ? parsed.data.slice(0, MAX_RECENT_BUILDS) : []
	} catch {
		return []
	}
}

/** Moves the build to the top, replacing that champion's previous entry. Never throws. */
export function recordRecentBuild(
	build: RecentBuild,
	{ storage = browserStorage() }: RecentBuildsOptions = {},
) {
	const builds = [
		build,
		...readRecentBuilds({ storage }).filter(
			({ championKey }) => championKey !== build.championKey,
		),
	].slice(0, MAX_RECENT_BUILDS)
	try {
		storage?.setItem(STORAGE_KEY, JSON.stringify(builds))
	} catch {
		// Full or blocked storage: recent builds are a convenience, the build page works without them.
	}
}
