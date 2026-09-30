import { ErrorBoundary } from "@sentry/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { RouterProvider } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppError } from "./app-error"
import { MotionProvider } from "./motion-provider"
import { queryClient } from "./query-client"
import { router } from "./router"

// Hover waits before the first tooltip, so moving across items does not cover the target;
// once one is open, the next opens instantly (Base UI groups tooltips under the provider).
const TOOLTIP_DELAY_MS = 450

export function App() {
	return (
		<ErrorBoundary fallback={<AppError />}>
			<QueryClientProvider client={queryClient}>
				{import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
				<MotionProvider>
					<TooltipProvider delay={TOOLTIP_DELAY_MS}>
						<RouterProvider router={router} />
					</TooltipProvider>
				</MotionProvider>
			</QueryClientProvider>
		</ErrorBoundary>
	)
}
