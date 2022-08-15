import { createContext, useState, useEffect, useMemo } from "react"
import axios from "axios"

export const championsContext = createContext()

export function ChampionsProvider({ children }) {
  console.log(
    `🚀 -> file: championsContext.jsx -> ChampionsProvider -> Rendered`,
  )

  const { VITE_APP_API_URL } = import.meta.env
  const [isLoadingChampions, setIsLoadingChampions] = useState(false)
  const [failedChampionsLoad, setFailedChampionsLoad] = useState(false)

  const [champions, setChampions] = useState([])

  useEffect(() => {
    loadChampions()
  }, [])

  function loadChampions() {
    setFailedChampionsLoad(false)
    setIsLoadingChampions(true)

    axios
      .get(`${VITE_APP_API_URL}/champions`)
      .then((response) => {
        const responseObject = response.data

        setChampions(responseObject)
      })
      .catch((error) => {
        setFailedChampionsLoad(true)
        console.log(error)
      })
      .finally(() => setIsLoadingChampions(false))
  }

  const value = useMemo(() => {
    return { champions, isLoadingChampions, failedChampionsLoad, loadChampions }
  }, [champions, isLoadingChampions, failedChampionsLoad])

  return (
    <championsContext.Provider value={value}>
      {children}
    </championsContext.Provider>
  )
}
