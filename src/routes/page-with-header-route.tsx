import { createRoute, Outlet } from "@tanstack/react-router"
import { Header } from "@/components/common/header"
import { rootRoute } from "./root-route"

export const pageWithHeaderRoute = createRoute({
	getParentRoute: () => rootRoute,
	id: "page-with-header",
	component: PageWithHeader,
})

function PageWithHeader() {
	return (
		<div className="height-container">
			<Header />
			<Outlet />
		</div>
	)
}
