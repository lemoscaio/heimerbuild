import { QueryClient } from "@tanstack/react-query"
import axios from "axios"

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			cacheTime: Infinity,
		},
	},
})

const api = axios.create({ baseURL: import.meta.env.VITE_APP_API_URL })

export { api, queryClient }
