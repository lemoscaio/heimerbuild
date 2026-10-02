/** A link's search as the router parsed it, before any check. */
export type RawBuildSearch = Record<string, unknown>

/** Rewrites a link of one version into the next version's format. Pure; params it does not know pass through. */
export type BuildLinkMigration = (search: RawBuildSearch) => RawBuildSearch

/** The link format's history, oldest first: entry `n - 1` turns a v`n` link into v`n + 1`. */
export type BuildLinkMigrations = readonly BuildLinkMigration[]

/** Add one entry per format change, with a fixture test of a real older link (docs, "Link format"). */
export const BUILD_LINK_MIGRATIONS: BuildLinkMigrations = []

/** The version every written link carries as `v`. */
export const BUILD_LINK_VERSION = BUILD_LINK_MIGRATIONS.length + 1

/** The link's `v`; a link without one (or with a broken one) predates versions, so it is v1. */
export function readBuildLinkVersion({ v }: RawBuildSearch) {
	return typeof v === "number" && Number.isInteger(v) && v >= 1 ? v : 1
}

/** Brings a link to the latest version: every migration from its version on, in order. */
export function migrateBuildLink(
	search: RawBuildSearch,
	migrations: BuildLinkMigrations,
): RawBuildSearch {
	const migrated = migrations
		.slice(readBuildLinkVersion(search) - 1)
		.reduce((current, migrate) => migrate(current), search)
	return { ...migrated, v: migrations.length + 1 }
}
