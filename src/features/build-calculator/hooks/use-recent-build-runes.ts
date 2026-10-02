import { type QueryStatus, useQuery } from "@tanstack/react-query"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { parseRuneSelection, runePageHighlights } from "@/lib/rune-selection"
import { resolveBuildPatch } from "../lib/build-patch"
import type { RecentBuild } from "../services/recent-builds"

/** A recent build's keystone and secondary tree, read against the runes of the patch its link opens on. */
export function useRecentBuildRunes({
	runes,
	patch,
}: Pick<RecentBuild, "runes" | "patch">) {
	const manifest = useQuery({
		...gameDataQueries.manifest(),
		select: (data) => resolveBuildPatch(data, patch).patch,
	})
	const highlights = useQuery({
		...gameDataQueries.runes(manifest.data ?? ""),
		enabled: manifest.data !== undefined,
		select: (runesFile) =>
			runePageHighlights(parseRuneSelection(runes, runesFile), runesFile),
	})
	const status: QueryStatus = manifest.isError ? "error" : highlights.status
	return { status, data: highlights.data }
}
