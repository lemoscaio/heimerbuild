import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { BrowserRouter } from "react-router-dom"

import { QueryClientProvider } from "@tanstack/react-query"
import { AuthProvider } from "./hooks/useAuth"
import { Router } from "./routes/Router"
import { queryClient } from "./services/api"

export default function App() {
	return (
		<QueryClientProvider client={queryClient}>
			<ReactQueryDevtools initialIsOpen={false} />
			<BrowserRouter>
				<AuthProvider>
					<Router />
				</AuthProvider>
			</BrowserRouter>
		</QueryClientProvider>
	)
}
