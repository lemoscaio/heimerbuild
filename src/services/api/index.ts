import { QueryClient } from "@tanstack/react-query"

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			cacheTime: Infinity,
		},
	},
})

export { queryClient }
