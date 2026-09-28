import { useState } from "react"

import { AppName } from "../../components/AppName/"
import { HeaderAlternative } from "../../components/HeaderAlternative/"
import { MainPageLogo } from "../../components/MainPageLogo"
import { SearchContainer } from "../../components/SearchContainer"
import { useGetChampions } from "../../hooks/api/useGetChampions"
import { ChampionList } from "./components/ChampionList"
import { filterChampions } from "./filterChampions"

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
			<HeaderAlternative></HeaderAlternative>
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
