import axios from "axios"
import { useState } from "preact/hooks"

import AppName from "../components/AppName.jsx"
import ChampionList from "../components/ChampionList.jsx"
import MainPageLogo from "../components/MainPageLogo.jsx"
import SearchContainer from "../components/SearchContainer.jsx"
import HeaderAlternative from "./HeaderAlternative"

export default function ChampionsPage() {
  const [search, setSearch] = useState("")

  const { VITE_APP_API_URL } = import.meta.env

  const [champions, setChampions] = useState(() => {
    try {
      axios
        .get(`${VITE_APP_API_URL}/champions`)
        .then((response) => {
          const responseObject = response.data

          setChampions(responseObject)
        })
        .catch((error) => console.log(error))
    } catch (error) {
      console.log(error)
    }
  })

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
