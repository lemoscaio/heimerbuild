import axios from "axios"
import { useContext } from "react"
import { createContext, useEffect, useMemo, useState } from "react"
import { Champions } from "../types/champions"

type ChampionsContextInterface = {
  champions: Champions
  isLoadingChampions: boolean
  failedChampionsLoad: boolean
  loadChampions?: () => void
}

type ChampionsProviderProps = {
  children?: React.ReactNode
}

const initialValues: ChampionsContextInterface = {
  champions: {},
  isLoadingChampions: false,
  failedChampionsLoad: false,
  loadChampions: () => {},
}

const ChampionsContext = createContext<ChampionsContextInterface>(initialValues)

export function ChampionsProvider({
  children,
}: ChampionsProviderProps): JSX.Element {
  const { VITE_APP_API_URL } = import.meta.env
  const [isLoadingChampions, setIsLoadingChampions] = useState(false)
  const [failedChampionsLoad, setFailedChampionsLoad] = useState(false)

  const [champions, setChampions] = useState<Champions>({})

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
    <ChampionsContext.Provider value={value}>
      {children}
    </ChampionsContext.Provider>
  )
}

export function useChampions() {
  return useContext(ChampionsContext)
}
