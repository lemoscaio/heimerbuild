/** A link's search as the router parsed it, before any check. */
export type RawBuildSearch = Record<string, unknown>

/** Rewrites a link of one version into the next version's format. Pure; params it does not know pass through. */
export type BuildLinkMigration = (search: RawBuildSearch) => RawBuildSearch

/** The link format's history, oldest first: entry `n - 1` turns a v`n` link into v`n + 1`. */
export type BuildLinkMigrations = readonly BuildLinkMigration[]

/** A v1 Siphoning Strike step with its stacks (`q-250`); no other champion's Q had a number variant. */
const Q_WITH_STACKS = /^q-(\d+)$/

/**
 * v1 → v2 (issue 400): Siphoning Strike's stacks move from each Q step (`q-250`) to the build's
 * `stacks`, read from the first Q step when the link has none. Ids as written then, never renamed.
 */
export function migrateQStacksToBuild(search: RawBuildSearch): RawBuildSearch {
	const { combo } = search
	if (typeof combo !== "string") return search
	const tokens = combo.split(".")
	const firstQ = tokens.find(
		(token) => token === "q" || Q_WITH_STACKS.test(token),
	)
	const count = Number(Q_WITH_STACKS.exec(firstQ ?? "")?.[1] ?? 0)
	const stacks =
		search.stacks === undefined && count > 0
			? `siphoning-strike-${Math.min(count, 9999)}`
			: search.stacks
	return {
		...search,
		combo: tokens
			.map((token) => (Q_WITH_STACKS.test(token) ? "q" : token))
			.join("."),
		...(stacks !== undefined && { stacks }),
	}
}

/** Add one entry per format change, with a fixture test of a real older link (docs, "Link format"). */
export const BUILD_LINK_MIGRATIONS: BuildLinkMigrations = [
	migrateQStacksToBuild,
]

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
