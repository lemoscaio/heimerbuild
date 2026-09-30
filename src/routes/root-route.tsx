import type { QueryClient } from "@tanstack/react-query"
import {
	createRootRouteWithContext,
	createRoute,
	HeadContent,
	Outlet,
	redirect,
} from "@tanstack/react-router"
import { RouteFocus } from "@/app/route-focus"

export type RouterContext = {
	queryClient: QueryClient
}

export const APP_TITLE = "Heimerbuild"

export const rootRoute = createRootRouteWithContext<RouterContext>()({
	head: () => ({ meta: [{ title: APP_TITLE }] }),
	component: RootLayout,
})

function RootLayout() {
	return (
		<>
			<HeadContent />
			<RouteFocus />
			<Outlet />
		</>
	)
}

export const unknownRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "$",
	beforeLoad: () => {
		throw redirect({ to: "/", replace: true })
	},
})
