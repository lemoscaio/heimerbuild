import { createContext, useContext, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useLocalStorage } from "./useLocalStorage.js"

type LoginData = {
  path: string
  data: { token: string }
}

type User = { token: string }

type AuthContextInterface = {
  user: User
  login: ({ path, data }: LoginData) => Promise<void>
  logout: () => Promise<void>
}

type AuthProviderProps = {
  children?: React.ReactNode
}

const AuthContext = createContext<AuthContextInterface | null>(null)

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useLocalStorage<User>("user", null)
  const navigate = useNavigate()

  async function login({ path, data }: LoginData) {
    setUser(data)
    navigate(path, { replace: true, state: { user: data } })
  }

  async function logout() {
    setUser(null)
    navigate("/", { replace: true })
  }

  const value = useMemo(() => ({ user, login, logout }), [user])

  return <AuthContext.Provider value={value}> {children} </AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
