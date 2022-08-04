import { useState } from "preact/hooks"
import axios from "axios"
import ChampionCard from "./ChampionCard.jsx"

export default function ChampionList() {
  const { VITE_APP_API_URL } = import.meta.env

  const [champions, setChampions] = useState(() => {
    try {
      axios
        .get(`${VITE_APP_API_URL}/champions`)
        .then((response) => {
          const responseObject = response.data
          console.log("🚀 ~ responseObject", responseObject)
          const responseArray = Object.keys(responseObject).map((key) => {
            return responseObject[key]
          })
          console.log("🚀 ~ responseArray", responseArray)
          setChampions(responseArray)
        })
        .catch((error) => console.log(error))
    } catch (error) {
      console.log(error)
    }
  })

  return champions ? (
    <>
      <div className="champions-list">
        {champions.map((champion) => {
          return (
            <ChampionCard key={champion.id} champion={champion}></ChampionCard>
          )
        })}
      </div>
    </>
  ) : (
    <>Loading...</>
  )
}
