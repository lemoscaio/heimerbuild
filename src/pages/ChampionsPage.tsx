import { useState } from "react"

import AppName from "../components/AppName.jsx"
import ChampionList from "../components/ChampionList.jsx"
import HeaderAlternative from "../components/HeaderAlternative"
import MainPageLogo from "../components/MainPageLogo.jsx"
import SearchContainer from "../components/SearchContainer.jsx"
import { useChampions } from "../contexts/ChampionsContext.js"

export default function ChampionsPage() {
  const [search, setSearch] = useState("")

  const { champions, isLoadingChampions, failedChampionsLoad, loadChampions } =
    useChampions()

  const filteredChampions =
    search.length > 0
      ? Object.keys(champions).filter((championName) => {
          const lowerCaseChampionName = championName.toLowerCase()
          const lowerCaseSearch = search.toLowerCase()
          if (lowerCaseChampionName.includes(lowerCaseSearch)) return true
        })
      : []

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
          search={search}
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
