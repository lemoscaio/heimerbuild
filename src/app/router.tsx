import { captureReactException } from "@sentry/react"
import { createRouter } from "@tanstack/react-router"
import { championRoute } from "@/routes/champion-route"
import { homeRoute } from "@/routes/home-route"
import { pageWithHeaderRoute } from "@/routes/page-with-header-route"
import { rootRoute, unknownRoute } from "@/routes/root-route"
import { statsMockupsRoute } from "@/routes/stats-mockups-route"
import { queryClient } from "./query-client"
import { stringifySearch } from "./search-params"

const routeTree = rootRoute.addChildren([
	homeRoute,
	pageWithHeaderRoute.addChildren([championRoute, statsMockupsRoute]),
	unknownRoute,
])

export const router = createRouter({
	routeTree,
	context: { queryClient },
	// Hovering or focusing a link loads the next route's chunk and data before the click.
	defaultPreload: "intent",
	// React Query owns caching; the router always asks it on preload.
	defaultPreloadStaleTime: 0,
	// Loader and render errors that a route's errorComponent shows.
	defaultOnCatch: (error, errorInfo) => {
		captureReactException(error, errorInfo)
	},
	stringifySearch,
})

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}
