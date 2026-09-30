import { ErrorBoundary } from "@sentry/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "@tanstack/react-router"
import { AppError } from "./app-error"
import { MotionProvider } from "./motion-provider"
import { queryClient } from "./query-client"
import { router } from "./router"

export function App() {
	return (
		<ErrorBoundary fallback={<AppError />}>
			<QueryClientProvider client={queryClient}>
				{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
				<MotionProvider>
					<RouterProvider router={router} />
				</MotionProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	)
}
