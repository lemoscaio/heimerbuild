import { createContext, useState, useMemo } from "react"
import axios from "axios"

export const itemsContext = createContext()

export function ItemsProvider({ children }) {
  const { VITE_APP_API_URL } = import.meta.env

  const [items, setItems] = useState(() => {
    axios
      .get(`${VITE_APP_API_URL}/items`)
      .then((response) => {
        const items = response.data
        setItems(items)
        console.log(items)
      })
      .catch((error) => {
        console.log(error)
      })
  })

  const value = useMemo(() => {
    return { items }
  }, [items])

  return <itemsContext.Provider value={value}>{children}</itemsContext.Provider>
}
