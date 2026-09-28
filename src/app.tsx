import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { BrowserRouter } from "react-router-dom"
import { Router } from "./routes/router"
import { queryClient } from "./services/api"

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
