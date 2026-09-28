import { createRoute } from "@tanstack/react-router"
import { AppName } from "@/components/common/app-name"
import { MainPageLogo } from "@/components/common/main-page-logo"
import { RouteError } from "@/components/common/route-error"
import { RoutePending } from "@/components/common/route-pending"
import { gameDataQueries } from "@/data/queries/game-data-queries"
import { ChampionBrowser } from "@/features/champions/components/champion-browser"
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
	pendingComponent: RoutePending,
	errorComponent: RouteError,
})

function HomePage() {
	return (
		<div className="page-container page-container--champions-page">
			<main className="champions-page">
				<AppName />
				<MainPageLogo />
				<ChampionBrowser />
			</main>
		</div>
	)
}
