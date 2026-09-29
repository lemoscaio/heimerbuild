import { useState } from "react"
import { useChampions } from "@/data/hooks/use-champions"
import { useCurrentPatch } from "@/data/hooks/use-current-patch"
import { filterChampions } from "@/lib/filter-champions"
import type { ChampionRole } from "../../../../scripts/sync-data/schemas/champion"
import { ChampionBrowserTitle } from "./champion-browser-title"
import { ChampionList } from "./champion-list"
import { ChampionRoleFilter } from "./champion-role-filter"
import { SearchContainer } from "./search-container"

type ChampionBrowserProps = {
	/** Beside the grid on large screens, above it on small ones. */
	aside?: React.ReactNode
}

export function ChampionBrowser({ aside }: ChampionBrowserProps) {
	const [search, setSearch] = useState("")
	const [role, setRole] = useState<ChampionRole>()

	const patch = useCurrentPatch()
	const championsQuery = useChampions(patch.data)
	const champions = championsQuery.data
	const failedChampionsLoad = patch.isError || championsQuery.isError

	function loadChampions() {
		return patch.isError ? patch.refetch() : championsQuery.refetch()
	}

	const filteredChampions = champions
		? filterChampions(champions, search, { role })
		: []

	return (
		<>
			<div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
				<ChampionBrowserTitle
					championCount={champions?.length}
					patch={patch.data}
				/>
				<SearchContainer search={search} setSearch={setSearch} />
			</div>
			<ChampionRoleFilter role={role} onRoleChange={setRole} />
			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-7">
				{aside && <div className="lg:col-start-2 lg:row-start-1">{aside}</div>}
				<section
					aria-label="Champions"
					className="min-w-0 lg:col-start-1 lg:row-start-1"
				>
					<ChampionList
						champions={champions}
						filteredChampions={filteredChampions}
						isLoadingChampions={
							championsQuery.isPending && !failedChampionsLoad
						}
						failedChampionsLoad={failedChampionsLoad}
						loadChampions={loadChampions}
					/>
				</section>
			</div>
		</>
	)
}
