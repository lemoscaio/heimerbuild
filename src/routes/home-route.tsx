import { createRoute } from "@tanstack/react-router"
import { AppName } from "@/components/common/app-name"
import { MainPageLogo } from "@/components/common/main-page-logo"
import { RouteError } from "@/components/common/route-error"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { ChampionBrowser } from "@/features/champions/components/champion-browser"
import { ChampionGridSkeleton } from "@/features/champions/components/champion-grid-skeleton"
import { rootRoute } from "./root-route"

export const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: "/",
	loader: async ({ context: { queryClient } }) => {
		const { currentPatch } = await queryClient.ensureQueryData(
			gameDataQueries.manifest(),
		)
		await queryClient.ensureQueryData(gameDataQueries.champions(currentPatch))
	},
	component: HomePage,
	pendingComponent: HomePending,
	errorComponent: RouteError,
})

function HomePage() {
	return (
		<main className="min-h-screen pt-15 pb-10">
			<AppName />
			<MainPageLogo />
			<ChampionBrowser />
		</main>
	)
}

function HomePending() {
	return (
		<main className="min-h-screen pt-15 pb-10">
			<AppName />
			<MainPageLogo />
			<ChampionGridSkeleton />
		</main>
	)
}
