import { createContext, useState, useEffect, useMemo } from "react"
import axios from "axios"

export const itemsContext = createContext()

export function ItemsProvider({ children }) {
  const { VITE_APP_API_URL } = import.meta.env

  const [isLoadingItems, setIsLoadingItems] = useState(false)
  const [failedItemsLoad, setFailedItemsLoad] = useState(false)

  const [items, setItems] = useState([])

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
  }, [items, isLoadingItems, failedItemsLoad])

  return <itemsContext.Provider value={value}>{children}</itemsContext.Provider>
}
