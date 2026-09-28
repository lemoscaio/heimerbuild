import { createRouter } from "@tanstack/react-router"
import { championRoute } from "@/routes/champion-route"
import { homeRoute } from "@/routes/home-route"
import { pageWithHeaderRoute } from "@/routes/page-with-header-route"
import { rootRoute, unknownRoute } from "@/routes/root-route"
import { queryClient } from "./query-client"
import { stringifySearch } from "./search-params"

const routeTree = rootRoute.addChildren([
	homeRoute,
	pageWithHeaderRoute.addChildren([championRoute]),
	unknownRoute,
])

export const router = createRouter({
	routeTree,
	context: { queryClient },
	// React Query owns caching; the router always asks it on preload.
	defaultPreloadStaleTime: 0,
	stringifySearch,
})

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router
	}
}
