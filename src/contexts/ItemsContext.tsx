import { createContext, useState, useEffect, useMemo } from "react"
import axios from "axios"
import { Items } from "../types/items"

type ItemsContextInterface = {
  items: Items
  isLoadingItems: boolean
  failedItemsLoad: boolean
  loadItems: () => void
}

type ItemsProviderProps = {
  children?: React.ReactNode
}

export const ItemsContext = createContext<ItemsContextInterface | null>(null)

export function ItemsProvider({ children }: ItemsProviderProps): JSX.Element {
  const { VITE_APP_API_URL } = import.meta.env

  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [failedItemsLoad, setFailedItemsLoad] = useState(false)

  const [items, setItems] = useState<Items>({})

  useEffect(() => {
    loadItems()
  }, [])

  function loadItems() {
    setIsLoadingItems(true)
    setFailedItemsLoad(false)

    axios
      .get(`${VITE_APP_API_URL}/items`)
      .then((response) => {
        const items = response.data
        setItems(items)
      })
      .catch((error) => {
        setFailedItemsLoad(true)
        console.log(error)
      })
      .finally(() => {
        setIsLoadingItems(false)
      })
  }

  const value = useMemo(() => {
    return { items, isLoadingItems, failedItemsLoad, loadItems }
  }, [items, isLoadingItems, failedItemsLoad, loadItems])

  return <ItemsContext.Provider value={value}>{children}</ItemsContext.Provider>
}
