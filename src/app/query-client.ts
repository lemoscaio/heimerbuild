import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			refetchOnWindowFocus: false,
			gcTime: Number.POSITIVE_INFINITY,
		},
	},
})
