import { createContext } from "preact"
import { useContext, useMemo } from "preact/hooks"
import { useNavigate } from "react-router-dom"
import { useLocalStorage } from "./useLocalStorage.jsx"

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage("user", null)
  const navigate = useNavigate()

  async function login({ path, data }) {
    setUser(data)
    navigate(path, { replace: true, state: { user: data } })
  }

  async function logout() {
    setUser(null)
    navigate("/", { replace: true })
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
