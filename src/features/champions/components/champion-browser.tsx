import type { QueryStatus, UseQueryResult } from "@tanstack/react-query"
import { useId } from "react"
import { PoliteStatus } from "@/components/common/polite-status"
import { useChampions } from "@/data/hooks/use-champions"
import { useCurrentPatch } from "@/data/hooks/use-current-patch"
import { filterChampions } from "@/lib/filter-champions"
import type { ChampionFilters } from "../hooks/use-champion-filters"
import { useChampionListExpanded } from "../hooks/use-champion-list-expanded"
import { ChampionList } from "./champion-list"
import { ChampionListReveal } from "./champion-list.motion"
import { ChampionListToggle } from "./champion-list-toggle"
import { ChampionRoleFilter } from "./champion-role-filter"
import { ChampionSearch } from "./champion-search"

type ChampionBrowserProps = {
	filters: ChampionFilters
	/** Between the search and the list toggle, whether the list is open or not. */
	recentBuilds?: React.ReactNode
}

/** Search, then the champion list behind a toggle: open it or type to see the champions. */
export function ChampionBrowser({
	filters: { search, setSearch, role, setRole },
	recentBuilds,
}: ChampionBrowserProps) {
	const listId = useId()
	const [expanded, setExpanded] = useChampionListExpanded()

	const patch = useCurrentPatch()
	const championsQuery = useChampions(patch.data)
	const champions = championsQuery.data
	const listStatus = combinedStatus([patch, championsQuery])

	function retryLoad() {
		return patch.isError ? patch.refetch() : championsQuery.refetch()
	}

	function handleSearchChange(nextSearch: string) {
		setSearch(nextSearch)
		if (nextSearch && !expanded) setExpanded(true)
	}

	const filteredChampions = champions
		? filterChampions(champions, search, { role })
		: []
	const isFiltered = !!champions && (!!search.trim() || !!role)
	const championCount = isFiltered
		? `${filteredChampions.length} of ${champions.length} champions`
		: `${champions?.length} champions`

	function resultStatus() {
		return filteredChampions.length ? championCount : "No champions found."
	}

	return (
		<div className="flex w-full flex-col items-center gap-7">
			<ChampionSearch search={search} onSearchChange={handleSearchChange} />
			<PoliteStatus message={isFiltered ? resultStatus() : ""} />
			{recentBuilds}
			<ChampionListToggle
				expanded={expanded}
				onExpandedChange={setExpanded}
				controls={listId}
				championCount={champions?.length}
			/>
			<ChampionListReveal
				id={listId}
				aria-label="Champions"
				open={expanded}
				className="flex w-full flex-col gap-5"
			>
				<div className="flex flex-col items-center gap-3">
					<ChampionRoleFilter role={role} onRoleChange={setRole} />
					{!!champions && !!patch.data && (
						<p className="text-subtle text-xs">
							{championCount} on patch {patch.data}
						</p>
					)}
				</div>
				<ChampionList
					champions={champions}
					filteredChampions={filteredChampions}
					status={listStatus}
					onRetry={retryLoad}
				/>
			</ChampionListReveal>
		</div>
	)
}

// The champions wait for the patch: a failure in either one is the list's error.
function combinedStatus(
	queries: Pick<UseQueryResult, "status">[],
): QueryStatus {
	if (queries.some(({ status }) => status === "error")) return "error"
	if (queries.some(({ status }) => status === "pending")) return "pending"
	return "success"
}
