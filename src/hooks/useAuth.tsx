import { createContext, useContext, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { useLocalStorage } from "./useLocalStorage.js"
import { api } from "../services/api/index.js"

type LoginData = {
	path: string
	data: { token: string }
}

export type User = { token: string }

type AuthContextInterface = {
	user?: User
	login: ({ path, data }: LoginData) => Promise<void>
	logout: () => Promise<void>
}

type AuthProviderProps = {
	children?: React.ReactNode
}

const AuthContext = createContext<AuthContextInterface>({
	login: async () => {},
	logout: async () => {},
})

export function AuthProvider({ children }: AuthProviderProps) {
	const [user, setUser] = useLocalStorage<User>("user", null)

	// TODO Corrigir tipagem do useLocalStorage e do User nele
	api.defaults.headers.common["Authorization"] = user?.token
		? `Bearer ${user.token}`
		: ""

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

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const context = useContext(AuthContext)

	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider.")
	}

	return context
}
