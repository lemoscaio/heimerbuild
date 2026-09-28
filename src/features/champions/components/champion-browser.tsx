import { useState } from "react"
import { useChampions } from "@/data/hooks/use-champions"
import { filterChampions } from "../lib/filter-champions"
import { ChampionList } from "./champion-list"
import { SearchContainer } from "./search-container"

export function ChampionBrowser() {
	const [search, setSearch] = useState("")

	const {
		data: champions,
		isLoading: isLoadingChampions,
		isError: failedChampionsLoad,
		refetch: loadChampions,
	} = useChampions()

	const filteredChampions = champions ? filterChampions(champions, search) : []

	return (
		<>
			<SearchContainer search={search} setSearch={setSearch}></SearchContainer>
			<ChampionList
				champions={champions}
				filteredChampions={filteredChampions}
				isLoadingChampions={isLoadingChampions}
				failedChampionsLoad={failedChampionsLoad}
				loadChampions={loadChampions}
			></ChampionList>
		</>
	)
}
