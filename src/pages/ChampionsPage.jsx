import { useContext, useState } from "react"

import AppName from "../components/AppName.jsx"
import ChampionList from "../components/ChampionList.jsx"
import MainPageLogo from "../components/MainPageLogo.jsx"
import SearchContainer from "../components/SearchContainer.jsx"
import { championsContext } from "../contexts/championsContext.jsx"
import HeaderAlternative from "./HeaderAlternative"

export default function ChampionsPage() {
  const [search, setSearch] = useState("")

  const { champions } = useContext(championsContext)

  const filteredChampions =
    search.length > 0
      ? Object.keys(champions).filter((championName) => {
          const lowerCaseChampionName = championName.toLowerCase()
          const lowerCaseSearch = search.toLowerCase()
          if (lowerCaseChampionName.includes(lowerCaseSearch)) return true
        })
      : []

  console.log(
    `🚀 -> file: ChampionsPage.jsx -> line 30 -> ChampionsPage -> filteredChampions`,
    filteredChampions,
  )

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
        ></ChampionList>
      </main>
    </div>
  )
}
