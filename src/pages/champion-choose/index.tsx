import { useState } from "react"

import { AppName } from "../../components/app-name"
import { MainPageLogo } from "../../components/main-page-logo"
import { SearchContainer } from "../../components/search-container"
import { useGetChampions } from "../../hooks/api/use-get-champions"
import { ChampionList } from "./components/champion-list"
import { filterChampions } from "./filter-champions"

export function ChampionChoose() {
	const [search, setSearch] = useState("")

	const {
		data: champions,
		isLoading: isLoadingChampions,
		isError: failedChampionsLoad,
		refetch: loadChampions,
	} = useGetChampions()

	const filteredChampions = champions ? filterChampions(champions, search) : []

	return (
		<div className="page-container page-container--champions-page">
			<main className="champions-page">
				<AppName></AppName>
				<MainPageLogo></MainPageLogo>
				<SearchContainer
					search={search}
					setSearch={setSearch}
				></SearchContainer>
				<ChampionList
					champions={champions}
					filteredChampions={filteredChampions}
					isLoadingChampions={isLoadingChampions}
					failedChampionsLoad={failedChampionsLoad}
					loadChampions={loadChampions}
				></ChampionList>
			</main>
		</div>
	)
}
