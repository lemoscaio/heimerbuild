import { useId } from "react"
import { useChampions } from "@/data/hooks/use-champions"
import { useCurrentPatch } from "@/data/hooks/use-current-patch"
import { filterChampions } from "@/lib/filter-champions"
import type { ChampionFilters } from "../hooks/use-champion-filters"
import { useChampionListExpanded } from "../hooks/use-champion-list-expanded"
import { ChampionList } from "./champion-list"
import { ChampionListToggle } from "./champion-list-toggle"
import { ChampionRoleFilter } from "./champion-role-filter"
import { SearchContainer } from "./search-container"

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
	const failedChampionsLoad = patch.isError || championsQuery.isError

	function loadChampions() {
		return patch.isError ? patch.refetch() : championsQuery.refetch()
	}

	function handleSearchChange(nextSearch: string) {
		setSearch(nextSearch)
		if (nextSearch && !expanded) setExpanded(true)
	}

	const filteredChampions = champions
		? filterChampions(champions, search, { role })
		: []

	return (
		<div className="flex w-full flex-col items-center gap-7">
			<SearchContainer search={search} setSearch={handleSearchChange} />
			{recentBuilds}
			<ChampionListToggle
				expanded={expanded}
				onExpandedChange={setExpanded}
				controls={listId}
				championCount={champions?.length}
			/>
			<section
				id={listId}
				aria-label="Champions"
				hidden={!expanded}
				className="flex w-full flex-col gap-5"
			>
				<div className="flex flex-col items-center gap-3">
					<ChampionRoleFilter role={role} onRoleChange={setRole} />
					{!!champions && !!patch.data && (
						<p className="text-subtle text-xs">
							{champions.length} champions on patch {patch.data}
						</p>
					)}
				</div>
				<ChampionList
					champions={champions}
					filteredChampions={filteredChampions}
					isLoadingChampions={championsQuery.isPending && !failedChampionsLoad}
					failedChampionsLoad={failedChampionsLoad}
					loadChampions={loadChampions}
				/>
			</section>
		</div>
	)
}
