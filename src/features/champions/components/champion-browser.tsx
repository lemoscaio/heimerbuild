import { useState } from "react"
import { useChampions } from "@/data/hooks/use-champions"
import { useCurrentPatch } from "@/data/hooks/use-current-patch"
import { filterChampions } from "../lib/filter-champions"
import { ChampionList } from "./champion-list"
import { SearchContainer } from "./search-container"

export function ChampionBrowser() {
	const [search, setSearch] = useState("")

	const patch = useCurrentPatch()
	const championsQuery = useChampions(patch.data)
	const champions = championsQuery.data
	const failedChampionsLoad = patch.isError || championsQuery.isError

	function loadChampions() {
		return patch.isError ? patch.refetch() : championsQuery.refetch()
	}

	const filteredChampions = champions ? filterChampions(champions, search) : []

	return (
		<>
			<SearchContainer search={search} setSearch={setSearch}></SearchContainer>
			<ChampionList
				champions={champions}
				filteredChampions={filteredChampions}
				isLoadingChampions={championsQuery.isPending && !failedChampionsLoad}
				failedChampionsLoad={failedChampionsLoad}
				loadChampions={loadChampions}
			></ChampionList>
		</>
	)
}
