import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { BrowserRouter } from "react-router-dom"
import { queryClient } from "./query-client"
import { Router } from "./router"

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ReactQueryDevtools initialIsOpen={false} />
			<BrowserRouter>
				<Router />
			</BrowserRouter>
		</QueryClientProvider>
	)
}
