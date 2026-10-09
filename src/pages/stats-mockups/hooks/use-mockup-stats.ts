import type { QueryStatus } from "@tanstack/react-query"
import { useChampion } from "@/data/hooks/use-champion"
import { useCurrentPatch } from "@/data/hooks/use-current-patch"
import { useItems } from "@/data/hooks/use-items"
import { useRunes } from "@/data/hooks/use-runes"
import type { MockupBuild } from "../lib/mockup-builds"
import { mockupStats } from "../lib/mockup-stats"

type UseMockupStatsOptions = {
	build: MockupBuild
	form?: string
	preview: boolean
}

/** A mockup build's real stats from the current patch's data, once every file has loaded. */
export function useMockupStats({
	build,
	form,
	preview,
}: UseMockupStatsOptions) {
	const patch = useCurrentPatch()
	const champion = useChampion(patch.data, build.championKey)
	const items = useItems(patch.data)
	const runes = useRunes(patch.data)
	const queries = [patch, champion, items, runes]
	const status: QueryStatus = queries.some((query) => query.isError)
		? "error"
		: queries.some((query) => query.isPending)
			? "pending"
			: "success"
	const stats =
		patch.data && champion.data && items.data && runes.data
			? mockupStats(
					build,
					{
						patch: patch.data,
						champion: champion.data,
						itemsById: items.data,
						runes: runes.data,
					},
					{ form, preview },
				)
			: undefined

	return {
		status,
		champion: champion.data,
		stats,
		/** The name of the item the preview switch adds. */
		previewItemName: items.data?.[build.previewItemId]?.name,
	}
}
