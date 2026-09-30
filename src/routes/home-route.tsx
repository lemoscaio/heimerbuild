import { createRoute } from "@tanstack/react-router"
import { RouteError } from "@/components/common/route-error"
import { Skeleton } from "@/components/ui/skeleton"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { HomeLayout } from "@/pages/home/home-layout"
import { HomePage } from "@/pages/home/home-page"
import { APP_TITLE, rootRoute } from "./root-route"

export const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	loader: async ({ context: { queryClient } }) => {
		const { currentPatch } = await queryClient.ensureQueryData(
			gameDataQueries.manifest(),
		)
		await queryClient.ensureQueryData(gameDataQueries.champions(currentPatch))
	},
	head: () => ({
		meta: [{ title: `${APP_TITLE} · League of Legends build calculator` }],
	}),
	component: HomePage,
	pendingComponent: HomePending,
	errorComponent: RouteError,
})

function HomePending() {
	return (
		<HomeLayout>
			<Skeleton className="h-12 w-full max-w-140 rounded-xl" />
			<Skeleton className="h-11 w-60 rounded-full" />
		</HomeLayout>
	)
}
