import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { queryClient } from "./query-client"
import { router } from "./router"

export function App() {
	return (
		<QueryClientProvider client={queryClient}>
			{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
			<TooltipProvider>
				<RouterProvider router={router} />
			</TooltipProvider>
		</QueryClientProvider>
	)
}
