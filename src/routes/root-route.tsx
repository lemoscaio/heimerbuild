import type { QueryClient } from "@tanstack/react-query"
import {
	createRootRouteWithContext,
	createRoute,
	HeadContent,
	Outlet,
	redirect,
} from "@tanstack/react-router"
import { RouteFocus } from "@/app/route-focus"
import { PRODUCT_NAME } from "@/lib/product-name"

export type RouterContext = {
	queryClient: QueryClient
}

export const rootRoute = createRootRouteWithContext<RouterContext>()({
	head: () => ({ meta: [{ title: PRODUCT_NAME }] }),
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
