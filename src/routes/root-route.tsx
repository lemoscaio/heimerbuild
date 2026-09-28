import type { QueryClient } from "@tanstack/react-query"
import {
	createRootRouteWithContext,
	createRoute,
	redirect,
} from "@tanstack/react-router"

export type RouterContext = {
	queryClient: QueryClient
}

export const rootRoute = createRootRouteWithContext<RouterContext>()()

export const unknownRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "$",
	beforeLoad: () => {
		throw redirect({ to: "/", replace: true })
	},
})
