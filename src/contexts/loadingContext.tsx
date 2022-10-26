import { useState, createContext, useMemo } from "react"

export const loadingContext = createContext()

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoading] = useState(false)

  const value = useMemo(() => {
    return { isLoading, setIsLoading }
  }, [isLoading])

  return (
    <loadingContext.Provider value={value}>{children}</loadingContext.Provider>
  )
}
