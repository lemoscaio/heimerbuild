import { useCallback, useState } from "react"

type SetValue<T> = (newValue: T | null) => void

export function useLocalStorage<T>(
  keyName: string,
  defaultValue: T | null,
): [T, SetValue<T>] {
  const readOrSetValue = useCallback((): T => {
    if (typeof window === "undefined") {
      return defaultValue as T
    }

    try {
      const value = window.localStorage.getItem(keyName)

      if (value) {
        return JSON.parse(value) as T
      } else {
        window.localStorage.setItem(keyName, JSON.stringify(defaultValue))
        return defaultValue as T
      }
    } catch (error) {
      console.warn(`Error reading localStorage key “${keyName}”:`, error)
      return defaultValue as T
    }
  }, [keyName, defaultValue])

  const [storedValue, setStoredValue] = useState<T>(readOrSetValue)

  function setValue(newValue: T) {
    if (typeof window === "undefined") {
      console.warn(
        `Tried setting localStorage key “${keyName}” even though environment is not a client`,
      )
    }
    try {
      window.localStorage.setItem(keyName, JSON.stringify(newValue))
    } catch (error) {
      console.warn(`Error setting localStorage key “${keyName}”:`, error)
    }
    setStoredValue(newValue)
  }
  return [storedValue, setValue as SetValue<T>]
}
