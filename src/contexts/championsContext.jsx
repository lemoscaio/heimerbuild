import { createContext, useState, useMemo } from "react"
import axios from "axios"

export const championsContext = createContext()

export function ChampionsProvider({ children }) {
  const { VITE_APP_API_URL } = import.meta.env

  const [champions, setChampions] = useState(() => {
    try {
      axios
        .get(`${VITE_APP_API_URL}/champions`)
        .then((response) => {
          const responseObject = response.data
          console.log(response.data)
          setChampions(responseObject)
        })
        .catch((error) => console.log(error))
    } catch (error) {
      console.log(error)
    }
  })

  const value = useMemo(() => {
    return { champions }
  }, [champions])

  return (
    <championsContext.Provider value={value}>
      {children}
    </championsContext.Provider>
  )
}
